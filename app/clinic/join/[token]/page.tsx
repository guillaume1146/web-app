'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Redirects to /organization/join/:token (renamed from clinic)
export default function LegacyClinicJoinRedirect() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  useEffect(() => { router.replace(`/organization/join/${token}`) }, [router, token])
  return null
}
