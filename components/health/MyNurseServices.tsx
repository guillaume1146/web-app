'use client'

import { useCallback } from 'react'
import { FaUserNurse } from 'react-icons/fa'
import HealthSectionList from './HealthSectionList'

export default function MyNurseServices() {
 const mapData = useCallback((data: unknown[]) =>
 (data as { id: string; bookingType: string; providerName: string; serviceName?: string; scheduledAt: string; status: string; price?: number | null }[])
 .filter(b => b.bookingType === 'nurse_booking')
 .map(b => ({
 id: b.id,
 title: b.providerName || 'Nurse',
 subtitle: b.serviceName || 'Nurse Visit',
 date: new Date(b.scheduledAt).toLocaleDateString() + ' ' + new Date(b.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 status: b.status,
 price: b.price,
 })), [])

 return <HealthSectionList title="Nurse Services" icon={FaUserNurse} apiUrl="/api/bookings/unified?role=patient" mapData={mapData} emptyMessage="No nurse bookings yet." />
}
