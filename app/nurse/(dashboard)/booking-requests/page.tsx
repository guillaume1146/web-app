'use client'

import BookingRequestsManager from '@/components/shared/BookingRequestsManager'
import type { BookingRequestConfig } from '@/components/shared/BookingRequestsManager'

const config: BookingRequestConfig = {
 fetchPath: '/api/nurses/{userId}/booking-requests',
 bookingType: 'nurse',
 accentColor: 'teal',
}

export default function NurseBookingRequestsPage() {
 return <BookingRequestsManager config={config} />
}
