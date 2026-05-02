import { checkEmergency, buildEmergencyResponse } from './emergency-gate';

describe('checkEmergency', () => {
  it('matches chest pain in plain English', () => {
    const r = checkEmergency('I have chest pain and it feels tight');
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.category).toBe('cardiac');
  });

  it('matches stroke symptoms', () => {
    const r = checkEmergency("my face is drooping on one side and I can't move my arm");
    expect(r.matched).toBe(true);
  });

  it('matches suicidal ideation', () => {
    const r = checkEmergency('I want to kill myself');
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.category).toBe('suicide');
  });

  it('matches anaphylaxis', () => {
    const r = checkEmergency('my throat is swelling and I can\'t swallow');
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.category).toBe('anaphylaxis');
  });

  it('matches overdose phrased as "took too many pills"', () => {
    const r = checkEmergency('I took too many pills by accident');
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.category).toBe('overdose');
  });

  it('matches French "crise cardiaque"', () => {
    const r = checkEmergency('je pense avoir une crise cardiaque');
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.category).toBe('cardiac');
  });

  it('does NOT match casual mentions', () => {
    expect(checkEmergency('I read an article about heart disease today').matched).toBe(false);
    expect(checkEmergency('How do I lose weight safely?').matched).toBe(false);
    expect(checkEmergency('What should I eat for dinner?').matched).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(checkEmergency('CHEST PAIN').matched).toBe(true);
    expect(checkEmergency('Suicidal').matched).toBe(true);
  });

  it('handles empty input', () => {
    expect(checkEmergency('').matched).toBe(false);
  });
});

describe('buildEmergencyResponse', () => {
  it('uses the MU emergency number (114) by default', () => {
    const msg = buildEmergencyResponse('cardiac', 'MU', 'Marie');
    expect(msg).toContain('114');
    expect(msg).toContain('Marie');
  });

  it('uses KE number (999) for Kenya region', () => {
    expect(buildEmergencyResponse('cardiac', 'KE')).toContain('999');
  });

  it('falls back gracefully for unknown region', () => {
    expect(buildEmergencyResponse('cardiac')).toContain('your local emergency services');
  });

  it('includes category-specific guidance', () => {
    expect(buildEmergencyResponse('anaphylaxis', 'MU')).toMatch(/epinephrine|EpiPen/i);
    expect(buildEmergencyResponse('stroke', 'MU')).toMatch(/time/i);
    expect(buildEmergencyResponse('suicide', 'MU')).toMatch(/Befrienders|800-9393|not alone/i);
  });

  it('warns against self-driving for cardiac', () => {
    expect(buildEmergencyResponse('cardiac', 'MU')).toMatch(/not\s*drive/i);
  });
});
