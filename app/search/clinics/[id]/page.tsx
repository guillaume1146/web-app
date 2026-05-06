'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Redirects to /search/organizations/:id (renamed from clinics)
export default function LegacyClinicDetailRedirect() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  useEffect(() => { router.replace(`/search/organizations/${id}`) }, [router, id])
  return null
}
