'use client'

import { useCallback } from 'react'
import { FaAmbulance } from 'react-icons/fa'
import HealthSectionList from './HealthSectionList'

export default function MyEmergency() {
 const mapData = useCallback((data: unknown[]) =>
 (data as { id: string; bookingType: string; providerName: string; serviceName?: string; scheduledAt: string; status: string }[])
 .filter(b => b.bookingType === 'emergency')
 .map(b => ({
 id: b.id,
 title: b.serviceName || 'Emergency',
 subtitle: b.providerName,
 date: new Date(b.scheduledAt).toLocaleDateString() + ' ' + new Date(b.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 status: b.status,
 })), [])

 return <HealthSectionList title="Emergency Services" icon={FaAmbulance} apiUrl="/api/bookings/unified?role=patient" mapData={mapData} emptyMessage="No emergency bookings." />
}
