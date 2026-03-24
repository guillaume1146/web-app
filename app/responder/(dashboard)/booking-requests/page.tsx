'use client'

import BookingRequestsManager from '@/components/shared/BookingRequestsManager'
import type { BookingRequestConfig } from '@/components/shared/BookingRequestsManager'
import { FaExclamationTriangle, FaMapMarkerAlt } from 'react-icons/fa'

const priorityBadge: Record<string, string> = {
 critical: 'bg-red-100 text-red-800',
 high: 'bg-orange-100 text-orange-800',
 medium: 'bg-yellow-100 text-yellow-800',
 low: 'bg-green-100 text-green-800',
}

const config: BookingRequestConfig = {
 fetchPath: '/api/responders/{userId}/booking-requests',
 bookingType: 'emergency',
 accentColor: 'red',
 renderDetails: (booking) => {
 const priority = booking.priority as string | undefined
 const emergencyType = booking.emergencyType as string | undefined
 const location = booking.location as string | undefined
 const contactNumber = booking.contactNumber as string | undefined
 const notes = booking.notes as string | undefined
 return (
 <>
 <div className="flex flex-wrap items-center gap-2">
 {priority && (
 <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityBadge[priority] || 'bg-gray-100 text-gray-800'}`}>
 <FaExclamationTriangle className="mr-1" /> {priority}
 </span>
 )}
 {emergencyType && (
 <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 px-2.5 py-0.5 text-xs font-medium">
 {emergencyType}
 </span>
 )}
 </div>
 {location && (
 <p className="text-sm text-gray-600">
 <span className="font-medium inline-flex items-center gap-1">
 <FaMapMarkerAlt className="text-xs" /> Location:
 </span>{' '}
 {location}
 </p>
 )}
 {contactNumber && (
 <p className="text-sm text-gray-600">
 <span className="font-medium">Contact:</span> {contactNumber}
 </p>
 )}
 {notes && (
 <p className="text-sm text-gray-600">
 <span className="font-medium">Notes:</span> {notes}
 </p>
 )}
 </>
 )
 },
}

export default function ResponderBookingRequestsPage() {
 return <BookingRequestsManager config={config} />
}
