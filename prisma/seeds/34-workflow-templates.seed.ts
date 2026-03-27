/**
 * Seed 34 — Default Workflow Templates
 *
 * Creates ~59 system-default workflow templates covering all provider types
 * and all 3 service modes (office, home, video).
 *
 * Flags reference:
 *   triggers_video_call      — auto-create video room
 *   triggers_payment         — debit patient, credit provider
 *   triggers_refund          — refund patient on cancellation
 *   triggers_conversation    — auto-create chat
 *   triggers_review_request  — send review prompt after completion
 *   triggers_stock_check     — validate stock before transition
 *   triggers_stock_subtract  — decrement stock after transition
 *   requires_prescription    — validate prescription exists
 *   requires_content         — require content attachment (prescription, lab_result, etc.)
 */
import { PrismaClient } from '@prisma/client'

export async function seedWorkflowTemplates(prisma: PrismaClient) {
  console.log('  Seeding workflow templates...')

  const templates = [
    // ═════════════════════════════════════════════════════════
    // DOCTOR
    // ═════════════════════════════════════════════════════════
    ...makeStandardConsultation('DOCTOR', 'Doctor Consultation'),
    makeSurgeryWorkflow(),
    makeDiagnosticWorkflow(),

    // ═════════════════════════════════════════════════════════
    // NURSE
    // ═════════════════════════════════════════════════════════
    ...makeStandardConsultation('NURSE', 'Nurse Care'),
    makeSampleCollectionWorkflow(),

    // ═════════════════════════════════════════════════════════
    // NANNY
    // ═════════════════════════════════════════════════════════
    ...makeStandardConsultation('NANNY', 'Childcare'),

    // ═════════════════════════════════════════════════════════
    // LAB_TECHNICIAN
    // ═════════════════════════════════════════════════════════
    ...makeLabTestWorkflows(),

    // ═════════════════════════════════════════════════════════
    // EMERGENCY_WORKER
    // ═════════════════════════════════════════════════════════
    makeEmergencyWorkflow(),

    // ═════════════════════════════════════════════════════════
    // PHARMACIST
    // ═════════════════════════════════════════════════════════
    ...makePharmacyWorkflows(),

    // ═════════════════════════════════════════════════════════
    // INSURANCE_REP
    // ═════════════════════════════════════════════════════════
    makeClaimWorkflow(),

    // ═════════════════════════════════════════════════════════
    // CAREGIVER, PHYSIOTHERAPIST, DENTIST, OPTOMETRIST, NUTRITIONIST
    // ═════════════════════════════════════════════════════════
    ...makeStandardConsultation('CAREGIVER', 'Caregiver Session'),
    ...makeStandardConsultation('PHYSIOTHERAPIST', 'Physiotherapy Session'),
    ...makeDentalWorkflows(),
    ...makeOptometristWorkflows(),
    ...makeStandardConsultation('NUTRITIONIST', 'Nutrition Consultation'),
  ]

  let count = 0
  for (const tpl of templates) {
    await prisma.workflowTemplate.upsert({
      where: { slug: tpl.slug },
      update: { steps: tpl.steps, transitions: tpl.transitions, name: tpl.name },
      create: tpl,
    })
    count++
  }

  console.log(`  ✓ ${count} workflow templates seeded`)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Standard pending/confirmed/in-progress/completed workflow for office, home, video */
function makeStandardConsultation(providerType: string, label: string) {
  return [
    {
      name: `${label} - Office`,
      slug: `${providerType.toLowerCase()}-standard-office`,
      providerType,
      serviceMode: 'office',
      isDefault: true,
      steps: standardOfficeSteps(label),
      transitions: standardOfficeTransitions(),
    },
    {
      name: `${label} - Home`,
      slug: `${providerType.toLowerCase()}-standard-home`,
      providerType,
      serviceMode: 'home',
      isDefault: true,
      steps: standardHomeSteps(label, providerType),
      transitions: standardHomeTransitions(),
    },
    {
      name: `${label} - Video`,
      slug: `${providerType.toLowerCase()}-standard-video`,
      providerType,
      serviceMode: 'video',
      isDefault: true,
      steps: standardVideoSteps(label),
      transitions: standardVideoTransitions(),
    },
  ]
}

// ─── Standard Office Steps ──────────────────────────────────────────────────

function standardOfficeSteps(label: string) {
  return [
    { order: 1, statusCode: 'pending', label: 'Demande envoyee',
      actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger'), a('reschedule', 'Reprogrammer', 'pending', 'secondary')],
      actionsForProvider: [a('accept', 'Accepter', 'confirmed', 'primary'), a('deny', 'Refuser', 'cancelled', 'danger')],
      flags: {},
      notifyPatient: null,
      notifyProvider: { title: `Nouvelle demande - ${label}`, message: '{{patientName}} demande un(e) {{serviceName}} pour le {{scheduledAt}}' },
    },
    { order: 2, statusCode: 'confirmed', label: `${label} confirmee`,
      actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')],
      actionsForProvider: [a('check_in', 'Patient arrive', 'waiting_room', 'primary'), a('cancel', 'Annuler', 'cancelled', 'danger')],
      flags: { triggers_payment: true, triggers_conversation: true },
      notifyPatient: { title: `${label} confirmee`, message: `Votre ${label.toLowerCase()} avec {{providerName}} est confirmee. Montant: {{amount}}` },
      notifyProvider: null,
    },
    { order: 3, statusCode: 'waiting_room', label: 'En salle d\'attente',
      actionsForPatient: [],
      actionsForProvider: [a('start', 'Demarrer', 'in_progress', 'primary')],
      flags: {},
      notifyProvider: { title: 'Patient en attente', message: '{{patientName}} est en salle d\'attente' },
      notifyPatient: null,
    },
    { order: 4, statusCode: 'in_progress', label: `${label} en cours`,
      actionsForPatient: [],
      actionsForProvider: [a('write_notes', 'Rediger notes', 'writing_notes', 'primary'), a('complete', 'Terminer', 'completed', 'secondary')],
      flags: {},
      notifyPatient: { title: `${label} en cours`, message: `Votre ${label.toLowerCase()} a commence` },
      notifyProvider: null,
    },
    { order: 5, statusCode: 'writing_notes', label: 'Redaction des notes',
      actionsForPatient: [],
      actionsForProvider: [a('send_notes', 'Envoyer', 'completed', 'primary')],
      flags: { requires_content: 'care_notes' },
      notifyPatient: null, notifyProvider: null,
    },
    { order: 6, statusCode: 'completed', label: `${label} terminee`,
      actionsForPatient: [a('leave_review', 'Laisser un avis', 'completed', 'secondary')],
      actionsForProvider: [],
      flags: { triggers_review_request: true },
      notifyPatient: { title: `${label} terminee`, message: 'Merci de laisser un avis.' },
      notifyProvider: null,
    },
    { order: 7, statusCode: 'cancelled', label: 'Annulee',
      actionsForPatient: [a('rebook', 'Reserver a nouveau', 'cancelled', 'secondary')],
      actionsForProvider: [],
      flags: { triggers_refund: true },
      notifyPatient: { title: 'Annulee', message: 'Votre reservation a ete annulee.' },
      notifyProvider: { title: 'Annulee', message: 'La reservation a ete annulee par {{actionBy}}.' },
    },
  ]
}

function standardOfficeTransitions() {
  return [
    t('pending', 'confirmed', 'accept', ['provider']),
    t('pending', 'cancelled', 'deny', ['provider']),
    t('pending', 'cancelled', 'cancel', ['patient']),
    t('pending', 'pending', 'reschedule', ['patient']),
    t('confirmed', 'waiting_room', 'check_in', ['provider', 'system']),
    t('confirmed', 'cancelled', 'cancel', ['patient', 'provider']),
    t('waiting_room', 'in_progress', 'start', ['provider']),
    t('in_progress', 'writing_notes', 'write_notes', ['provider']),
    t('in_progress', 'completed', 'complete', ['provider']),
    t('writing_notes', 'completed', 'send_notes', ['provider']),
    t('completed', 'completed', 'leave_review', ['patient']),
    t('cancelled', 'cancelled', 'rebook', ['patient']),
  ]
}

// ─── Standard Home Steps ────────────────────────────────────────────────────

function standardHomeSteps(label: string, providerType: string) {
  const pLabel = providerType.charAt(0) + providerType.slice(1).toLowerCase().replace(/_/g, ' ')
  return [
    { order: 1, statusCode: 'pending', label: 'Demande envoyee',
      actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')],
      actionsForProvider: [a('accept', 'Accepter', 'confirmed', 'primary'), a('deny', 'Refuser', 'cancelled', 'danger')],
      flags: {},
      notifyPatient: null,
      notifyProvider: { title: `Nouvelle demande a domicile`, message: '{{patientName}} demande une visite a domicile' },
    },
    { order: 2, statusCode: 'confirmed', label: 'Visite confirmee',
      actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')],
      actionsForProvider: [a('depart', 'Depart', 'provider_travelling', 'primary'), a('cancel', 'Annuler', 'cancelled', 'danger')],
      flags: { triggers_payment: true, triggers_conversation: true },
      notifyPatient: { title: 'Visite confirmee', message: `Votre visite avec {{providerName}} est confirmee. Montant: {{amount}}` },
      notifyProvider: null,
    },
    { order: 3, statusCode: 'provider_travelling', label: `${pLabel} en deplacement`,
      actionsForPatient: [],
      actionsForProvider: [a('arrived', 'Arrive(e)', 'provider_arrived', 'primary')],
      flags: {},
      notifyPatient: { title: `${pLabel} en route`, message: `{{providerName}} est en deplacement vers vous. Arrivee estimee: {{eta}}` },
      notifyProvider: null,
    },
    { order: 4, statusCode: 'provider_arrived', label: `${pLabel} arrive(e)`,
      actionsForPatient: [],
      actionsForProvider: [a('start', 'Demarrer', 'in_progress', 'primary')],
      flags: {},
      notifyPatient: { title: `${pLabel} arrive(e)`, message: '{{providerName}} est arrive(e) a votre domicile' },
      notifyProvider: null,
    },
    { order: 5, statusCode: 'in_progress', label: `${label} en cours`,
      actionsForPatient: [],
      actionsForProvider: [a('complete', 'Terminer', 'completed', 'primary')],
      flags: {},
      notifyPatient: { title: `${label} en cours`, message: `Votre ${label.toLowerCase()} a commence` },
      notifyProvider: null,
    },
    { order: 6, statusCode: 'completed', label: `${label} terminee`,
      actionsForPatient: [a('leave_review', 'Laisser un avis', 'completed', 'secondary')],
      actionsForProvider: [],
      flags: { triggers_review_request: true },
      notifyPatient: { title: `${label} terminee`, message: 'Merci de laisser un avis.' },
      notifyProvider: null,
    },
    { order: 7, statusCode: 'cancelled', label: 'Annulee',
      actionsForPatient: [], actionsForProvider: [],
      flags: { triggers_refund: true },
      notifyPatient: { title: 'Annulee', message: 'Votre reservation a ete annulee.' },
      notifyProvider: { title: 'Annulee', message: 'La reservation a ete annulee.' },
    },
  ]
}

function standardHomeTransitions() {
  return [
    t('pending', 'confirmed', 'accept', ['provider']),
    t('pending', 'cancelled', 'deny', ['provider']),
    t('pending', 'cancelled', 'cancel', ['patient']),
    t('confirmed', 'provider_travelling', 'depart', ['provider']),
    t('confirmed', 'cancelled', 'cancel', ['patient', 'provider']),
    t('provider_travelling', 'provider_arrived', 'arrived', ['provider']),
    t('provider_arrived', 'in_progress', 'start', ['provider']),
    t('in_progress', 'completed', 'complete', ['provider']),
    t('completed', 'completed', 'leave_review', ['patient']),
  ]
}

// ─── Standard Video Steps ───────────────────────────────────────────────────

function standardVideoSteps(label: string) {
  return [
    { order: 1, statusCode: 'pending', label: 'Demande envoyee',
      actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')],
      actionsForProvider: [a('accept', 'Accepter', 'confirmed', 'primary'), a('deny', 'Refuser', 'cancelled', 'danger')],
      flags: {},
      notifyPatient: null,
      notifyProvider: { title: `Nouvelle teleconsultation`, message: '{{patientName}} demande une teleconsultation' },
    },
    { order: 2, statusCode: 'confirmed', label: 'Teleconsultation confirmee',
      actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')],
      actionsForProvider: [a('prepare_call', 'Preparer l\'appel', 'call_ready', 'primary')],
      flags: { triggers_payment: true, triggers_conversation: true },
      notifyPatient: { title: 'Teleconsultation confirmee', message: `Votre teleconsultation avec {{providerName}} est confirmee. Montant: {{amount}}` },
      notifyProvider: null,
    },
    { order: 3, statusCode: 'call_ready', label: 'Salle prete',
      actionsForPatient: [a('join_call', 'Rejoindre', 'in_call', 'primary')],
      actionsForProvider: [a('join_call', 'Rejoindre', 'in_call', 'primary')],
      flags: { triggers_video_call: true },
      notifyPatient: { title: 'Salle prete', message: 'La salle d\'appel video est prete. Rejoignez maintenant.' },
      notifyProvider: { title: 'Salle prete', message: 'Le patient attend dans la salle video.' },
    },
    { order: 4, statusCode: 'in_call', label: 'Appel en cours',
      actionsForPatient: [],
      actionsForProvider: [a('end_call', 'Terminer l\'appel', 'completed', 'primary')],
      flags: {},
      notifyPatient: null, notifyProvider: null,
    },
    { order: 5, statusCode: 'completed', label: `${label} terminee`,
      actionsForPatient: [a('leave_review', 'Laisser un avis', 'completed', 'secondary')],
      actionsForProvider: [],
      flags: { triggers_review_request: true },
      notifyPatient: { title: `${label} terminee`, message: 'Merci de laisser un avis.' },
      notifyProvider: null,
    },
    { order: 6, statusCode: 'cancelled', label: 'Annulee',
      actionsForPatient: [], actionsForProvider: [],
      flags: { triggers_refund: true },
      notifyPatient: { title: 'Annulee', message: 'Votre teleconsultation a ete annulee.' },
      notifyProvider: { title: 'Annulee', message: 'La teleconsultation a ete annulee.' },
    },
  ]
}

function standardVideoTransitions() {
  return [
    t('pending', 'confirmed', 'accept', ['provider']),
    t('pending', 'cancelled', 'deny', ['provider']),
    t('pending', 'cancelled', 'cancel', ['patient']),
    t('confirmed', 'call_ready', 'prepare_call', ['provider', 'system']),
    t('confirmed', 'cancelled', 'cancel', ['patient', 'provider']),
    t('call_ready', 'in_call', 'join_call', ['patient', 'provider']),
    t('in_call', 'completed', 'end_call', ['provider']),
    t('completed', 'completed', 'leave_review', ['patient']),
  ]
}

// ─── Specialized Workflows ──────────────────────────────────────────────────

function makeSurgeryWorkflow() {
  return {
    name: 'Doctor Surgery - Office',
    slug: 'doctor-surgery-office',
    providerType: 'DOCTOR',
    serviceMode: 'office',
    isDefault: true,
    steps: [
      { order: 1, statusCode: 'pending', label: 'Demande envoyee', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('accept', 'Accepter', 'confirmed', 'primary'), a('deny', 'Refuser', 'cancelled', 'danger')], flags: {}, notifyPatient: null, notifyProvider: { title: 'Nouvelle demande de procedure', message: '{{patientName}} demande une procedure' } },
      { order: 2, statusCode: 'confirmed', label: 'Procedure confirmee', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('start_preop', 'Evaluation pre-op', 'pre_op_assessment', 'primary')], flags: { triggers_payment: true, triggers_conversation: true }, notifyPatient: { title: 'Procedure confirmee', message: 'Votre procedure avec {{providerName}} est confirmee. Montant: {{amount}}' }, notifyProvider: null },
      { order: 3, statusCode: 'pre_op_assessment', label: 'Evaluation pre-operatoire', actionsForPatient: [], actionsForProvider: [a('patient_ready', 'Patient pret', 'ready_for_procedure', 'primary')], flags: {}, notifyPatient: { title: 'Evaluation en cours', message: 'Evaluation pre-operatoire en cours' }, notifyProvider: null },
      { order: 4, statusCode: 'ready_for_procedure', label: 'Pret pour l\'intervention', actionsForPatient: [], actionsForProvider: [a('start_procedure', 'Demarrer', 'in_procedure', 'primary')], flags: {}, notifyPatient: null, notifyProvider: null },
      { order: 5, statusCode: 'in_procedure', label: 'Intervention en cours', actionsForPatient: [], actionsForProvider: [a('end_procedure', 'Terminer', 'post_op_observation', 'primary')], flags: {}, notifyPatient: null, notifyProvider: null },
      { order: 6, statusCode: 'post_op_observation', label: 'Observation post-op', actionsForPatient: [], actionsForProvider: [a('discharge', 'Liberer patient', 'recovery_instructions', 'primary')], flags: {}, notifyPatient: { title: 'Observation post-op', message: 'Vous etes en observation post-operatoire' }, notifyProvider: null },
      { order: 7, statusCode: 'recovery_instructions', label: 'Instructions de recuperation', actionsForPatient: [], actionsForProvider: [a('complete', 'Completer', 'completed', 'primary')], flags: { requires_content: 'care_notes' }, notifyPatient: { title: 'Instructions envoyees', message: 'Instructions de recuperation disponibles' }, notifyProvider: null },
      { order: 8, statusCode: 'completed', label: 'Procedure terminee', actionsForPatient: [a('leave_review', 'Laisser un avis', 'completed', 'secondary')], actionsForProvider: [], flags: { triggers_review_request: true }, notifyPatient: { title: 'Procedure terminee', message: 'Votre procedure est terminee.' }, notifyProvider: null },
      { order: 9, statusCode: 'cancelled', label: 'Annulee', actionsForPatient: [], actionsForProvider: [], flags: { triggers_refund: true }, notifyPatient: { title: 'Annulee', message: 'La procedure a ete annulee.' }, notifyProvider: { title: 'Annulee', message: 'La procedure a ete annulee.' } },
    ],
    transitions: [
      t('pending', 'confirmed', 'accept', ['provider']), t('pending', 'cancelled', 'deny', ['provider']), t('pending', 'cancelled', 'cancel', ['patient']),
      t('confirmed', 'pre_op_assessment', 'start_preop', ['provider']), t('confirmed', 'cancelled', 'cancel', ['patient', 'provider']),
      t('pre_op_assessment', 'ready_for_procedure', 'patient_ready', ['provider']),
      t('ready_for_procedure', 'in_procedure', 'start_procedure', ['provider']),
      t('in_procedure', 'post_op_observation', 'end_procedure', ['provider']),
      t('post_op_observation', 'recovery_instructions', 'discharge', ['provider']),
      t('recovery_instructions', 'completed', 'complete', ['provider']),
      t('completed', 'completed', 'leave_review', ['patient']),
    ],
  }
}

