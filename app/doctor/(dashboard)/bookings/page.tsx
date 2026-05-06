'use client'

import BookingsDashboard from '@/components/bookings/BookingsDashboard'
import { useAuth } from '@/hooks/useAuth'

export default function DoctorBookingsPage() {
  const { user } = useAuth()
  return (
    <BookingsDashboard
      userId={user?.id ?? ''}
      role="provider"
      userType="Doctor"
      basePath="/doctor"
    />
  )
}
