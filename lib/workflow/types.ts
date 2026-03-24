/**
 * Workflow Engine — Core Type Definitions
 */

// ─── Step Definition (stored in WorkflowTemplate.steps JSON) ────────────────

export interface StepAction {
  action: string          // action code: "accept", "deny", "start", "complete"
  label: string           // button label: "Accepter", "Refuser"
  targetStatus: string    // status to transition to
  style?: 'primary' | 'danger' | 'secondary'
  confirmationRequired?: boolean
}

export interface StepFlags {
  triggers_video_call?: boolean
  triggers_stock_check?: boolean
  triggers_stock_subtract?: boolean
  triggers_payment?: boolean
  triggers_refund?: boolean
  triggers_conversation?: boolean
  triggers_review_request?: boolean
  requires_prescription?: boolean
  requires_content?: ContentType
}

export interface StepNotification {
  title: string
  message: string
}

export interface WorkflowStepDefinition {
  order: number
  statusCode: string
  label: string
  description?: string
  actionsForPatient: StepAction[]
  actionsForProvider: StepAction[]
  flags: StepFlags
  notifyPatient?: StepNotification | null
  notifyProvider?: StepNotification | null
}

// ─── Transition Definition (stored in WorkflowTemplate.transitions JSON) ────

export interface TransitionDefinition {
  from: string
  to: string
  action: string
  allowedRoles: ActionRole[]
  conditions?: {
    requiresPayment?: boolean
    requiresPrescription?: boolean
    requiresContent?: ContentType
    maxTimeAfterPrevious?: number // minutes
  }
}

// ─── Content Types ──────────────────────────────────────────────────────────

export type ContentType =
  | 'prescription'
  | 'lab_result'
  | 'care_notes'
  | 'report'
  | 'dental_chart'
  | 'eye_prescription'
  | 'meal_plan'
  | 'exercise_plan'

export type ActionRole = 'patient' | 'provider' | 'system'

// ─── Transition Input / Output ──────────────────────────────────────────────

export interface TransitionInput {
  instanceId?: string
  bookingId?: string
  bookingType?: string
  action: string
  actionByUserId: string
  actionByRole: ActionRole
  notes?: string
  contentType?: ContentType
  contentData?: Record<string, unknown>
  inventoryItems?: { itemId: string; quantity: number }[]
}

export interface TransitionResult {
  success: boolean
  instanceId: string
  previousStatus: string
  currentStatus: string
  stepLabel: string
  nextActionsForPatient: StepAction[]
  nextActionsForProvider: StepAction[]
  notification: {
    patientNotificationId?: string
    providerNotificationId?: string
  }
  triggeredActions: {
    videoCallId?: string
    stockCheckResult?: { available: boolean; unavailable?: string[] }
    stockSubtracted?: { itemId: string; newQuantity: number }[]
    paymentProcessed?: { amount: number; patientDebited: number; providerCredited: number }
    refundProcessed?: { amount: number; refundPercent: number }
    conversationId?: string
    reviewRequestSent?: boolean
  }
}

// ─── Workflow State (returned by getState) ───────────────────────────────────

export interface WorkflowState {
  instanceId: string
  templateId: string
  templateName: string
  bookingId: string
  bookingType: string
  serviceMode: string
  currentStatus: string
  currentStepLabel: string
  currentStepFlags: StepFlags
  actionsForPatient: StepAction[]
  actionsForProvider: StepAction[]
  isCompleted: boolean
  isCancelled: boolean
  startedAt: Date
  completedAt: Date | null
}

// ─── Step Flag Handler (Strategy Pattern) ───────────────────────────────────

export interface StepFlagResult {
  videoCallId?: string
  stockCheckResult?: { available: boolean; unavailable?: string[] }
  stockSubtracted?: { itemId: string; newQuantity: number }[]
  paymentProcessed?: { amount: number; patientDebited: number; providerCredited: number }
  refundProcessed?: { amount: number; refundPercent: number }
  conversationId?: string
  reviewRequestSent?: boolean
}

export interface TransitionContext {
  instanceId: string
  templateId: string
  bookingId: string
  bookingType: string
  patientUserId: string
  providerUserId: string
  fromStatus: string | null
  toStatus: string
  action: string
  flags: StepFlags
  input: TransitionInput
}

export interface StepFlagHandler {
  flag: keyof StepFlags
  validate?(ctx: TransitionContext): Promise<{ valid: boolean; errors: string[] }>
  execute?(ctx: TransitionContext): Promise<StepFlagResult>
}

// ─── Notification Template Variables ────────────────────────────────────────

export interface NotificationVariables {
  patientName: string
  providerName: string
  providerType: string
  serviceName: string
  scheduledAt: string
  amount: string
  status: string
  eta: string
  bookingId: string
  actionBy: string
}

// ─── Booking Type Map (for syncing status back to booking models) ───────────

export const BOOKING_TYPE_MODEL_MAP: Record<string, string> = {
  appointment: 'appointment',
  nurse_booking: 'nurseBooking',
  childcare_booking: 'childcareBooking',
  lab_test_booking: 'labTestBooking',
  emergency_booking: 'emergencyBooking',
  service_booking: 'serviceBooking',
}
