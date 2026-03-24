'use client'

import ProviderBookingDetailPage from '@/components/workflow/ProviderBookingDetailPage'

export default function BookingDetailPage({
 params,
}: {
 params: Promise<{ type: string; id: string }>
}) {
 return (
 <ProviderBookingDetailPage
 params={params}
 backHref="/lab-technician/booking-requests"
 />
 )
}
