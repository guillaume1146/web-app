'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import WorkflowLibrary from '@/components/workflow/WorkflowLibrary'

export default function ProviderWorkflowLibraryPage() {
  const params = useParams<{ slug: string }>()
  const [userId, setUserId] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j?.user?.id) setUserId(j.user.id) })
      .catch(() => {})
  }, [])

  return (
    <WorkflowLibrary
      builderPathBase={`/provider/${params.slug}/workflows`}
      currentUserId={userId}
    />
  )
}
