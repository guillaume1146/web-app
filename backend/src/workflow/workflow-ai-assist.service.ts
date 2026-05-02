import { Injectable, Logger, BadRequestException } from '@nestjs/common';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const PROMPT_VERSION = '2026.04.1-workflow-draft';

/**
 * Turn a plain-English workflow description into a draft step list the
 * regional admin can review + edit before saving. Keeps the output tightly
 * structured — the model returns JSON matching `WorkflowStep` shape so the
 * builder can drop it in without further parsing work.
 *
 * Philosophy: the AI produces a DRAFT, not a final artefact. The admin
 * always reviews + customises. If the model hallucinates a flag that
 * doesn't exist, we filter it out server-side (safer than letting the
 * model guess).
 */
@Injectable()
export class WorkflowAiAssistService {
  private readonly logger = new Logger(WorkflowAiAssistService.name);

  /** Allow-listed step flags — anything the model invents outside this set is silently dropped. */
  private static readonly VALID_FLAGS = new Set([
    'triggers_payment', 'triggers_refund', 'triggers_conversation',
    'triggers_video_call', 'triggers_review_request',
    'requires_prescription', 'requires_content',
  ]);

  async draftSteps(prompt: string, providerType?: string, serviceMode?: string): Promise<DraftStep[]> {
    if (!prompt || prompt.trim().length < 20) {
      throw new BadRequestException('Please describe the workflow in at least a sentence.');
    }
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new BadRequestException('AI assist is not configured on this server.');

    const systemPrompt = this.buildSystemPrompt(providerType, serviceMode);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt.trim() },
          ],
          temperature: 0.2,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Groq ${response.status}: ${body}`);
        throw new Error(`AI error ${response.status}`);
      }
      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content;
      if (!raw) throw new Error('Empty AI response');

      return this.sanitise(JSON.parse(raw));
    } catch (e) {
      this.logger.warn(`AI draft failed (${PROMPT_VERSION}): ${(e as Error).message}`);
      throw new BadRequestException('Could not draft a workflow from that description. Try rephrasing — focus on the sequence of statuses and who acts on each one.');
    }
  }

  private buildSystemPrompt(providerType?: string, serviceMode?: string): string {
    return `You are the MediWyz workflow-builder assistant. The user describes a booking workflow in plain English; you reply with a JSON draft of the step list.

Return ONLY a single JSON object of shape:
{ "steps": [ { "statusCode": "snake_case", "label": "Human readable", "description": "optional context",
                "actionsForPatient": [{ "action": "snake_case", "label": "Button text", "targetStatus": "snake_case", "style": "primary|secondary|danger" }],
                "actionsForProvider": [...same shape...],
                "flags": { "triggers_payment"?: true, "triggers_conversation"?: true, "triggers_video_call"?: true,
                           "triggers_refund"?: true, "triggers_review_request"?: true,
                           "requires_prescription"?: true, "requires_content"?: true },
                "notifyPatient": { "title": "...", "message": "..." } | null,
                "notifyProvider": { "title": "...", "message": "..." } | null } ] }

Rules:
- Every workflow starts with a "pending" step and ends with a "completed" step. Include a "cancelled" step as a valid terminal state.
- Use placeholders ({{patientName}}, {{providerName}}, {{serviceName}}, {{scheduledAt}}, {{amount}}, {{eta}}) in notification text. Fill at least one notification per non-terminal step.
- Use flags ONLY from the set above. Do NOT invent new flags.
- Every action's targetStatus must be another step's statusCode in the same draft.
- Aim for 5–10 steps. Shorter flows should still express a real sequence.
- Keep labels natural ("Confirme", "En route", "Sample collected") not technical jargon.
- Use the user's language — if they wrote in French/English/Creole, respond in the same language for labels and notifications.${providerType ? `\n- The workflow is for a ${providerType.replace(/_/g, ' ')} provider. Frame labels / actions accordingly.` : ''}${serviceMode ? `\n- Service mode is ${serviceMode} (${serviceMode === 'home' ? 'home visit' : serviceMode === 'video' ? 'video call' : 'in-office'}). Steps should match that delivery model.` : ''}

Never include raw JSON markdown fencing — just the JSON object, nothing else.`;
  }

  private sanitise(parsed: any): DraftStep[] {
    const steps = Array.isArray(parsed?.steps) ? parsed.steps : [];
    return steps.map((s: any, i: number) => ({
      order: i + 1,
      statusCode: this.slugify(s?.statusCode ?? `step_${i + 1}`),
      label: String(s?.label ?? s?.statusCode ?? `Step ${i + 1}`).slice(0, 80),
      description: typeof s?.description === 'string' ? s.description.slice(0, 200) : '',
      actionsForPatient: this.sanitiseActions(s?.actionsForPatient),
      actionsForProvider: this.sanitiseActions(s?.actionsForProvider),
      flags: this.sanitiseFlags(s?.flags),
      notifyPatient: this.sanitiseNotification(s?.notifyPatient),
      notifyProvider: this.sanitiseNotification(s?.notifyProvider),
    }));
  }

  private sanitiseActions(arr: any): DraftAction[] {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 6).map((a: any) => ({
      action: this.slugify(String(a?.action ?? 'action')),
      label: String(a?.label ?? '').slice(0, 40) || 'Action',
      targetStatus: this.slugify(String(a?.targetStatus ?? '')),
      style: ['primary', 'secondary', 'danger'].includes(a?.style) ? a.style : 'secondary',
    })).filter((a: DraftAction) => a.action && a.targetStatus);
  }

  private sanitiseFlags(flags: any): Record<string, boolean> {
    if (!flags || typeof flags !== 'object') return {};
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(flags)) {
      if (WorkflowAiAssistService.VALID_FLAGS.has(k) && !!v) out[k] = true;
    }
    return out;
  }

  private sanitiseNotification(n: any): { title: string; message: string } | null {
    if (!n || typeof n !== 'object') return null;
    const title = typeof n.title === 'string' ? n.title.slice(0, 80) : '';
    const message = typeof n.message === 'string' ? n.message.slice(0, 300) : '';
    if (!title && !message) return null;
    return { title: title || 'Update', message };
  }

  private slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  }
}

export interface DraftAction {
  action: string;
  label: string;
  targetStatus: string;
  style: 'primary' | 'secondary' | 'danger';
}

export interface DraftStep {
  order: number;
  statusCode: string;
  label: string;
  description: string;
  actionsForPatient: DraftAction[];
  actionsForProvider: DraftAction[];
  flags: Record<string, boolean>;
  notifyPatient: { title: string; message: string } | null;
  notifyProvider: { title: string; message: string } | null;
}
