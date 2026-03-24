'use client'

import { usePatientData } from '../context'
import BillingDashboard from '@/components/billing/BillingDashboard'

export default function PatientBillingPage() {
 const user = usePatientData()
 return <BillingDashboard userId={user.id} />
}
