'use client'

import { useCallback } from 'react'
import { FaStethoscope } from 'react-icons/fa'
import HealthSectionList from './HealthSectionList'

export default function MyConsultations() {
 const mapData = useCallback((data: unknown[]) =>
 (data as { id: string; scheduledAt: string; status: string; specialty?: string; serviceName?: string; servicePrice?: number; doctor?: { user?: { firstName: string; lastName: string } } }[]).map(a => ({
 id: a.id,
 title: `Dr. ${a.doctor?.user?.firstName ?? ''} ${a.doctor?.user?.lastName ?? ''}`.trim() || 'Doctor',
 subtitle: a.specialty || a.serviceName || 'Consultation',
 date: new Date(a.scheduledAt).toLocaleDateString() + ' ' + new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 status: a.status,
 price: a.servicePrice,
 })), [])

 return <HealthSectionList title="Doctor Consultations" icon={FaStethoscope} apiUrl="/api/patients/{userId}/appointments" mapData={mapData} defaultProviderType="DOCTOR" />
}
