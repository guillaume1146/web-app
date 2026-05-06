'use client'

import BookingsDashboard from '@/components/bookings/BookingsDashboard'
import { useAuth } from '@/hooks/useAuth'

export default function PatientBookingsPage() {
  const { user } = useAuth()
  return (
    <BookingsDashboard
      userId={user?.id ?? ''}
      role="patient"
      userType="Member"
      basePath="/patient"
    />
  )
}
