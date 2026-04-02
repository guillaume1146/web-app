'use client'

import dynamic from 'next/dynamic'
import { useUser } from '@/hooks/useUser'

const BotHealthAssistant = dynamic(
  () => import('@/app/patient/(dashboard)/components/BotHealthAssistant'),
  { ssr: false }
)

export default function AiAssistantPage() {
  const { user } = useUser()

  return (
    <div className="h-[calc(100vh-120px)]">
      <BotHealthAssistant
        userName={user?.firstName}
        healthScore={undefined}
      />
    </div>
  )
}
