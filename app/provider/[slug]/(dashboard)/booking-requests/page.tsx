'use client'

import BookingRequestsManager from '@/components/shared/BookingRequestsManager'
import type { BookingRequestConfig } from '@/components/shared/BookingRequestsManager'

const config: BookingRequestConfig = {
  fetchPath: '/api/bookings/unified?role=provider',
  bookingType: 'doctor',
  accentColor: 'blue',
}

export default function BookingRequestsPage() {
  return <BookingRequestsManager config={config} />
}
