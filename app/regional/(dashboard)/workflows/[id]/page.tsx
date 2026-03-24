'use client'

import { use, useState, useEffect } from 'react'
import WorkflowBuilder from '@/components/workflow/builder/WorkflowBuilder'
import { DashboardLoadingState } from '@/components/dashboard'

export default function EditWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [template, setTemplate] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/workflow/templates/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setTemplate(data.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <DashboardLoadingState />
  if (!template) return <div className="p-8 text-center text-gray-500">Template not found</div>

  return (
    <WorkflowBuilder
      backHref="/regional/workflows"
      initialData={{
        id: template.id as string,
        name: template.name as string,
        slug: template.slug as string,
        description: (template.description as string) || '',
        providerType: template.providerType as string,
        serviceMode: template.serviceMode as string,
        steps: template.steps as never[],
        transitions: template.transitions as never[],
      }}
    />
  )
}