function makeDiagnosticWorkflow() {
  return {
    name: 'Doctor Diagnostic - Office',
    slug: 'doctor-diagnostic-office',
    providerType: 'DOCTOR',
    serviceMode: 'office',
    isDefault: true,
    steps: [
      { order: 1, statusCode: 'pending', label: 'Demande envoyee', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('accept', 'Accepter', 'confirmed', 'primary')], flags: {}, notifyPatient: null, notifyProvider: { title: 'Nouvelle demande de bilan', message: '{{patientName}} demande un bilan de sante' } },
      { order: 2, statusCode: 'confirmed', label: 'Bilan confirme', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('start_exam', 'Demarrer examen', 'examination', 'primary')], flags: { triggers_payment: true, triggers_conversation: true }, notifyPatient: { title: 'Bilan confirme', message: 'Votre bilan avec {{providerName}} est confirme.' }, notifyProvider: null },
      { order: 3, statusCode: 'examination', label: 'Examen en cours', actionsForPatient: [], actionsForProvider: [a('enter_results', 'Saisir resultats', 'results_ready', 'primary')], flags: {}, notifyPatient: { title: 'Examen en cours', message: 'Votre examen est en cours' }, notifyProvider: null },
      { order: 4, statusCode: 'results_ready', label: 'Resultats disponibles', actionsForPatient: [a('view_results', 'Voir resultats', 'results_ready', 'secondary')], actionsForProvider: [a('complete', 'Completer', 'completed', 'primary')], flags: { requires_content: 'report' }, notifyPatient: { title: 'Resultats disponibles', message: 'Les resultats de votre bilan sont disponibles.' }, notifyProvider: null },
      { order: 5, statusCode: 'completed', label: 'Bilan termine', actionsForPatient: [a('leave_review', 'Laisser un avis', 'completed', 'secondary')], actionsForProvider: [], flags: { triggers_review_request: true }, notifyPatient: { title: 'Bilan termine', message: 'Votre bilan est termine.' }, notifyProvider: null },
      { order: 6, statusCode: 'cancelled', label: 'Annule', actionsForPatient: [], actionsForProvider: [], flags: { triggers_refund: true }, notifyPatient: { title: 'Annule', message: 'Le bilan a ete annule.' }, notifyProvider: null },
    ],
    transitions: [
      t('pending', 'confirmed', 'accept', ['provider']), t('pending', 'cancelled', 'cancel', ['patient']),
      t('confirmed', 'examination', 'start_exam', ['provider']), t('confirmed', 'cancelled', 'cancel', ['patient', 'provider']),
      t('examination', 'results_ready', 'enter_results', ['provider']),
      t('results_ready', 'results_ready', 'view_results', ['patient']),
      t('results_ready', 'completed', 'complete', ['provider']),
      t('completed', 'completed', 'leave_review', ['patient']),
    ],
  }
}

