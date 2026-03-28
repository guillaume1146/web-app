'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import DashboardLoadingState from '@/components/dashboard/DashboardLoadingState'
import { getDynamicProviderSidebarItems, getActiveSectionFromPath } from './sidebar-config'
import { useAuth } from '@/hooks/useAuth'

export default function DynamicProviderLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const slug = params.slug as string
  const { user, isLoading: authLoading, logout } = useAuth()

  const handleLogout = useCallback(async () => {
    await logout()
    router.push('/login')
  }, [logout, router])

  if (authLoading) return <DashboardLoadingState />

  if (!user) {
    router.push('/login')
    return <DashboardLoadingState />
  }

  const sidebarItems = getDynamicProviderSidebarItems(slug)
  const activeSectionId = getActiveSectionFromPath(pathname)

  return (
    <DashboardLayout
      userName={`${user.firstName} ${user.lastName}`}
      userImage={user.profileImage}
      userSubtitle={user.userType?.replace(/_/g, ' ') || slug}
      sidebarItems={sidebarItems}
      activeSectionId={activeSectionId}
      profileHref={`/provider/${slug}/profile`}
      onLogout={handleLogout}
    >
      {children}
    </DashboardLayout>
  )
}
