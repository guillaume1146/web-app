'use client'

import { useState } from 'react'
import WorkflowBuilder from '@/components/workflow/builder/WorkflowBuilder'
import WorkflowWizard, { type GeneratedTemplate } from '@/components/workflow/builder/WorkflowWizard'

type WizardData = {
  name: string
  description: string
  serviceMode: string
  steps: unknown[]
  transitions: unknown[]
  serviceConfig: Record<string, unknown>
  paymentTiming: string
}

export default function CreateWorkflowPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [wizardData, setWizardData] = useState<WizardData | null>(null)

  function handleWizardComplete(generated: GeneratedTemplate) {
    setWizardData({
      name: generated.name,
      description: generated.description,
      serviceMode: generated.serviceMode,
      steps: generated.steps,
      transitions: generated.transitions,
      serviceConfig: generated.serviceConfig,
      paymentTiming: generated.paymentTiming,
    })
    setShowWizard(false)
  }

  if (showWizard) {
    return (
      <div className="p-6">
        <WorkflowWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      </div>
    )
  }

  return (
    <WorkflowBuilder
      backHref="/regional/workflows"
      showAdminFields
      wizardData={wizardData}
      onRequestWizard={() => setShowWizard(true)}
    />
  )
}