function makeSampleCollectionWorkflow() {
  return {
    name: 'Nurse Sample Collection - Home',
    slug: 'nurse-sample-collection-home',
    providerType: 'NURSE',
    serviceMode: 'home',
    isDefault: true,
    steps: [
      { order: 1, statusCode: 'pending', label: 'Demande envoyee', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('accept', 'Accepter', 'confirmed', 'primary'), a('deny', 'Refuser', 'cancelled', 'danger')], flags: {}, notifyPatient: null, notifyProvider: { title: 'Nouvelle demande de prelevement', message: '{{patientName}} demande un prelevement a domicile' } },
      { order: 2, statusCode: 'confirmed', label: 'Prelevement confirme', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('depart', 'Depart', 'nurse_travelling', 'primary')], flags: { triggers_payment: true, triggers_conversation: true }, notifyPatient: { title: 'Prelevement confirme', message: 'Prelevement confirme. Montant: {{amount}}' }, notifyProvider: null },
      { order: 3, statusCode: 'nurse_travelling', label: 'Infirmier(e) en route', actionsForPatient: [], actionsForProvider: [a('arrived', 'Arrive(e)', 'nurse_arrived', 'primary')], flags: {}, notifyPatient: { title: 'Infirmier(e) en route', message: '{{providerName}} est en deplacement vers vous' }, notifyProvider: null },
      { order: 4, statusCode: 'nurse_arrived', label: 'Infirmier(e) arrive(e)', actionsForPatient: [], actionsForProvider: [a('start_collection', 'Demarrer prelevement', 'sample_collection', 'primary')], flags: {}, notifyPatient: { title: 'Arrive(e)', message: '{{providerName}} est arrive(e)' }, notifyProvider: null },
      { order: 5, statusCode: 'sample_collection', label: 'Prelevement en cours', actionsForPatient: [], actionsForProvider: [a('collected', 'Prelevement fait', 'sample_collected', 'primary')], flags: {}, notifyPatient: null, notifyProvider: null },
      { order: 6, statusCode: 'sample_collected', label: 'Echantillon collecte', actionsForPatient: [], actionsForProvider: [a('depart_lab', 'Depart vers labo', 'sample_in_transit', 'primary')], flags: {}, notifyPatient: { title: 'Prelevement effectue', message: 'Echantillon collecte avec succes' }, notifyProvider: null },
      { order: 7, statusCode: 'sample_in_transit', label: 'En transit vers le labo', actionsForPatient: [], actionsForProvider: [a('delivered_lab', 'Depose au labo', 'sample_delivered', 'primary')], flags: {}, notifyPatient: { title: 'En transit', message: 'Echantillon en transit vers le laboratoire' }, notifyProvider: null },
      { order: 8, statusCode: 'sample_delivered', label: 'Depose au laboratoire', actionsForPatient: [], actionsForProvider: [a('complete', 'Completer', 'completed', 'primary')], flags: {}, notifyPatient: { title: 'Depose au labo', message: 'Echantillon depose au laboratoire' }, notifyProvider: null },
      { order: 9, statusCode: 'completed', label: 'Prelevement termine', actionsForPatient: [a('leave_review', 'Laisser un avis', 'completed', 'secondary')], actionsForProvider: [], flags: { triggers_review_request: true }, notifyPatient: { title: 'Termine', message: 'Prelevement termine. Resultats a venir.' }, notifyProvider: null },
      { order: 10, statusCode: 'cancelled', label: 'Annule', actionsForPatient: [], actionsForProvider: [], flags: { triggers_refund: true }, notifyPatient: { title: 'Annule', message: 'Prelevement annule.' }, notifyProvider: null },
    ],
    transitions: [
      t('pending', 'confirmed', 'accept', ['provider']), t('pending', 'cancelled', 'deny', ['provider']), t('pending', 'cancelled', 'cancel', ['patient']),
      t('confirmed', 'nurse_travelling', 'depart', ['provider']), t('confirmed', 'cancelled', 'cancel', ['patient', 'provider']),
      t('nurse_travelling', 'nurse_arrived', 'arrived', ['provider']),
      t('nurse_arrived', 'sample_collection', 'start_collection', ['provider']),
      t('sample_collection', 'sample_collected', 'collected', ['provider']),
      t('sample_collected', 'sample_in_transit', 'depart_lab', ['provider']),
      t('sample_in_transit', 'sample_delivered', 'delivered_lab', ['provider']),
      t('sample_delivered', 'completed', 'complete', ['provider']),
      t('completed', 'completed', 'leave_review', ['patient']),
    ],
  }
}

