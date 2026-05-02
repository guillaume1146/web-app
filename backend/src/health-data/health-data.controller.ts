import { Controller, Get, Post, Param, Query, Body, Header, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthDataService } from './health-data.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateVitalSignsDto } from './dto/create-vital-signs.dto';

/**
 * Health data endpoints — available to ALL users (every user is also a patient).
 * Uses /users/:id prefix to be generic (not /patients/:id).
 */
@ApiTags('Health Data')
@Controller('users/:id')
export class HealthDataController {
  constructor(private healthDataService: HealthDataService) {}

  // ─── Medical Records ───────────────────────────────────────────────────

  @Get('medical-records')
  async getMedicalRecords(@Param('id') id: string, @Query('type') type?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const result = await this.healthDataService.getMedicalRecords(id, { type, limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined });
    return { success: true, data: result.records, total: result.total };
  }

  @Post('medical-records')
  async createMedicalRecord(@Param('id') id: string, @Body() body: CreateMedicalRecordDto, @CurrentUser() user: JwtPayload) {
    // Provider creating record for patient, or patient self
    const doctorUserId = user.sub !== id ? user.sub : null;
    const record = await this.healthDataService.createMedicalRecord(id, doctorUserId, body);
    return { success: true, data: record };
  }

  // ─── Prescriptions ─────────────────────────────────────────────────────

  @Get('prescriptions')
  async getPrescriptions(@Param('id') id: string, @Query('active') active?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const data = await this.healthDataService.getPrescriptions(id, {
      active: active !== undefined ? active === 'true' : undefined,
      limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined,
    });
    return { success: true, data };
  }

  @Post('prescriptions')
  async createPrescription(@Param('id') id: string, @Body() body: CreatePrescriptionDto, @CurrentUser() user: JwtPayload) {
    const data = await this.healthDataService.createPrescription(id, user.sub, body);
    return { success: true, data };
  }

  /**
   * GET /api/users/:id/prescriptions/:prescriptionId/pdf
   * Returns a print-ready HTML (@media print CSS). The browser's built-in
   * "Save as PDF" produces the download — no server-side Chromium needed.
   * Works identically on mobile via WebView `window.print()`.
   */
  @Get('prescriptions/:prescriptionId/pdf')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async prescriptionPdf(
    @Param('id') userId: string,
    @Param('prescriptionId') prescriptionId: string,
    @Res() res: Response,
  ) {
    const p = await this.healthDataService.getPrescriptionById(userId, prescriptionId).catch(() => null);
    if (!p) {
      res.status(404).send('<h1>Prescription not found</h1>');
      return;
    }
    const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Prescription · ${esc(p.id)}</title>
<style>
 body { font-family: system-ui, -apple-system, sans-serif; color: #001E40; padding: 40px; max-width: 720px; margin: 0 auto; }
 header { border-bottom: 2px solid #0C6780; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
 h1 { font-size: 22px; margin: 0; }
 .brand { color: #0C6780; font-weight: 700; letter-spacing: 0.5px; }
 .meta { color: #555; font-size: 12px; }
 section { margin-bottom: 18px; }
 .grid { display: grid; grid-template-columns: 160px 1fr; gap: 8px 20px; font-size: 14px; }
 .grid dt { color: #666; }
 .grid dd { margin: 0; font-weight: 500; }
 .drug { background: #F6FAFB; padding: 12px; border-left: 4px solid #0C6780; border-radius: 4px; margin-bottom: 10px; }
 .drug h3 { margin: 0 0 4px; font-size: 16px; }
 .drug p { margin: 2px 0; font-size: 13px; color: #333; }
 footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
 button.print { background: #0C6780; color: #fff; border: 0; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-size: 14px; }
 @media print { button.print { display: none; } body { padding: 20px; } }
</style></head>
<body>
  <header>
    <div>
      <div class="brand">MediWyz</div>
      <h1>Prescription</h1>
    </div>
    <button class="print" onclick="window.print()">Save as PDF / Print</button>
  </header>
  <section>
    <dl class="grid">
      <dt>Patient</dt><dd>${esc(p.patientName)}</dd>
      <dt>Issued by</dt><dd>${esc(p.doctorName)} ${p.doctorLicense ? `(#${esc(p.doctorLicense)})` : ''}</dd>
      <dt>Date</dt><dd>${esc(new Date(p.issuedAt).toLocaleString())}</dd>
      <dt>Reference</dt><dd>${esc(p.id)}</dd>
      ${p.diagnosis ? `<dt>Diagnosis</dt><dd>${esc(p.diagnosis)}</dd>` : ''}
    </dl>
  </section>
  <section>
    <h2 style="font-size:14px;color:#0C6780;text-transform:uppercase;letter-spacing:.5px;">Medications</h2>
    ${(p.medications || []).map((m: any) => `
      <div class="drug">
        <h3>${esc(m.name)} ${m.strength ? `— ${esc(m.strength)}` : ''}</h3>
        <p><strong>Dosage:</strong> ${esc(m.dosage ?? '—')}</p>
        <p><strong>Frequency:</strong> ${esc(m.frequency ?? '—')}</p>
        <p><strong>Duration:</strong> ${esc(m.duration ?? '—')}</p>
        ${m.notes ? `<p><em>${esc(m.notes)}</em></p>` : ''}
      </div>
    `).join('')}
  </section>
  ${p.notes ? `<section><h2 style="font-size:14px;color:#0C6780;">Notes</h2><p>${esc(p.notes)}</p></section>` : ''}
  <footer>
    <div>This prescription is digitally issued via MediWyz. Verify at mediwyz.com/verify/${esc(p.id)}.</div>
  </footer>
</body></html>`;
    res.send(html);
  }

  // ─── Vital Signs ───────────────────────────────────────────────────────

  @Get('vital-signs')
  async getVitalSigns(@Param('id') id: string, @Query('latest') latest?: string, @Query('limit') limit?: string) {
    const data = await this.healthDataService.getVitalSigns(id, { latest: latest === 'true', limit: limit ? parseInt(limit) : undefined });
    return { success: true, data };
  }

  @Post('vital-signs')
  async createVitalSigns(@Param('id') id: string, @Body() body: CreateVitalSignsDto) {
    return { success: true, data: await this.healthDataService.createVitalSigns(id, body) };
  }

  // ─── Pill Reminders ────────────────────────────────────────────────────

  @Get('pill-reminders')
  async getPillReminders(@Param('id') id: string, @Query('active') active?: string) {
    const data = await this.healthDataService.getPillReminders(id, active !== undefined ? active === 'true' : undefined);
    return { success: true, data };
  }

  // ─── Lab Tests ─────────────────────────────────────────────────────────

  @Get('lab-tests')
  async getLabTests(@Param('id') id: string, @Query('status') status?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const result = await this.healthDataService.getLabTests(id, { status, limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined });
    return { success: true, data: result.tests, total: result.total };
  }

  // ─── Insurance Claims ─────────────────────────────────────────────────

  @Get('claims')
  async getClaims(@Param('id') id: string) {
    return { success: true, data: await this.healthDataService.getClaims(id) };
  }
}
