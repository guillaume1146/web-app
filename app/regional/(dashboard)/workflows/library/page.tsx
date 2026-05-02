'use client'

import { useEffect, useState } from 'react'
import WorkflowLibrary from '@/components/workflow/WorkflowLibrary'

export default function RegionalWorkflowLibraryPage() {
  const [userId, setUserId] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j?.user?.id) setUserId(j.user.id) })
      .catch(() => {})
  }, [])

  return <WorkflowLibrary builderPathBase="/regional/workflows" currentUserId={userId} />
}