function makeLabTestWorkflows() {
  return [
    {
      name: 'Lab Test - Office',
      slug: 'lab_technician-test-office',
      providerType: 'LAB_TECHNICIAN',
      serviceMode: 'office',
      isDefault: true,
      steps: [
        { order: 1, statusCode: 'pending', label: 'Demande envoyee', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('accept', 'Accepter', 'confirmed', 'primary'), a('deny', 'Refuser', 'cancelled', 'danger')], flags: {}, notifyPatient: null, notifyProvider: { title: 'Nouvelle demande de test', message: '{{patientName}} demande un test labo' } },
        { order: 2, statusCode: 'confirmed', label: 'Test confirme', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('collect', 'Prelevement', 'sample_collection', 'primary')], flags: { triggers_payment: true, triggers_conversation: true }, notifyPatient: { title: 'Test confirme', message: 'Test confirme. Montant: {{amount}}' }, notifyProvider: null },
        { order: 3, statusCode: 'sample_collection', label: 'Prelevement en cours', actionsForPatient: [], actionsForProvider: [a('start_analysis', 'Lancer analyse', 'analysis_in_progress', 'primary')], flags: {}, notifyPatient: null, notifyProvider: null },
        { order: 4, statusCode: 'analysis_in_progress', label: 'Analyse en cours', actionsForPatient: [], actionsForProvider: [a('enter_results', 'Saisir resultats', 'quality_check', 'primary')], flags: {}, notifyPatient: { title: 'Analyse en cours', message: 'Votre echantillon est en cours d\'analyse' }, notifyProvider: null },
        { order: 5, statusCode: 'quality_check', label: 'Controle qualite', actionsForPatient: [], actionsForProvider: [a('validate', 'Valider', 'results_ready', 'primary'), a('redo', 'Refaire', 'analysis_in_progress', 'danger')], flags: {}, notifyPatient: null, notifyProvider: null },
        { order: 6, statusCode: 'results_ready', label: 'Resultats disponibles', actionsForPatient: [a('view_results', 'Voir resultats', 'results_ready', 'secondary')], actionsForProvider: [a('complete', 'Completer', 'completed', 'primary')], flags: { requires_content: 'lab_result' }, notifyPatient: { title: 'Resultats disponibles', message: 'Vos resultats de laboratoire sont disponibles' }, notifyProvider: null },
        { order: 7, statusCode: 'completed', label: 'Test termine', actionsForPatient: [a('leave_review', 'Laisser un avis', 'completed', 'secondary')], actionsForProvider: [], flags: { triggers_review_request: true }, notifyPatient: { title: 'Test termine', message: 'Test labo termine.' }, notifyProvider: null },
        { order: 8, statusCode: 'cancelled', label: 'Annule', actionsForPatient: [], actionsForProvider: [], flags: { triggers_refund: true }, notifyPatient: { title: 'Annule', message: 'Test annule.' }, notifyProvider: null },
      ],
      transitions: [
        t('pending', 'confirmed', 'accept', ['provider']), t('pending', 'cancelled', 'deny', ['provider']), t('pending', 'cancelled', 'cancel', ['patient']),
        t('confirmed', 'sample_collection', 'collect', ['provider']), t('confirmed', 'cancelled', 'cancel', ['patient', 'provider']),
        t('sample_collection', 'analysis_in_progress', 'start_analysis', ['provider']),
        t('analysis_in_progress', 'quality_check', 'enter_results', ['provider']),
        t('quality_check', 'results_ready', 'validate', ['provider']),
        t('quality_check', 'analysis_in_progress', 'redo', ['provider']),
        t('results_ready', 'results_ready', 'view_results', ['patient']),
        t('results_ready', 'completed', 'complete', ['provider']),
        t('completed', 'completed', 'leave_review', ['patient']),
      ],
    },
    {
      name: 'Lab Test - Home Collection',
      slug: 'lab_technician-test-home',
      providerType: 'LAB_TECHNICIAN',
      serviceMode: 'home',
      isDefault: true,
      steps: standardHomeSteps('Lab Test', 'LAB_TECHNICIAN'),
      transitions: standardHomeTransitions(),
    },
  ]
}

