'use client'

import { useCallback } from 'react'
import { FaFileAlt } from 'react-icons/fa'
import HealthSectionList from './HealthSectionList'

export default function MyHealthRecords() {
 const mapData = useCallback((data: unknown[]) =>
 (data as { id: string; createdAt: string; diagnosis?: string; notes?: string; doctor?: { user?: { firstName: string; lastName: string } } }[]).map(r => ({
 id: r.id,
 title: r.diagnosis || 'Medical Record',
 subtitle: `Dr. ${r.doctor?.user?.firstName ?? ''} ${r.doctor?.user?.lastName ?? ''}`.trim(),
 date: new Date(r.createdAt).toLocaleDateString(),
 status: 'recorded',
 })), [])

 return <HealthSectionList title="Health Records" icon={FaFileAlt} apiUrl="/api/patients/{userId}/medical-records" mapData={mapData} />
}
