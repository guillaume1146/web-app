'use client'

import { useCallback } from 'react'
import { FaFlask } from 'react-icons/fa'
import HealthSectionList from './HealthSectionList'

export default function MyLabResults() {
  const mapData = useCallback((data: unknown[]) =>
    (data as { id: string; testName?: string; scheduledAt?: string; createdAt?: string; status: string; price?: number }[]).map(t => ({
      id: t.id,
      title: t.testName || 'Lab Test',
      date: new Date(t.scheduledAt || t.createdAt || '').toLocaleDateString(),
      status: t.status,
      price: t.price,
    })), [])

  return <HealthSectionList title="Lab Results" icon={FaFlask} apiUrl="/api/patients/{userId}/lab-tests" mapData={mapData} emptyMessage="No lab tests yet." />
}