function makeEmergencyWorkflow() {
  return {
    name: 'Emergency Response',
    slug: 'emergency_worker-response-home',
    providerType: 'EMERGENCY_WORKER',
    serviceMode: 'home',
    isDefault: true,
    steps: [
      { order: 1, statusCode: 'pending', label: 'Urgence signalee', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('accept', 'Accepter', 'dispatched', 'primary'), a('deny', 'Refuser', 'cancelled', 'danger')], flags: {}, notifyPatient: null, notifyProvider: { title: 'Nouvelle urgence', message: 'Urgence signalee par {{patientName}}' } },
      { order: 2, statusCode: 'dispatched', label: 'Intervenant assigne', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('en_route', 'En route', 'en_route', 'primary')], flags: { triggers_conversation: true }, notifyPatient: { title: 'Intervenant assigne', message: '{{providerName}} est assigne a votre urgence' }, notifyProvider: null },
      { order: 3, statusCode: 'en_route', label: 'En deplacement', actionsForPatient: [], actionsForProvider: [a('arrived', 'Arrive', 'arrived_on_scene', 'primary')], flags: {}, notifyPatient: { title: 'En route', message: '{{providerName}} est en route vers vous' }, notifyProvider: null },
      { order: 4, statusCode: 'arrived_on_scene', label: 'Arrive sur place', actionsForPatient: [], actionsForProvider: [a('assess', 'Evaluer', 'patient_assessment', 'primary')], flags: {}, notifyPatient: { title: 'Arrive', message: '{{providerName}} est arrive sur place' }, notifyProvider: null },
      { order: 5, statusCode: 'patient_assessment', label: 'Evaluation du patient', actionsForPatient: [], actionsForProvider: [a('first_aid', 'Premiers soins', 'first_aid', 'primary')], flags: {}, notifyPatient: null, notifyProvider: null },
      { order: 6, statusCode: 'first_aid', label: 'Premiers soins', actionsForPatient: [], actionsForProvider: [a('stabilized', 'Stabilise', 'stabilized', 'primary')], flags: {}, notifyPatient: { title: 'Premiers soins', message: 'Premiers soins en cours' }, notifyProvider: null },
      { order: 7, statusCode: 'stabilized', label: 'Patient stabilise', actionsForPatient: [], actionsForProvider: [a('transport', 'Transport hopital', 'transporting', 'primary'), a('resolve', 'Resolu sur place', 'resolved', 'secondary')], flags: {}, notifyPatient: { title: 'Stabilise', message: 'Patient stabilise' }, notifyProvider: null },
      { order: 8, statusCode: 'transporting', label: 'Transport vers hopital', actionsForPatient: [], actionsForProvider: [a('delivered', 'Patient remis', 'resolved', 'primary')], flags: {}, notifyPatient: { title: 'Transport', message: 'Transport vers l\'hopital en cours' }, notifyProvider: null },
      { order: 9, statusCode: 'resolved', label: 'Urgence resolue', actionsForPatient: [a('leave_review', 'Laisser un avis', 'resolved', 'secondary')], actionsForProvider: [], flags: { triggers_review_request: true }, notifyPatient: { title: 'Resolue', message: 'L\'urgence a ete resolue.' }, notifyProvider: null },
      { order: 10, statusCode: 'cancelled', label: 'Annulee', actionsForPatient: [], actionsForProvider: [], flags: {}, notifyPatient: { title: 'Annulee', message: 'Urgence annulee.' }, notifyProvider: null },
    ],
    transitions: [
      t('pending', 'dispatched', 'accept', ['provider']), t('pending', 'cancelled', 'deny', ['provider']), t('pending', 'cancelled', 'cancel', ['patient']),
      t('dispatched', 'en_route', 'en_route', ['provider']), t('dispatched', 'cancelled', 'cancel', ['patient']),
      t('en_route', 'arrived_on_scene', 'arrived', ['provider']),
      t('arrived_on_scene', 'patient_assessment', 'assess', ['provider']),
      t('patient_assessment', 'first_aid', 'first_aid', ['provider']),
      t('first_aid', 'stabilized', 'stabilized', ['provider']),
      t('stabilized', 'transporting', 'transport', ['provider']),
      t('stabilized', 'resolved', 'resolve', ['provider']),
      t('transporting', 'resolved', 'delivered', ['provider']),
      t('resolved', 'resolved', 'leave_review', ['patient']),
    ],
  }
}

