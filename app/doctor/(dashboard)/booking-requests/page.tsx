'use client'

import BookingRequestsManager from '@/components/shared/BookingRequestsManager'
import type { BookingRequestConfig } from '@/components/shared/BookingRequestsManager'

const config: BookingRequestConfig = {
 fetchPath: '/api/doctors/{userId}/booking-requests',
 bookingType: 'doctor',
 accentColor: 'blue',
}

export default function DoctorBookingRequestsPage() {
 return <BookingRequestsManager config={config} />
}
