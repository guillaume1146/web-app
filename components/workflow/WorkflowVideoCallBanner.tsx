'use client'

import { FiVideo } from 'react-icons/fi'
import Link from 'next/link'

interface WorkflowVideoCallBannerProps {
 videoCallId: string | null | undefined
 currentStatus: string
}

const VIDEO_STATUSES = ['call_ready', 'in_call']

export default function WorkflowVideoCallBanner({ videoCallId, currentStatus }: WorkflowVideoCallBannerProps) {
 if (!videoCallId || !VIDEO_STATUSES.includes(currentStatus)) return null

 return (
 <div className="bg-brand-navy text-white rounded-xl p-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="bg-white/20 p-2 rounded-lg">
 <FiVideo className="w-5 h-5" />
 </div>
 <div>
 <p className="font-semibold text-sm">Video Call Available</p>
 <p className="text-brand-sky text-xs">The video room is ready. Join now.</p>
 </div>
 </div>
 <Link
 href={`/video/${videoCallId}`}
 className="bg-white text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-sky-50 transition-colors"
 >
 Join Call
 </Link>
 </div>
 )
}
