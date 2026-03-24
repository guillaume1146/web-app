'use client'

import { useCallback } from 'react'
import { FaShieldAlt } from 'react-icons/fa'
import HealthSectionList from './HealthSectionList'

export default function MyInsurance() {
 const mapData = useCallback((data: unknown[]) =>
 (data as { id: string; claimType?: string; amount?: number; createdAt: string; status: string; description?: string }[]).map(c => ({
 id: c.id,
 title: c.claimType || c.description || 'Insurance Claim',
 date: new Date(c.createdAt).toLocaleDateString(),
 status: c.status,
 price: c.amount,
 })), [])

 return <HealthSectionList title="Insurance Claims" icon={FaShieldAlt} apiUrl="/api/patients/{userId}/claims" mapData={mapData} emptyMessage="No insurance claims yet." />
}
