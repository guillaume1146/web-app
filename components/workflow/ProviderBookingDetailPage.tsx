'use client'

import { use } from 'react'
import BookingWorkflowDetail from './BookingWorkflowDetail'

interface Props {
 params: Promise<{ type: string; id: string }>
 backHref: string
}

export default function ProviderBookingDetailPage({ params, backHref }: Props) {
 const { type, id } = use(params)

 return (
 <BookingWorkflowDetail
 bookingType={type}
 bookingId={id}
 userRole="provider"
 backHref={backHref}
 />
 )
}
