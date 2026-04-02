'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { DashboardLayout, DashboardLoadingState, DashboardErrorState } from '@/components/dashboard'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'
import { useUser } from '@/hooks/useUser'
import { useDynamicSearchItems } from '@/hooks/useDynamicSearchItems'
import { useRoleFeatureConfig, filterSidebarByFeatures } from '@/hooks/useRoleFeatureConfig'

interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
  profileImage?: string | null
  userType: string
}

interface DashboardLayoutConfig {
  /** Display label for the user type (e.g. 'Patient', 'Doctor', 'Nurse') */
  userSubtitle: string
  /** Sidebar navigation items for this role */
  sidebarItems: SidebarItem[]
  /** Function to resolve active sidebar section from pathname */
  getActiveSectionFromPath: (pathname: string) => string
  /** Link to profile page (e.g. '/patient/profile') */
  profileHref?: string
  /** Link to network/connections page (e.g. '/patient/network') */
  networkHref?: string
  /** @deprecated Use profileHref instead */
  settingsHref?: string
  /** Optional name prefix (e.g. 'Dr.' for doctors) */
  namePrefix?: string
  /** Optional context provider wrapping children (e.g. PatientDashboardProvider) */
  ContextProvider?: React.ComponentType<{ userData: any; children: React.ReactNode }>
  /** Optional callback to fetch additional data after auth (e.g. patient appointments) */
  fetchDashboardData?: (baseData: UserData) => Promise<any>
  /** Base path for dynamic search links (e.g. '/patient'). When set, replaces static search items with DB-driven roles. */
  dynamicSearchBasePath?: string
}

/**
 * Factory function that creates a dashboard layout component for any user type.
 * Eliminates the ~40 lines of boilerplate duplicated across all 12 layout files.
 *
 * @example
 * // app/nurse/(dashboard)/layout.tsx
 * export default createDashboardLayout({
 *   userSubtitle: 'Nurse',
 *   sidebarItems: NURSE_SIDEBAR_ITEMS,
 *   getActiveSectionFromPath,
 *   settingsHref: '/nurse/settings',
 * })
 */
export function createDashboardLayout(config: DashboardLayoutConfig) {
  const {
    userSubtitle,
    sidebarItems,
    getActiveSectionFromPath,
    profileHref,
    networkHref,
    settingsHref,
    namePrefix,
    ContextProvider,
    fetchDashboardData,
    dynamicSearchBasePath,
  } = config

  return function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
    const { user: hookUser, loading: userLoading, clearUser } = useUser()
    const [userData, setUserData] = useState<UserData | null>(null)
    const [contextData, setContextData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const pathname = usePathname()

    const loadExtraData = useCallback(async (baseData: UserData) => {
      if (!fetchDashboardData) return
      try {
        const extra = await fetchDashboardData(baseData)
        if (extra) setContextData(extra)
      } catch {
        // Silently fall back to base data
      }
    }, [])

    useEffect(() => {
      if (userLoading) return
      if (hookUser) {
        const parsed = hookUser as UserData
        setUserData(parsed)
        setContextData(parsed)
        setLoading(false)
        loadExtraData(parsed)
      } else {
        // Redirect silently — don't show error state during logout
        router.push('/login')
      }
    }, [hookUser, userLoading, router, loadExtraData])

    const handleLogout = () => {
      clearUser()
      router.push('/login')
    }

    // Must call hooks before any early returns (React rules of hooks)
    const dynamicSearch = useDynamicSearchItems(dynamicSearchBasePath || '')
    const featureConfig = useRoleFeatureConfig(hookUser?.userType)

    if (loading) return <DashboardLoadingState />
    if (error || !userData) return <DashboardErrorState message={error} />

    const displayName = namePrefix
      ? `${namePrefix} ${userData.firstName} ${userData.lastName}`
      : `${userData.firstName} ${userData.lastName}`

    // Replace static search items with dynamic DB-driven ones if configured
    let finalSidebarItems = sidebarItems
    if (dynamicSearchBasePath && dynamicSearch.length > 0) {
      // Remove static search items (ids starting with 'search-' or divider-search)
      const coreItems = sidebarItems.filter(
        item => !item.id.startsWith('search-') && item.id !== 'divider-search'
      )
      finalSidebarItems = [...coreItems, ...dynamicSearch]
    }

    // Filter sidebar items based on role feature config (admin-configurable)
    finalSidebarItems = filterSidebarByFeatures(finalSidebarItems, featureConfig)

    const content = (
      <DashboardLayout
        userName={displayName}
        userSubtitle={userSubtitle}
        userImage={userData.profileImage}
        sidebarItems={finalSidebarItems}
        activeSectionId={getActiveSectionFromPath(pathname)}
        notificationCount={0}
        profileHref={profileHref || settingsHref}
        networkHref={networkHref}
        onLogout={handleLogout}
      >
        {children}
      </DashboardLayout>
    )

    if (ContextProvider) {
      return (
        <ContextProvider userData={contextData || userData}>
          {content}
        </ContextProvider>
      )
    }

    return content
  }
}
