'use client'

import { useParams } from 'next/navigation'
import UnifiedPracticePage from '@/components/shared/UnifiedPracticePage'

export default function DynamicProviderDashboard() {
  const params = useParams()
  const slug = params.slug as string

  return (
    <div className="space-y-6">
      <UnifiedPracticePage />
    </div>
  )
}
