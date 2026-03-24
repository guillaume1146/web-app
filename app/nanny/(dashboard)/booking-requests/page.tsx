'use client'

import BookingRequestsManager from '@/components/shared/BookingRequestsManager'
import type { BookingRequestConfig } from '@/components/shared/BookingRequestsManager'

const config: BookingRequestConfig = {
 fetchPath: '/api/nannies/{userId}/booking-requests',
 bookingType: 'nanny',
 accentColor: 'purple',
 renderDetails: (booking) => {
 const children = booking.children as string[] | undefined
 const specialInstructions = booking.specialInstructions as string | undefined
 return (
 <>
 {children && children.length > 0 && (
 <p className="text-sm text-gray-600">
 <span className="font-medium">Children:</span> {children.join(', ')}
 </p>
 )}
 {specialInstructions && (
 <p className="text-sm text-gray-600">
 <span className="font-medium">Special Instructions:</span> {specialInstructions}
 </p>
 )}
 </>
 )
 },
}

export default function NannyBookingRequestsPage() {
 return <BookingRequestsManager config={config} />
}
