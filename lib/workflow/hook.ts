/**
 * Workflow Hook — integrates startWorkflow() into existing booking creation flows.
 *
 * Call this AFTER a booking is created to attach a workflow instance.
 * Non-blocking: if workflow creation fails, the booking still works.
 */
import { startWorkflow } from './engine'

// Import strategies to ensure they're registered
import './strategies'

const BOOKING_TYPE_MAP: Record<string, string> = {
  doctor: 'appointment',
  nurse: 'nurse_booking',
  nanny: 'childcare_booking',
  'lab-test': 'lab_test_booking',
  emergency: 'emergency_booking',
  service: 'service_booking',
}

const SERVICE_MODE_MAP: Record<string, 'office' | 'home' | 'video'> = {
  video: 'video',
  in_person: 'office',
  home_visit: 'home',
  office: 'office',
  home: 'home',
}

interface AttachWorkflowParams {
  bookingId: string
  bookingRoute: string // 'doctor', 'nurse', 'nanny', 'lab-test', 'emergency', 'service'
  patientUserId: string
  providerUserId: string
  providerType: string // 'DOCTOR', 'NURSE', etc.
  consultationType?: string // 'video', 'in_person', 'home_visit'
  servicePrice?: number
  platformServiceId?: string | null
  regionCode?: string | null
}

/**
 * Attach a workflow instance to a newly created booking.
 * Safe to call — won't throw. Logs warnings on failure.
 */
export async function attachWorkflow(params: AttachWorkflowParams): Promise<{
  workflowInstanceId?: string
  workflowError?: string
}> {
  try {
    const bookingType = BOOKING_TYPE_MAP[params.bookingRoute] || params.bookingRoute
    const serviceMode = SERVICE_MODE_MAP[params.consultationType || 'office'] || 'office'

    const result = await startWorkflow({
      bookingId: params.bookingId,
      bookingType,
      platformServiceId: params.platformServiceId,
      providerUserId: params.providerUserId,
      providerType: params.providerType,
      patientUserId: params.patientUserId,
      serviceMode,
      regionCode: params.regionCode,
      metadata: params.servicePrice ? { servicePrice: params.servicePrice } : undefined,
    })

    if (result.success) {
      return { workflowInstanceId: result.instanceId }
    }

    // No template found — not an error, just no workflow attached
    console.warn(`Workflow not attached to ${bookingType}/${params.bookingId}: ${result.error}`)
    return { workflowError: result.error }
  } catch (error) {
    console.warn(`Failed to attach workflow to ${params.bookingRoute}/${params.bookingId}:`, error)
    return { workflowError: error instanceof Error ? error.message : 'Unknown error' }
  }
}
