'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'

export default function ProfilePage() {
  const { user } = useUser()
  const router = useRouter()
  useEffect(() => {
    if (user?.id) router.replace(`/profile/${user.id}`)
  }, [user?.id, router])
  return null
}