function makePharmacyWorkflows() {
  return [
    {
      name: 'Pharmacy Order - Pickup',
      slug: 'pharmacist-order-office',
      providerType: 'PHARMACIST',
      serviceMode: 'office',
      isDefault: true,
      steps: [
        { order: 1, statusCode: 'pending', label: 'Commande envoyee', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('review', 'Verifier ordonnance', 'prescription_review', 'primary')], flags: {}, notifyPatient: null, notifyProvider: { title: 'Nouvelle commande', message: 'Nouvelle commande de {{patientName}}' } },
        { order: 2, statusCode: 'prescription_review', label: 'Verification ordonnance', actionsForPatient: [], actionsForProvider: [a('stock_check', 'Verifier stock', 'stock_check', 'primary'), a('deny', 'Refuser', 'cancelled', 'danger')], flags: { requires_prescription: true }, notifyPatient: { title: 'Verification', message: 'Ordonnance en cours de verification' }, notifyProvider: null },
        { order: 3, statusCode: 'stock_check', label: 'Verification stock', actionsForPatient: [], actionsForProvider: [a('confirm', 'Confirmer', 'order_confirmed', 'primary')], flags: { triggers_stock_check: true }, notifyPatient: null, notifyProvider: null },
        { order: 4, statusCode: 'order_confirmed', label: 'Commande confirmee', actionsForPatient: [], actionsForProvider: [a('prepare', 'Preparer', 'preparing', 'primary')], flags: { triggers_payment: true, triggers_stock_subtract: true }, notifyPatient: { title: 'Commande confirmee', message: 'Commande confirmee. Montant: {{amount}}' }, notifyProvider: null },
        { order: 5, statusCode: 'preparing', label: 'En preparation', actionsForPatient: [], actionsForProvider: [a('ready', 'Pret', 'ready_for_pickup', 'primary')], flags: {}, notifyPatient: { title: 'En preparation', message: 'Commande en preparation' }, notifyProvider: null },
        { order: 6, statusCode: 'ready_for_pickup', label: 'Pret pour retrait', actionsForPatient: [], actionsForProvider: [a('picked_up', 'Remis', 'completed', 'primary')], flags: {}, notifyPatient: { title: 'Pret', message: 'Commande prete pour retrait en pharmacie' }, notifyProvider: null },
        { order: 7, statusCode: 'completed', label: 'Commande terminee', actionsForPatient: [a('leave_review', 'Laisser un avis', 'completed', 'secondary')], actionsForProvider: [], flags: { triggers_review_request: true }, notifyPatient: { title: 'Terminee', message: 'Commande terminee.' }, notifyProvider: null },
        { order: 8, statusCode: 'cancelled', label: 'Annulee', actionsForPatient: [], actionsForProvider: [], flags: { triggers_refund: true }, notifyPatient: { title: 'Annulee', message: 'Commande annulee.' }, notifyProvider: null },
      ],
      transitions: [
        t('pending', 'prescription_review', 'review', ['provider']), t('pending', 'cancelled', 'cancel', ['patient']),
        t('prescription_review', 'stock_check', 'stock_check', ['provider']), t('prescription_review', 'cancelled', 'deny', ['provider']),
        t('stock_check', 'order_confirmed', 'confirm', ['provider']),
        t('order_confirmed', 'preparing', 'prepare', ['provider']),
        t('preparing', 'ready_for_pickup', 'ready', ['provider']),
        t('ready_for_pickup', 'completed', 'picked_up', ['provider']),
        t('completed', 'completed', 'leave_review', ['patient']),
      ],
    },
    {
      name: 'Pharmacy Order - Delivery',
      slug: 'pharmacist-order-home',
      providerType: 'PHARMACIST',
      serviceMode: 'home',
      isDefault: true,
      steps: [
        { order: 1, statusCode: 'pending', label: 'Commande envoyee', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('review', 'Verifier', 'prescription_review', 'primary')], flags: {}, notifyPatient: null, notifyProvider: { title: 'Nouvelle commande livraison', message: 'Nouvelle commande de {{patientName}}' } },
        { order: 2, statusCode: 'prescription_review', label: 'Verification', actionsForPatient: [], actionsForProvider: [a('confirm', 'Confirmer', 'order_confirmed', 'primary'), a('deny', 'Refuser', 'cancelled', 'danger')], flags: { requires_prescription: true }, notifyPatient: { title: 'Verification', message: 'Ordonnance en cours de verification' }, notifyProvider: null },
        { order: 3, statusCode: 'order_confirmed', label: 'Confirmee', actionsForPatient: [], actionsForProvider: [a('prepare', 'Preparer', 'preparing', 'primary')], flags: { triggers_payment: true, triggers_stock_subtract: true }, notifyPatient: { title: 'Confirmee', message: 'Commande confirmee. Montant: {{amount}}' }, notifyProvider: null },
        { order: 4, statusCode: 'preparing', label: 'En preparation', actionsForPatient: [], actionsForProvider: [a('ship', 'Envoyer', 'delivery_in_progress', 'primary')], flags: {}, notifyPatient: null, notifyProvider: null },
        { order: 5, statusCode: 'delivery_in_progress', label: 'Livraison en cours', actionsForPatient: [], actionsForProvider: [a('delivered', 'Livre', 'completed', 'primary')], flags: {}, notifyPatient: { title: 'Livraison', message: 'Commande en cours de livraison' }, notifyProvider: null },
        { order: 6, statusCode: 'completed', label: 'Livree', actionsForPatient: [a('leave_review', 'Laisser un avis', 'completed', 'secondary')], actionsForProvider: [], flags: { triggers_review_request: true }, notifyPatient: { title: 'Livree', message: 'Commande livree.' }, notifyProvider: null },
        { order: 7, statusCode: 'cancelled', label: 'Annulee', actionsForPatient: [], actionsForProvider: [], flags: { triggers_refund: true }, notifyPatient: { title: 'Annulee', message: 'Commande annulee.' }, notifyProvider: null },
      ],
      transitions: [
        t('pending', 'prescription_review', 'review', ['provider']), t('pending', 'cancelled', 'cancel', ['patient']),
        t('prescription_review', 'order_confirmed', 'confirm', ['provider']), t('prescription_review', 'cancelled', 'deny', ['provider']),
        t('order_confirmed', 'preparing', 'prepare', ['provider']),
        t('preparing', 'delivery_in_progress', 'ship', ['provider']),
        t('delivery_in_progress', 'completed', 'delivered', ['provider']),
        t('completed', 'completed', 'leave_review', ['patient']),
      ],
    },
  ]
}

