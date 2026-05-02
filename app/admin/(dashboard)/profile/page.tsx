'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardUser } from '@/hooks/useDashboardUser'

export default function AdminProfilePage() {
  const user = useDashboardUser()
  const router = useRouter()
  useEffect(() => {
    if (user?.id) router.replace(`/profile/${user.id}`)
  }, [user?.id, router])
  return null
}
