'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MyInsuranceCompanyIndex() {
  const router = useRouter()
  useEffect(() => { router.replace('/my-insurance-company/analytics') }, [router])
  return null
}
