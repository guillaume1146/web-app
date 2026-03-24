'use client'

import WorkflowActionButton from './WorkflowActionButton'

interface StepAction {
 action: string
 label: string
 targetStatus: string
 style?: 'primary' | 'danger' | 'secondary'
 confirmationRequired?: boolean
}

interface WorkflowCurrentStepProps {
 instanceId: string
 currentStatus: string
 stepLabel: string
 actionsForPatient: StepAction[]
 actionsForProvider: StepAction[]
 userRole: 'patient' | 'provider'
 isCompleted: boolean
 isCancelled: boolean
 onTransition?: (result: unknown) => void
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
 pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
 confirmed: { bg: 'bg-blue-100', text: 'text-blue-800' },
 in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
 in_consultation: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
 in_call: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
 completed: { bg: 'bg-green-100', text: 'text-green-800' },
 resolved: { bg: 'bg-green-100', text: 'text-green-800' },
 cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
 provider_travelling: { bg: 'bg-orange-100', text: 'text-orange-800' },
 provider_arrived: { bg: 'bg-teal-100', text: 'text-teal-800' },
 call_ready: { bg: 'bg-purple-100', text: 'text-purple-800' },
}

export default function WorkflowCurrentStep({
 instanceId,
 currentStatus,
 stepLabel,
 actionsForPatient,
 actionsForProvider,
 userRole,
 isCompleted,
 isCancelled,
 onTransition,
}: WorkflowCurrentStepProps) {
 const actions = userRole === 'patient' ? actionsForPatient : actionsForProvider
 const badge = STATUS_BADGE[currentStatus] || { bg: 'bg-gray-100', text: 'text-gray-800' }

 return (
 <div className="bg-white rounded-xl border border-gray-200 p-5">
 <div className="flex items-center justify-between mb-4">
 <div>
 <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Status</p>
 <h3 className="text-lg font-semibold text-gray-900 mt-1">{stepLabel}</h3>
 </div>
 <span className={`${badge.bg} ${badge.text} px-3 py-1 rounded-full text-sm font-medium`}>
 {currentStatus.replace(/_/g, ' ')}
 </span>
 </div>

 {isCompleted && (
 <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg mb-4">
 <div className="w-2 h-2 rounded-full bg-green-500" />
 <span className="text-sm text-green-700 font-medium">This workflow is complete</span>
 </div>
 )}

 {isCancelled && (
 <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg mb-4">
 <div className="w-2 h-2 rounded-full bg-red-500" />
 <span className="text-sm text-red-700 font-medium">This booking has been cancelled</span>
 </div>
 )}

 {actions.length > 0 && !isCompleted && !isCancelled && (
 <div className="flex flex-wrap gap-2">
 {actions.map((action) => (
 <WorkflowActionButton
 key={action.action}
 action={action}
 instanceId={instanceId}
 onTransition={onTransition}
 />
 ))}
 </div>
 )}

 {actions.length === 0 && !isCompleted && !isCancelled && (
 <p className="text-sm text-gray-400">Waiting for the other party to take action...</p>
 )}
 </div>
 )
}
