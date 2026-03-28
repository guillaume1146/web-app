'use client'

import { useParams } from 'next/navigation'
import ProviderWorkflowsPage from '@/components/workflow/ProviderWorkflowsPage'
import { useDashboardUser } from '@/hooks/useDashboardUser'

export default function DynamicWorkflowsPage() {
  const params = useParams()
  const slug = params.slug as string
  const user = useDashboardUser()

  return (
    <ProviderWorkflowsPage
      userType={user?.userType || slug.toUpperCase().replace(/-/g, '_')}
      createHref={`/provider/${slug}/workflows/create`}
    />
  )
}
