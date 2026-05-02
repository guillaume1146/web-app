'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'

export default function InventoryRedirectPage() {
  const router = useRouter()
  const { user, loading } = useUser()

  useEffect(() => {
    if (loading) return
    if (user) {
      // Redirect to the provider's inventory under their slug
      const slug = user.id?.toLowerCase().replace(/_/g, '-') || user.id
      router.replace(`/provider/${slug}/inventory`)
    } else {
      router.replace('/login')
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#0C6780] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
