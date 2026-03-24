'use client'

import dynamic from 'next/dynamic'
import { useDashboardUser } from '@/hooks/useDashboardUser'

const VideoConsultation = dynamic(() => import('@/components/video/VideoConsultation'), { ssr: false })

export default function VideoPage() {
 const user = useDashboardUser()
 if (!user) return null
 return <VideoConsultation currentUser={{ id: user.id, firstName: user.firstName, lastName: user.lastName, userType: user.userType, upcomingAppointments: [] }} />
}
