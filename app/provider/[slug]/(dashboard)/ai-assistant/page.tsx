'use client'

import HealthTrackerTabs from '@/components/health-tracker/HealthTrackerTabs'
import { useUser } from '@/hooks/useUser'

export default function AiAssistantPage() {
  const { user } = useUser()
  return <HealthTrackerTabs userName={user?.firstName} />
}
