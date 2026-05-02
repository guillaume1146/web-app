/**
 * Workflow Engine — Core Type Definitions
 * Mirror of lib/workflow/types.ts for NestJS
 */

export interface StepAction {
  action: string;
  label: string;
  /** i18n key resolved at render time; falls back to `label` if missing. */
  labelKey?: string;
  targetStatus: string;
  style?: 'primary' | 'danger' | 'secondary';
  confirmationRequired?: boolean;
}

/**
 * Step-level flags — ALL set exclusively by WorkflowStepType.defaultFlags or
 * Tier 2 auto-triggers. Admins never place these manually in the builder.
 *
 * Every other workflow behaviour (payment, refund, conversation, review,
 * video/audio room, stock) is handled systematically by Tier 2 without
 * any per-step flag.
 */
export interface StepFlags {
  /**
   * Injected by WorkflowStepType.defaultFlags (VIDEO_CALL_READY, VIDEO_CALL_ACTIVE).
   * Also auto-fired by Tier 2 on acceptance when serviceMode === 'video' — the flag
   * is not needed for the common case. Never placed manually by admins.
   */
  triggers_video_call?: boolean;
  /**
   * Injected by WorkflowStepType.defaultFlags (AUDIO_CALL_READY, AUDIO_CALL_ACTIVE).
   * Auto-fired by Tier 2 when a step of those types is reached.
   * Never placed manually by admins.
   */
  triggers_audio_call?: boolean;
  /**
   * Set ONLY by WorkflowStepType.defaultFlags — never placed manually by admins.
   * Enforces that the provider attaches a specific document when transitioning
   * TO this step (Domain 2: clinical scan → result workflows).
   * e.g. RESULTS_READY → requires 'lab_result', EXAM_COMPLETE → requires 'report'
   */
  requires_content?: ContentType;
  /**
   * Set ONLY by WorkflowStepType.defaultFlags — never placed manually by admins.
   * Used for mid-workflow prescription-review steps (e.g. MEDICATION_REVIEW in
   * mental-health therapy). Upfront prescription eligibility checks go in
   * serviceConfig.preflight.requires instead.
   */
  requires_prescription?: boolean;
}

export interface StepNotification {
  title: string;
  message: string;
}

/**
 * Visual + semantic bucket for a step. Drives the badge colour, timeline
 * dot, and any UI that wants to convey "where am I in the flow?" without
 * having to pattern-match on the arbitrary status code. Authors rarely pick
 * this by hand — the builder auto-derives it (first step → `pending`,
 * terminal success → `success`, terminal failure → `danger`, else `active`)
 * and lets them override.
 *
 * This field is what makes dynamic status codes render correctly: with no
 * category the engine still works, but badges fall back to grey. Save a
 * category and the UI lights up regardless of how exotic the statusCode is.
 */
export type StepCategory = 'pending' | 'active' | 'success' | 'danger' | 'waiting';

/**
 * Closed set of UI icons a step can render with. Authors pick one
 * explicitly via the builder; otherwise the engine infers from flags +
 * label keywords at render time (see `stepIconRegistry.ts` on the client).
 * Keeping this closed means we can ship a consistent picker + prevent
 * emoji drift across authors creating the same kind of step.
 */
export type StepIcon =
  | 'pending' | 'accepted' | 'payment' | 'paid' | 'refund'
  | 'transport' | 'at_home' | 'at_office' | 'at_lab' | 'at_hospital'
  | 'video_call' | 'audio_call' | 'chat'
  | 'sample_collection' | 'analysis' | 'surgery'
  | 'prescription' | 'document' | 'review'
  | 'completed' | 'cancelled' | 'waiting';

export interface WorkflowStepDefinition {
  order: number;
  statusCode: string;
  label: string;
  /** i18n key: `workflow.step.${templateSlug}.${statusCode}`. Resolved at
   *  render time via the frontend translator; `label` is the English fallback. */
  labelKey?: string;
  description?: string;
  /** Estimated duration for this step — surfaced as
   *  "Results usually ready within X" UX copy. */
  expectedDurationMinutes?: number;
  /** See {@link StepCategory}. Optional; engine derives a fallback at render. */
  category?: StepCategory;
  /** See {@link StepIcon}. Optional; client infers from flags + label. */
  icon?: StepIcon;
  actionsForPatient: StepAction[];
  actionsForProvider: StepAction[];
  flags: StepFlags;
  notifyPatient?: StepNotification | null;
  notifyProvider?: StepNotification | null;
}

export interface TransitionDefinition {
  from: string;
  to: string;
  action: string;
  allowedRoles: ActionRole[];
  conditions?: {
    requiresPayment?: boolean;
    requiresPrescription?: boolean;
    requiresContent?: ContentType;
    maxTimeAfterPrevious?: number;
  };
}

export type ContentType = 'prescription' | 'lab_result' | 'care_notes' | 'report' | 'dental_chart' | 'eye_prescription' | 'meal_plan' | 'exercise_plan';
export type ActionRole = 'patient' | 'provider' | 'system';

