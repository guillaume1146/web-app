'use client'

import { useState } from 'react'

interface StepAction {
 action: string
 label: string
 targetStatus: string
 style?: 'primary' | 'danger' | 'secondary'
 confirmationRequired?: boolean
}

interface WorkflowActionButtonProps {
 action: StepAction
 instanceId: string
 onTransition?: (result: unknown) => void
 disabled?: boolean
}

const STYLE_MAP = {
 primary: 'bg-brand-navy hover:bg-brand-teal text-white',
 danger: 'bg-red-500 hover:bg-red-600 text-white',
 secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
}

export default function WorkflowActionButton({ action, instanceId, onTransition, disabled }: WorkflowActionButtonProps) {
 const [loading, setLoading] = useState(false)
 const [showConfirm, setShowConfirm] = useState(false)

 const style = STYLE_MAP[action.style || 'secondary']

 async function handleClick() {
 if (action.confirmationRequired || action.style === 'danger') {
 setShowConfirm(true)
 return
 }
 await executeTransition()
 }

 async function executeTransition() {
 setLoading(true)
 setShowConfirm(false)
 try {
 const res = await fetch('/api/workflow/transition', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 instanceId,
 action: action.action,
 }),
 })
 const data = await res.json()
 if (data.success) {
 onTransition?.(data.data)
 } else {
 alert(data.message || 'Action failed')
 }
 } catch {
 alert('Network error')
 } finally {
 setLoading(false)
 }
 }

 return (
 <>
 <button
 onClick={handleClick}
 disabled={disabled || loading}
 className={`${style} px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 {loading ? 'Processing...' : action.label}
 </button>

 {showConfirm && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
 <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
 <h3 className="text-lg font-semibold text-gray-900">Confirm Action</h3>
 <p className="mt-2 text-sm text-gray-600">
 Are you sure you want to &quot;{action.label}&quot;? This action cannot be undone.
 </p>
 <div className="mt-4 flex gap-3 justify-end">
 <button
 onClick={() => setShowConfirm(false)}
 className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700"
 >
 Cancel
 </button>
 <button
 onClick={executeTransition}
 className={`${style} px-4 py-2 rounded-lg text-sm font-medium`}
 >
 {loading ? 'Processing...' : 'Confirm'}
 </button>
 </div>
 </div>
 </div>
 )}
 </>
 )
}
