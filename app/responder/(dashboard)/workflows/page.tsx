'use client'
import ProviderWorkflowsPage from '@/components/workflow/ProviderWorkflowsPage'
const TYPE_MAP: Record<string, string> = { doctor: 'DOCTOR', nurse: 'NURSE', nanny: 'NANNY', pharmacist: 'PHARMACIST', 'lab-technician': 'LAB_TECHNICIAN', responder: 'EMERGENCY_WORKER', caregiver: 'CAREGIVER', physiotherapist: 'PHYSIOTHERAPIST', dentist: 'DENTIST', optometrist: 'OPTOMETRIST', nutritionist: 'NUTRITIONIST' }
export default function WorkflowsPage() {
  return <ProviderWorkflowsPage userType={TYPE_MAP['responder'] || 'DOCTOR'} createHref="/responder/workflows/create" />
}