function makeClaimWorkflow() {
  return {
    name: 'Insurance Claim',
    slug: 'insurance_rep-claim-office',
    providerType: 'INSURANCE_REP',
    serviceMode: 'office',
    isDefault: true,
    steps: [
      { order: 1, statusCode: 'pending', label: 'Reclamation soumise', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('review', 'Examiner', 'document_review', 'primary')], flags: {}, notifyPatient: null, notifyProvider: { title: 'Nouvelle reclamation', message: 'Reclamation de {{patientName}}' } },
      { order: 2, statusCode: 'document_review', label: 'Documents en revue', actionsForPatient: [], actionsForProvider: [a('docs_ok', 'Documents OK', 'assessment', 'primary'), a('request_docs', 'Demander documents', 'additional_info', 'secondary')], flags: {}, notifyPatient: { title: 'En revue', message: 'Documents en cours d\'examen' }, notifyProvider: null },
      { order: 3, statusCode: 'additional_info', label: 'Documents requis', actionsForPatient: [a('submit_docs', 'Fournir documents', 'document_review', 'primary')], actionsForProvider: [], flags: {}, notifyPatient: { title: 'Documents requis', message: 'Documents supplementaires requis' }, notifyProvider: null },
      { order: 4, statusCode: 'assessment', label: 'Evaluation', actionsForPatient: [], actionsForProvider: [a('approve', 'Approuver', 'approved', 'primary'), a('reject', 'Rejeter', 'rejected', 'danger')], flags: {}, notifyPatient: { title: 'Evaluation', message: 'Reclamation en cours d\'evaluation' }, notifyProvider: null },
      { order: 5, statusCode: 'approved', label: 'Approuvee', actionsForPatient: [], actionsForProvider: [], flags: {}, notifyPatient: { title: 'Approuvee', message: 'Reclamation approuvee. Remboursement en cours.' }, notifyProvider: null },
      { order: 6, statusCode: 'rejected', label: 'Rejetee', actionsForPatient: [a('contest', 'Contester', 'document_review', 'secondary')], actionsForProvider: [], flags: {}, notifyPatient: { title: 'Rejetee', message: 'Reclamation rejetee.' }, notifyProvider: null },
      { order: 7, statusCode: 'cancelled', label: 'Annulee', actionsForPatient: [], actionsForProvider: [], flags: {}, notifyPatient: { title: 'Annulee', message: 'Reclamation annulee.' }, notifyProvider: null },
    ],
    transitions: [
      t('pending', 'document_review', 'review', ['provider']), t('pending', 'cancelled', 'cancel', ['patient']),
      t('document_review', 'assessment', 'docs_ok', ['provider']),
      t('document_review', 'additional_info', 'request_docs', ['provider']),
      t('additional_info', 'document_review', 'submit_docs', ['patient']),
      t('assessment', 'approved', 'approve', ['provider']),
      t('assessment', 'rejected', 'reject', ['provider']),
      t('rejected', 'document_review', 'contest', ['patient']),
    ],
  }
}

