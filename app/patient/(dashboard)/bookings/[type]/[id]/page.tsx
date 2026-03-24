'use client'

import { use } from 'react'
import BookingWorkflowDetail from '@/components/workflow/BookingWorkflowDetail'

export default function PatientBookingDetailPage({
 params,
}: {
 params: Promise<{ type: string; id: string }>
}) {
 const { type, id } = use(params)

 return (
 <BookingWorkflowDetail
 bookingType={type}
 bookingId={id}
 userRole="patient"
 backHref="/patient/bookings"
 />
 )
}
