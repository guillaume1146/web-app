'use client'

import ProviderWorkflowsPage from '@/components/workflow/ProviderWorkflowsPage'
import { useDashboardUser } from '@/hooks/useDashboardUser'

export default function WorkflowsPage() {
  const user = useDashboardUser()
  return <ProviderWorkflowsPage userType={user?.userType || ''} createHref="/workflows/create" />
}
