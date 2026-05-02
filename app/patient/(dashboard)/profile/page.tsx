'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePatientData } from '../context'

/**
 * Redirects to the unified `/profile/[id]` page. The per-user-type profile
 * routes (`/patient/profile`, `/doctor/profile`, etc.) used to render their
 * own sprawling profile UI; we centralised everything into a single
 * Facebook/LinkedIn-style page and kept this stub so existing sidebar
 * links and bookmarks keep working.
 */
export default function PatientProfilePage() {
  const user = usePatientData()
  const router = useRouter()
  useEffect(() => {
    router.replace(`/profile/${user.id}`)
  }, [user.id, router])
  return null
}
