'use client'

import { useState, useEffect, useCallback } from 'react'
import { FiArrowLeft, FiCalendar, FiUser, FiClock } from 'react-icons/fi'
import Link from 'next/link'
import WorkflowTimeline from './WorkflowTimeline'
import WorkflowCurrentStep from './WorkflowCurrentStep'
import WorkflowVideoCallBanner from './WorkflowVideoCallBanner'
import WorkflowContentViewer from './WorkflowContentViewer'

interface BookingWorkflowDetailProps {
 bookingType: string
 bookingId: string
 userRole: 'patient' | 'provider'
 backHref: string
}

interface WorkflowState {
 instanceId: string
 templateName: string
 bookingId: string
 bookingType: string
 serviceMode: string
 currentStatus: string
 currentStepLabel: string
 currentStepFlags: Record<string, unknown>
 actionsForPatient: Array<{ action: string; label: string; targetStatus: string; style?: 'primary' | 'danger' | 'secondary' }>
 actionsForProvider: Array<{ action: string; label: string; targetStatus: string; style?: 'primary' | 'danger' | 'secondary' }>
 isCompleted: boolean
 isCancelled: boolean
 startedAt: string
 completedAt: string | null
}

interface StepLog {
 id: string
 fromStatus: string | null
 toStatus: string
 action: string
 actionByRole: string
 label: string
 message: string | null
 contentType: string | null
 contentData: Record<string, unknown> | null
 triggeredVideoCallId: string | null
 createdAt: string
}

export default function BookingWorkflowDetail({ bookingType, bookingId, userRole, backHref }: BookingWorkflowDetailProps) {
 const [state, setState] = useState<WorkflowState | null>(null)
 const [timeline, setTimeline] = useState<StepLog[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)

 const fetchData = useCallback(async () => {
 try {
 // Find workflow instance by booking
 const instanceRes = await fetch(`/api/workflow/instances?role=${userRole}&bookingType=${bookingType}`)
 const instanceData = await instanceRes.json()

 if (!instanceData.success) {
 setError('Could not load workflow data')
 setLoading(false)
 return
 }

 const instance = (instanceData.data as Array<{ bookingId: string; id: string }>)?.find(
 (i) => i.bookingId === bookingId
 )

 if (!instance) {
 setError('No workflow found for this booking')
 setLoading(false)
 return
 }

 // Fetch state and timeline in parallel
 const [stateRes, timelineRes] = await Promise.all([
 fetch(`/api/workflow/instances/${instance.id}`),
 fetch(`/api/workflow/instances/${instance.id}/timeline`),
 ])

 const [stateData, timelineData] = await Promise.all([stateRes.json(), timelineRes.json()])

 if (stateData.success) setState(stateData.data)
 if (timelineData.success) setTimeline(timelineData.data)
 } catch {
 setError('Failed to load booking details')
 } finally {
 setLoading(false)
 }
 }, [bookingType, bookingId, userRole])

 useEffect(() => {
 fetchData()
 }, [fetchData])

 function handleTransition() {
 // Refresh data after a transition
 fetchData()
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center py-20">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-teal" />
 </div>
 )
 }

 if (error || !state) {
 return (
 <div className="max-w-2xl mx-auto py-10 px-4">
 <Link href={backHref} className="flex items-center gap-2 text-brand-teal hover:text-brand-navy mb-4 text-sm">
 <FiArrowLeft className="w-4 h-4" /> Back
 </Link>
 <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
 <p className="text-yellow-800 font-medium">{error || 'Booking not found'}</p>
 <p className="text-yellow-600 text-sm mt-1">This booking may not have a workflow attached yet.</p>
 </div>
 </div>
 )
 }

 // Find the latest video call ID from timeline
 const latestVideoCallId = [...timeline].reverse().find(s => s.triggeredVideoCallId)?.triggeredVideoCallId

 // Collect content attachments from timeline
 const contentSteps = timeline.filter(s => s.contentType && s.contentData)

 return (
 <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
 {/* Header */}
 <div>
 <Link href={backHref} className="flex items-center gap-2 text-brand-teal hover:text-brand-navy mb-4 text-sm">
 <FiArrowLeft className="w-4 h-4" /> Back to bookings
 </Link>
 <div className="flex items-start justify-between">
 <div>
 <h1 className="text-xl font-bold text-gray-900">{state.templateName}</h1>
 <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
 <span className="flex items-center gap-1"><FiCalendar className="w-4 h-4" /> {new Date(state.startedAt).toLocaleDateString('fr-FR')}</span>
 <span className="flex items-center gap-1"><FiUser className="w-4 h-4" /> {state.serviceMode}</span>
 <span className="flex items-center gap-1"><FiClock className="w-4 h-4" /> {bookingType.replace(/_/g, ' ')}</span>
 </div>
 </div>
 </div>
 </div>

 {/* Video Call Banner */}
 <WorkflowVideoCallBanner videoCallId={latestVideoCallId} currentStatus={state.currentStatus} />

 {/* Current Step + Actions */}
 <WorkflowCurrentStep
 instanceId={state.instanceId}
 currentStatus={state.currentStatus}
 stepLabel={state.currentStepLabel}
 actionsForPatient={state.actionsForPatient}
 actionsForProvider={state.actionsForProvider}
 userRole={userRole}
 isCompleted={state.isCompleted}
 isCancelled={state.isCancelled}
 onTransition={handleTransition}
 />

 {/* Content Attachments */}
 {contentSteps.length > 0 && (
 <div className="space-y-3">
 <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Documents & Content</h2>
 {contentSteps.map((step) => (
 <WorkflowContentViewer
 key={step.id}
 contentType={step.contentType!}
 contentData={step.contentData as Record<string, unknown>}
 />
 ))}
 </div>
 )}

 {/* Timeline */}
 <div>
 <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Workflow History</h2>
 <WorkflowTimeline steps={timeline} currentStatus={state.currentStatus} />
 </div>
 </div>
 )
}
