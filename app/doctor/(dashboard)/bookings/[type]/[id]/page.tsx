'use client'

import { use } from 'react'
import BookingWorkflowDetail from '@/components/workflow/BookingWorkflowDetail'

export default function DoctorBookingDetailPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>
}) {
  const { type, id } = use(params)
  return (
    <BookingWorkflowDetail
      bookingType={type}
      bookingId={id}
      userRole="provider"
      backHref="/doctor/bookings"
    />
  )
}
