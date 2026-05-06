'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Redirects to /organization/:id/manage (renamed from clinic)
export default function LegacyClinicManageRedirect() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  useEffect(() => { router.replace(`/organization/${id}/manage`) }, [router, id])
  return null
}
