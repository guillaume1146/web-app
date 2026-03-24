'use client'

import BotHealthAssistant from '@/app/patient/(dashboard)/components/BotHealthAssistant'

interface AiCoachTabProps {
 userName?: string
 healthScore?: number
}

export default function AiCoachTab({ userName, healthScore }: AiCoachTabProps) {
 return (
 <div className="h-full">
 <BotHealthAssistant userName={userName} healthScore={healthScore} />
 </div>
 )
}
