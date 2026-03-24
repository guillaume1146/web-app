'use client'

import dynamic from 'next/dynamic'
import { useDashboardUser } from '@/hooks/useDashboardUser'

const VideoCallRoomsList = dynamic(() => import('@/components/video/VideoCallRoomsList'), {
 ssr: false,
 loading: () => (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
 </div>
 ),
})

function LoadingSpinner() {
 return (
 <div className="flex items-center justify-center h-full">
 <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
 </div>
 )
}

export default function GenericVideoPage() {
 const user = useDashboardUser()

 if (!user) return <LoadingSpinner />

 return <VideoCallRoomsList currentUser={user} />
}
