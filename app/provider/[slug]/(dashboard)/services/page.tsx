'use client'

import { useParams } from 'next/navigation'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import MyServicesManager from '@/components/dashboard/provider/MyServicesManager'

export default function DynamicServicesPage() {
  const params = useParams()
  const slug = params.slug as string
  const user = useDashboardUser()

  return (
    <MyServicesManager
      providerType={user?.userType?.toUpperCase() ?? ''}
      slug={slug}
    />
  )
}