function makeDentalWorkflows() {
  return [
    ...makeStandardConsultation('DENTIST', 'Dental Consultation'),
    {
      name: 'Dental Procedure - Office',
      slug: 'dentist-procedure-office',
      providerType: 'DENTIST',
      serviceMode: 'office',
      isDefault: true,
      steps: [
        { order: 1, statusCode: 'pending', label: 'Demande envoyee', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('accept', 'Accepter', 'confirmed', 'primary')], flags: {}, notifyPatient: null, notifyProvider: { title: 'Nouvelle demande dentaire', message: '{{patientName}} demande un soin dentaire' } },
        { order: 2, statusCode: 'confirmed', label: 'Soin confirme', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('anesthesia', 'Anesthesie', 'anesthesia', 'primary')], flags: { triggers_payment: true, triggers_conversation: true }, notifyPatient: { title: 'Confirme', message: 'Soin dentaire confirme. Montant: {{amount}}' }, notifyProvider: null },
        { order: 3, statusCode: 'anesthesia', label: 'Anesthesie', actionsForPatient: [], actionsForProvider: [a('start_procedure', 'Demarrer soin', 'dental_procedure', 'primary')], flags: {}, notifyPatient: null, notifyProvider: null },
        { order: 4, statusCode: 'dental_procedure', label: 'Soin en cours', actionsForPatient: [], actionsForProvider: [a('end_procedure', 'Terminer', 'post_procedure', 'primary')], flags: {}, notifyPatient: null, notifyProvider: null },
        { order: 5, statusCode: 'post_procedure', label: 'Post-soin', actionsForPatient: [], actionsForProvider: [a('send_instructions', 'Envoyer instructions', 'completed', 'primary')], flags: { requires_content: 'care_notes' }, notifyPatient: { title: 'Soin termine', message: 'Instructions post-soin disponibles' }, notifyProvider: null },
        { order: 6, statusCode: 'completed', label: 'Soin termine', actionsForPatient: [a('leave_review', 'Laisser un avis', 'completed', 'secondary')], actionsForProvider: [], flags: { triggers_review_request: true }, notifyPatient: { title: 'Termine', message: 'Soin dentaire termine.' }, notifyProvider: null },
        { order: 7, statusCode: 'cancelled', label: 'Annule', actionsForPatient: [], actionsForProvider: [], flags: { triggers_refund: true }, notifyPatient: { title: 'Annule', message: 'Soin annule.' }, notifyProvider: null },
      ],
      transitions: [
        t('pending', 'confirmed', 'accept', ['provider']), t('pending', 'cancelled', 'cancel', ['patient']),
        t('confirmed', 'anesthesia', 'anesthesia', ['provider']), t('confirmed', 'cancelled', 'cancel', ['patient', 'provider']),
        t('anesthesia', 'dental_procedure', 'start_procedure', ['provider']),
        t('dental_procedure', 'post_procedure', 'end_procedure', ['provider']),
        t('post_procedure', 'completed', 'send_instructions', ['provider']),
        t('completed', 'completed', 'leave_review', ['patient']),
      ],
    },
  ]
}

function makeOptometristWorkflows() {
  return [
    ...makeStandardConsultation('OPTOMETRIST', 'Eye Examination'),
    {
      name: 'Fundus Exam - Office',
      slug: 'optometrist-fundus-office',
      providerType: 'OPTOMETRIST',
      serviceMode: 'office',
      isDefault: true,
      steps: [
        { order: 1, statusCode: 'pending', label: 'Demande envoyee', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('accept', 'Accepter', 'confirmed', 'primary')], flags: {}, notifyPatient: null, notifyProvider: { title: 'Nouvelle demande fond d\'oeil', message: '{{patientName}} demande un fond d\'oeil' } },
        { order: 2, statusCode: 'confirmed', label: 'Confirme', actionsForPatient: [a('cancel', 'Annuler', 'cancelled', 'danger')], actionsForProvider: [a('dilate', 'Dilatation', 'pupil_dilation', 'primary')], flags: { triggers_payment: true, triggers_conversation: true }, notifyPatient: { title: 'Confirme', message: 'Examen confirme. Montant: {{amount}}' }, notifyProvider: null },
        { order: 3, statusCode: 'pupil_dilation', label: 'Dilatation pupillaire', actionsForPatient: [], actionsForProvider: [a('exam', 'Examiner', 'fundus_exam', 'primary')], flags: {}, notifyPatient: { title: 'Dilatation', message: 'Dilatation en cours (20-30 min)' }, notifyProvider: null },
        { order: 4, statusCode: 'fundus_exam', label: 'Fond d\'oeil', actionsForPatient: [], actionsForProvider: [a('report', 'Rediger rapport', 'report_ready', 'primary')], flags: {}, notifyPatient: null, notifyProvider: null },
        { order: 5, statusCode: 'report_ready', label: 'Rapport disponible', actionsForPatient: [a('view_report', 'Voir rapport', 'report_ready', 'secondary')], actionsForProvider: [a('complete', 'Completer', 'completed', 'primary')], flags: { requires_content: 'report' }, notifyPatient: { title: 'Rapport disponible', message: 'Rapport d\'examen disponible' }, notifyProvider: null },
        { order: 6, statusCode: 'completed', label: 'Examen termine', actionsForPatient: [a('leave_review', 'Laisser un avis', 'completed', 'secondary')], actionsForProvider: [], flags: { triggers_review_request: true }, notifyPatient: { title: 'Termine', message: 'Examen termine. Vision floue 4-6h.' }, notifyProvider: null },
        { order: 7, statusCode: 'cancelled', label: 'Annule', actionsForPatient: [], actionsForProvider: [], flags: { triggers_refund: true }, notifyPatient: { title: 'Annule', message: 'Examen annule.' }, notifyProvider: null },
      ],
      transitions: [
        t('pending', 'confirmed', 'accept', ['provider']), t('pending', 'cancelled', 'cancel', ['patient']),
        t('confirmed', 'pupil_dilation', 'dilate', ['provider']), t('confirmed', 'cancelled', 'cancel', ['patient', 'provider']),
        t('pupil_dilation', 'fundus_exam', 'exam', ['provider']),
        t('fundus_exam', 'report_ready', 'report', ['provider']),
        t('report_ready', 'report_ready', 'view_report', ['patient']),
        t('report_ready', 'completed', 'complete', ['provider']),
        t('completed', 'completed', 'leave_review', ['patient']),
      ],
    },
  ]
}

// ─── Tiny helpers ───────────────────────────────────────────────────────────

function a(action: string, label: string, targetStatus: string, style: string) {
  return { action, label, targetStatus, style }
}

function t(from: string, to: string, action: string, allowedRoles: string[]) {
  return { from, to, action, allowedRoles }
}
