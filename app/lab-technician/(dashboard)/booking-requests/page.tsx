'use client'

import BookingRequestsManager from '@/components/shared/BookingRequestsManager'
import type { BookingRequestConfig } from '@/components/shared/BookingRequestsManager'
import { FaFlask } from 'react-icons/fa'

const config: BookingRequestConfig = {
 fetchPath: '/api/lab-techs/{userId}/booking-requests',
 bookingType: 'lab_test',
 accentColor: 'cyan',
 renderDetails: (booking) => {
 const testName = booking.testName as string | undefined
 const sampleType = booking.sampleType as string | undefined
 const price = booking.price as number | undefined
 const notes = booking.notes as string | undefined
 return (
 <>
 {testName && (
 <span className="inline-flex items-center rounded-full bg-cyan-100 text-cyan-800 px-2.5 py-0.5 text-xs font-medium">
 <FaFlask className="mr-1" /> {testName}
 </span>
 )}
 {sampleType && (
 <p className="text-sm text-gray-600">
 <span className="font-medium">Sample Type:</span> {sampleType}
 </p>
 )}
 {price && (
 <p className="text-sm text-gray-600">
 <span className="font-medium">Price:</span> Rs {price}
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

export default function LabTechBookingRequestsPage() {
 return <BookingRequestsManager config={config} />
}