/**
 * Template-level service configuration stored as JSON in WorkflowTemplate.serviceConfig.
 *
 * Designed for zero-schema-change extensibility: to add a new lifecycle behaviour,
 * write a new StepFlagHandler, register it with a string key, and add that key here.
 * No DB migration needed.
 *
 * --- Health Shop stock lifecycle ---
 * Only ProviderInventoryItem (Health Shop products) is tracked by the platform.
 * Clinical supplies used during service delivery are the provider's internal concern.
 * Stock management is therefore configured at template level, not per step:
 *
 *   stock.checkOnAcceptance  = true  → verify items are in stock before the order is accepted
 *   stock.subtractOnCompletion = true → deduct items when the order is delivered or collected
 *
 * --- Upfront requirements ---
 * String formats for preflight.requires:
 *   "db:prescription"     → block acceptance if the patient has no active prescription in DB
 *   "input:<ContentType>" → require that content be attached in the acceptance transition
 *
 * --- Completion hooks (legacy/extensibility) ---
 * String formats for onComplete.actions:
 *   Any flag key registered in STEP_FLAG_HANDLERS (kept for backward compat and future handlers)
 */
export interface WorkflowServiceConfig {
  preflight?: {
    requires?: string[]; // ["db:prescription", "input:dental_chart"]
  };
  stock?: {
    /** Verify Health Shop item availability before the order is accepted. */
    checkOnAcceptance?: boolean;
    /** Deduct Health Shop items from provider inventory when the order reaches a terminal success step. */
    subtractOnCompletion?: boolean;
  };
  onComplete?: {
    actions?: string[]; // backward compat / future handlers
  };
}

export interface TransitionInput {
  instanceId?: string;
  bookingId?: string;
  bookingType?: string;
  action: string;
  actionByUserId: string;
  actionByRole: ActionRole;
  notes?: string;
  contentType?: ContentType;
  contentData?: Record<string, unknown>;
  inventoryItems?: { itemId: string; quantity: number }[];
}

export interface TransitionResult {
  success: boolean;
  instanceId: string;
  previousStatus: string;
  currentStatus: string;
  stepLabel: string;
  nextActionsForPatient: StepAction[];
  nextActionsForProvider: StepAction[];
  notification: {
    patientNotificationId?: string;
    providerNotificationId?: string;
  };
  triggeredActions: {
    videoCallId?: string;
    stockCheckResult?: { available: boolean; unavailable?: string[] };
    stockSubtracted?: { itemId: string; newQuantity: number }[];
    paymentProcessed?: { amount: number; patientDebited: number; providerCredited: number };
    refundProcessed?: { amount: number; refundPercent: number };
    conversationId?: string;
    reviewRequestSent?: boolean;
  };
}

export interface WorkflowState {
  instanceId: string;
  templateId: string;
  templateName: string;
  bookingId: string;
  bookingType: string;
  serviceMode: string;
  currentStatus: string;
  currentStepLabel: string;
  currentStepFlags: StepFlags;
  actionsForPatient: StepAction[];
  actionsForProvider: StepAction[];
  isCompleted: boolean;
  isCancelled: boolean;
  startedAt: Date;
  completedAt: Date | null;
  /**
   * Compact map of every step's statusCode → label on the template. Clients
   * use this to render "→ next: <label>" previews on action buttons without
   * a second round-trip. Populated by the engine from the stored template
   * steps; safe to surface because labels are authored per template.
   */
  allSteps: Array<{ statusCode: string; label: string; category: StepCategory }>;
  /** Category of the current step — convenience field for clients that
   *  only care about "where am I?" without scanning allSteps. */
  currentStepCategory: StepCategory;
}

export interface StepFlagResult {
  videoCallId?: string;
  roomCode?: string;
  stockCheckResult?: { available: boolean; unavailable?: string[] };
  stockSubtracted?: { itemId: string; newQuantity: number }[];
  paymentProcessed?: { amount: number; patientDebited: number; providerCredited: number };
  refundProcessed?: { amount: number; refundPercent: number };
  conversationId?: string;
  reviewRequestSent?: boolean;
}

export interface TransitionContext {
  instanceId: string;
  templateId: string;
  bookingId: string;
  bookingType: string;
  patientUserId: string;
  providerUserId: string;
  fromStatus: string | null;
  toStatus: string;
  action: string;
  flags: StepFlags;
  input: TransitionInput;
}

export interface StepFlagHandler {
  /** Registry key — may be a StepFlags key or a service-level handler key (e.g. triggers_stock_check). */
  flag: keyof StepFlags | string;
  validate?(ctx: TransitionContext): Promise<{ valid: boolean; errors: string[] }>;
  execute?(ctx: TransitionContext): Promise<StepFlagResult>;
}

export interface NotificationVariables {
  patientName: string;
  providerName: string;
  providerType: string;
  serviceName: string;
  scheduledAt: string;
  amount: string;
  status: string;
  eta: string;
  bookingId: string;
  actionBy: string;
}

export const BOOKING_TYPE_MODEL_MAP: Record<string, string> = {
  appointment: 'appointment',
  nurse_booking: 'nurseBooking',
  childcare_booking: 'childcareBooking',
  lab_test_booking: 'labTestBooking',
  emergency_booking: 'emergencyBooking',
  service_booking: 'serviceBooking',
};
