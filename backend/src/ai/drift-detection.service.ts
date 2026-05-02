import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Weekly drift detector for the AI assistant. Computes aggregate metrics
 * from `AiCallLog` for the trailing 7 days vs the week before, and
 * notifies every `REGIONAL_ADMIN` when any metric moves ±`DRIFT_THRESHOLD`.
 *
 * Tracked metrics (per surface: chat / ocr / insights):
 *   - callVolume      — total calls
 *   - avgDurationMs   — average latency per call
 *   - avgPromptTokens / avgCompletionTokens
 *   - errorRate       — (# rows with `error` not null) ÷ call volume
 *   - emergencyRate   — (# emergency-gate hits) ÷ call volume
 *   - allergySlipRate — (# allergy-filter hits) ÷ call volume
 *
 * Written to complement `LedgerReconciliationService`: same "detect drift
 * early, don't auto-fix, alert a human" shape. Silent runs are fine — the
 * alert only fires when something actually moved.
 */
@Injectable()
export class AiDriftDetectionService {
  private readonly logger = new Logger(AiDriftDetectionService.name);
  private static readonly DRIFT_THRESHOLD = 0.3; // ±30 %

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async runWeeklySweep() {
    try {
      const report = await this.computeDrift();
      const alerts = this.flagSignificantDrift(report);
      this.logger.log(
        `AI drift sweep: surfaces=${report.length}, alerts=${alerts.length}`,
      );
      if (alerts.length > 0) {
        await this.notifyAdmins(alerts);
      }
    } catch (e) {
      this.logger.error('AI drift sweep failed', e as any);
    }
  }

  async computeDrift() {
    const now = Date.now();
    const lastWeek = new Date(now - 7 * 86400e3);
    const twoWeeksAgo = new Date(now - 14 * 86400e3);

    const surfaces = await this.surfacesObservedSince(twoWeeksAgo);
    const results: SurfaceDrift[] = [];

    for (const surface of surfaces) {
      const thisWeek = await this.metricsFor(surface, lastWeek, new Date(now));
      const priorWeek = await this.metricsFor(surface, twoWeeksAgo, lastWeek);
      results.push({ surface, thisWeek, priorWeek });
    }
    return results;
  }

  private async surfacesObservedSince(since: Date): Promise<string[]> {
    const rows = await (this.prisma as any).aiCallLog.findMany({
      where: { createdAt: { gte: since } },
      select: { surface: true },
      distinct: ['surface'],
    });
    return rows.map((r: { surface: string }) => r.surface);
  }

  private async metricsFor(surface: string, from: Date, to: Date): Promise<Metrics> {
    const calls = await (this.prisma as any).aiCallLog.findMany({
      where: { surface, createdAt: { gte: from, lt: to } },
      select: {
        durationMs: true, promptTokens: true, completionTokens: true,
        error: true, emergencyCategory: true, allergyMatched: true,
      },
    });

    const callVolume = calls.length;
    if (callVolume === 0) {
      return {
        callVolume: 0, avgDurationMs: 0, avgPromptTokens: 0, avgCompletionTokens: 0,
        errorRate: 0, emergencyRate: 0, allergySlipRate: 0,
      };
    }

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    return {
      callVolume,
      avgDurationMs: Math.round(sum(calls.map((c: any) => c.durationMs || 0)) / callVolume),
      avgPromptTokens: Math.round(sum(calls.map((c: any) => c.promptTokens || 0)) / callVolume),
      avgCompletionTokens: Math.round(sum(calls.map((c: any) => c.completionTokens || 0)) / callVolume),
      errorRate: calls.filter((c: any) => !!c.error).length / callVolume,
      emergencyRate: calls.filter((c: any) => !!c.emergencyCategory).length / callVolume,
      allergySlipRate: calls.filter((c: any) => !!c.allergyMatched).length / callVolume,
    };
  }

  private flagSignificantDrift(report: SurfaceDrift[]): DriftAlert[] {
    const alerts: DriftAlert[] = [];
    for (const { surface, thisWeek, priorWeek } of report) {
      for (const key of METRIC_KEYS) {
        const prior = priorWeek[key];
        const now = thisWeek[key];
        if (prior === 0 && now === 0) continue;
        // For rates (0–1), use absolute-point change threshold of 10pp so we
        // don't chase noise around near-zero baselines. For counts + tokens,
        // use relative-30%. Latency uses the same relative rule.
        if (key.endsWith('Rate')) {
          const delta = now - prior;
          if (Math.abs(delta) > 0.10) {
            alerts.push({ surface, metric: key, prior, now, direction: delta > 0 ? 'up' : 'down' });
          }
        } else {
          if (prior === 0) {
            if (now > 0) alerts.push({ surface, metric: key, prior, now, direction: 'up' });
            continue;
          }
          const delta = (now - prior) / prior;
          if (Math.abs(delta) > AiDriftDetectionService.DRIFT_THRESHOLD) {
            alerts.push({ surface, metric: key, prior, now, direction: delta > 0 ? 'up' : 'down' });
          }
        }
      }
    }
    return alerts;
  }

  private async notifyAdmins(alerts: DriftAlert[]) {
    const admins = await this.prisma.user.findMany({
      where: { userType: 'REGIONAL_ADMIN' as any },
      select: { id: true },
    });
    const summary = alerts.slice(0, 5).map((a) => {
      const pct = a.metric.endsWith('Rate')
        ? `${(a.prior * 100).toFixed(1)}% → ${(a.now * 100).toFixed(1)}%`
        : `${Math.round(a.prior)} → ${Math.round(a.now)}`;
      return `• ${a.surface}.${a.metric} ${a.direction === 'up' ? '↑' : '↓'} (${pct})`;
    }).join('\n');

    for (const a of admins) {
      this.notifications.createNotification({
        userId: a.id,
        type: 'ai_drift_alert',
        title: `AI drift detected on ${alerts.length} metric(s)`,
        message: summary + (alerts.length > 5 ? `\n…and ${alerts.length - 5} more` : ''),
        payload: { alerts },
      }).catch(() => {});
    }
  }
}

const METRIC_KEYS = [
  'callVolume', 'avgDurationMs', 'avgPromptTokens', 'avgCompletionTokens',
  'errorRate', 'emergencyRate', 'allergySlipRate',
] as const;

type MetricKey = typeof METRIC_KEYS[number];

type Metrics = Record<MetricKey, number>;

interface SurfaceDrift {
  surface: string;
  thisWeek: Metrics;
  priorWeek: Metrics;
}

interface DriftAlert {
  surface: string;
  metric: MetricKey;
  prior: number;
  now: number;
  direction: 'up' | 'down';
}
