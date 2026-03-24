'use client'

import { useCallback } from 'react'
import { FaBaby } from 'react-icons/fa'
import HealthSectionList from './HealthSectionList'

export default function MyChildcare() {
 const mapData = useCallback((data: unknown[]) =>
 (data as { id: string; bookingType: string; providerName: string; serviceName?: string; scheduledAt: string; status: string; price?: number | null }[])
 .filter(b => b.bookingType === 'childcare')
 .map(b => ({
 id: b.id,
 title: b.providerName || 'Nanny',
 subtitle: b.serviceName || 'Childcare',
 date: new Date(b.scheduledAt).toLocaleDateString() + ' ' + new Date(b.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 status: b.status,
 price: b.price,
 })), [])

 return <HealthSectionList title="Childcare" icon={FaBaby} apiUrl="/api/bookings/unified?role=patient" mapData={mapData} emptyMessage="No childcare bookings yet." />
}
