'use client'

import { useDashboardUser } from '@/hooks/useDashboardUser'
import HealthTrackerTabs from '@/components/health-tracker/HealthTrackerTabs'

export default function AiAssistantPage() {
 const user = useDashboardUser()
 return <HealthTrackerTabs userName={user?.firstName} healthScore={50} />
}
