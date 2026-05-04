/**
 * Seed 56 — Icon keys for ProviderRole + PlatformService
 *
 * Populates `iconKey` (iconify format) and `emoji` (PlatformService only)
 * for every existing record so the UI renders rich illustrations without
 * requiring manual admin input for the pre-seeded catalog.
 *
 * Re-runnable: uses upsert-style updates — safe to run multiple times.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Provider role icon keys ──────────────────────────────────────────────────
const ROLE_ICONS: Record<string, string> = {
  DOCTOR:            'healthicons:doctor',
  NURSE:             'healthicons:nurse',
  NANNY:             'healthicons:child-programme',
  PHARMACIST:        'healthicons:pharmacy',
  LAB_TECHNICIAN:    'healthicons:laboratory',
  EMERGENCY_WORKER:  'healthicons:ambulance',
  CAREGIVER:         'healthicons:community-health-worker',
  PHYSIOTHERAPIST:   'healthicons:physiotherapy',
  DENTIST:           'healthicons:dentistry',
  OPTOMETRIST:       'healthicons:eye-health',
  NUTRITIONIST:      'healthicons:nutrition-care',
  INSURANCE_REP:     'healthicons:health-insurance',
  CORPORATE_ADMIN:   'tabler:building-hospital',
  REGIONAL_ADMIN:    'tabler:map-pin-heart',
};

// ─── Service icon key resolver ────────────────────────────────────────────────
function resolveServiceIconKey(name: string, category: string): { iconKey: string; emoji: string } {
  const t = `${name} ${category}`.toLowerCase();

  // Anatomy / organ specific
  if (/cardio|heart disease|arrhythm|heart fail|cardiovas/.test(t))   return { iconKey: 'healthicons:heart-cardiogram',  emoji: '🫀' };
  if (/lung|pulmon|respir|chest infect|bronch|asthma|copd/.test(t))   return { iconKey: 'tabler:lungs',                  emoji: '🫁' };
  if (/neuro|brain|stroke|epilep|cereb/.test(t))                      return { iconKey: 'ph:brain-duotone',              emoji: '🧠' };
  if (/dental|teeth|tooth|oral|gum|cavity|braces/.test(t))            return { iconKey: 'healthicons:dentistry',         emoji: '🦷' };
  if (/eye|vision|ophth|retina|glaucom|cataract|optom/.test(t))       return { iconKey: 'healthicons:eye-health',        emoji: '👁️' };
  if (/bone|ortho|joint|spine|fracture|arthrit|knee|hip/.test(t))     return { iconKey: 'tabler:bone',                   emoji: '🦴' };
  if (/ear|hearing|ent|audiol|tinnit/.test(t))                        return { iconKey: 'ph:ear-duotone',                emoji: '👂' };
  if (/kidney|renal|urol|bladder|prostate/.test(t))                   return { iconKey: 'healthicons:kidney-disease',    emoji: '💧' };
  if (/liver|hepat|gallblad|jaundic/.test(t))                         return { iconKey: 'healthicons:liver',             emoji: '🟡' };
  if (/gastro|stomach|digest|bowel|colon|intestin|acid reflux/.test(t)) return { iconKey: 'healthicons:gastrointestinal', emoji: '🫃' };
  if (/skin|derma|acne|rash|eczema|psoriasis/.test(t))               return { iconKey: 'healthicons:dermatology',       emoji: '💆' };

  // Procedures & diagnostics
  if (/x.?ray|imaging|mri|ct scan|ultrasound|radiol/.test(t))        return { iconKey: 'healthicons:chest-x-ray',       emoji: '🩻' };
  if (/blood test|hematol|anemia|coagul/.test(t))                     return { iconKey: 'healthicons:blood-drop',        emoji: '🩸' };
  if (/lab|sample|culture|swab|biopsy|pathol|urine/.test(t))          return { iconKey: 'healthicons:microscopy-slides', emoji: '🔬' };
  if (/vaccine|immuniz|vaccin/.test(t))                               return { iconKey: 'healthicons:vaccines',          emoji: '💉' };
  if (/wound|dressing|bandage|suture|stitch/.test(t))                 return { iconKey: 'ph:bandaids-duotone',           emoji: '🩹' };
  if (/surgery|operat|procedure|incision/.test(t))                    return { iconKey: 'healthicons:surgical',          emoji: '⚕️' };
  if (/cancer|oncol|tumor|chemo|radiother/.test(t))                   return { iconKey: 'healthicons:cancer-tumor',      emoji: '🎗️' };

  // Service modes
  if (/home visit|house call|domicil|home care/.test(t))              return { iconKey: 'healthicons:home-visits',       emoji: '🏠' };
  if (/video|telehealth|telemedicine|online|virtual|remote consult/.test(t)) return { iconKey: 'healthicons:telemedicine', emoji: '📱' };
  if (/emergency|ambulance|urgent|trauma|rescue/.test(t))             return { iconKey: 'healthicons:emergency-response', emoji: '🚑' };
  if (/pharmacy|prescription|dispensing|medication/.test(t))          return { iconKey: 'healthicons:medicines',         emoji: '💊' };
  if (/physio|rehabilit|movement|mobility|stretching/.test(t))        return { iconKey: 'healthicons:physiotherapy',     emoji: '💪' };
  if (/mental|psych|anxiety|depress|counsel|talk therapy/.test(t))    return { iconKey: 'healthicons:mental-health',     emoji: '🧘' };
  if (/nutrition|diet|food|meal plan|weight loss/.test(t))            return { iconKey: 'healthicons:nutrition-care',    emoji: '🥗' };
  if (/elder|geriat|elderly|senior care|aged/.test(t))                return { iconKey: 'healthicons:old-man',           emoji: '🧓' };
  if (/pregnan|obstetric|maternal|antenatal|prenatal|midwif|birth/.test(t)) return { iconKey: 'healthicons:pregnancy',  emoji: '🤰' };
  if (/baby|infant|newborn|neonat|pediatr|child/.test(t))             return { iconKey: 'healthicons:baby-0-2m',         emoji: '👶' };
  if (/nanny|childcare|babysit/.test(t))                              return { iconKey: 'healthicons:child-programme',   emoji: '🧸' };
  if (/diabetes|glucose|insulin|endocrin|thyroid|hormone/.test(t))   return { iconKey: 'healthicons:diabetes',          emoji: '🧬' };
  if (/blood pressure|hypertens/.test(t))                             return { iconKey: 'healthicons:blood-pressure',    emoji: '❤️' };
  if (/oxygen|inhaler/.test(t))                                       return { iconKey: 'healthicons:oxygen',            emoji: '💨' };
  if (/general consult|check.?up|annual|screening/.test(t))          return { iconKey: 'healthicons:stethoscope',        emoji: '🩺' };

  // Default
  return { iconKey: 'healthicons:stethoscope', emoji: '⚕️' };
}

export async function seedIconKeys() {
  console.log('  → Seeding icon keys for ProviderRole...');

  // Update provider roles
  const roles = await prisma.providerRole.findMany({ select: { id: true, code: true } });
  let roleCount = 0;
  for (const role of roles) {
    const iconKey = ROLE_ICONS[role.code];
    if (iconKey) {
      await prisma.providerRole.update({ where: { id: role.id }, data: { iconKey } });
      roleCount++;
    }
  }
  console.log(`     ✓ Updated ${roleCount}/${roles.length} provider roles with iconKey`);

  console.log('  → Seeding icon keys for PlatformService...');

  // Update platform services
  const services = await prisma.platformService.findMany({
    select: { id: true, serviceName: true, category: true },
  });
  let svcCount = 0;
  for (const svc of services) {
    const { iconKey, emoji } = resolveServiceIconKey(svc.serviceName, svc.category);
    await prisma.platformService.update({ where: { id: svc.id }, data: { iconKey, emoji } });
    svcCount++;
  }
  console.log(`     ✓ Updated ${svcCount} platform services with iconKey + emoji`);
}
