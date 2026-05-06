'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirects to /search/organizations (renamed from clinics)
export default function LegacyClinicsSearchRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/search/organizations') }, [router])
  return null
}
