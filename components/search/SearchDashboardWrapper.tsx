'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { DashboardLayout, DashboardLoadingState } from '@/components/dashboard'
import { getSidebarConfig } from '@/lib/dashboard/sidebarRegistry'
import { useDynamicSearchItems } from '@/hooks/useDynamicSearchItems'
import { useRoleFeatureConfig, filterSidebarByFeatures } from '@/hooks/useRoleFeatureConfig'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'
import {
  FaHome, FaRss, FaBriefcaseMedical, FaMoneyBillWave, FaCubes,
  FaCogs, FaProjectDiagram, FaVideo, FaComments, FaBuilding,
} from 'react-icons/fa'
import { getPatientHealthItems } from '@/lib/dashboard/patientHealthItems'

// Fallback (used until /api/roles loads). Kept minimal — only what middleware needs for SSR.
// At runtime this is overridden with DB-backed slugs from ProviderRole.cookieValue → ProviderRole.slug.
const FALLBACK_SLUGS: Record<string, string> = { patient: 'patients' }

function getProviderSidebarItems(base: string): SidebarItem[] {
  return [
    { id: 'feed', label: 'Feed', icon: FaRss, color: 'text-orange-600', bgColor: 'bg-orange-50', href: `${base}/feed` },
    { id: 'overview', label: 'Dashboard', icon: FaHome, color: 'text-blue-600', bgColor: 'bg-blue-50', href: base },
    { id: 'practice', label: 'My Practice', icon: FaBriefcaseMedical, color: 'text-cyan-600', bgColor: 'bg-cyan-50', href: `${base}/practice` },
    { id: 'billing', label: 'Billing', icon: FaMoneyBillWave, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/billing` },
    { id: 'services', label: 'My Services', icon: FaCogs, color: 'text-purple-600', bgColor: 'bg-purple-50', href: `${base}/services` },
    { id: 'inventory', label: 'My Inventory', icon: FaCubes, color: 'text-amber-600', bgColor: 'bg-amber-50', href: `${base}/inventory` },
    { id: 'workflows', label: 'Workflows', icon: FaProjectDiagram, color: 'text-indigo-600', bgColor: 'bg-indigo-50', href: `${base}/workflows` },
    { id: 'video', label: 'Video Call', icon: FaVideo, color: 'text-teal-600', bgColor: 'bg-teal-50', href: `${base}/video` },
    { id: 'messages', label: 'Messages', icon: FaComments, color: 'text-pink-600', bgColor: 'bg-pink-50', href: `${base}/messages` },
    { id: 'my-company', label: 'My Company', icon: FaBuilding, color: 'text-slate-600', bgColor: 'bg-slate-50', href: `${base}/my-company` },
    ...getPatientHealthItems(base),
  ]
}

export default function SearchDashboardWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading, clearUser } = useUser()
  const pathname = usePathname()
  const router = useRouter()

  // Hydration guard — cookie access only runs after mount to avoid SSR/CSR mismatch
  const [mounted, setMounted] = useState(false)
  const [cookieVal, setCookieVal] = useState<string | null>(null)
  const [cookieToSlug, setCookieToSlug] = useState<Record<string, string>>(FALLBACK_SLUGS)

  useEffect(() => {
    setMounted(true)
    const match = document.cookie.split(';').find(c => c.trim().startsWith('mediwyz_userType='))
    setCookieVal(match ? decodeURIComponent(match.split('=')[1]?.trim() || '') : null)
  }, [])

  // Load provider slug map dynamically from /api/roles — no hardcoded role list
  useEffect(() => {
    fetch('/api/roles')
      .then(r => r.json())
      .then(json => {
        if (!json?.success || !Array.isArray(json.data)) return
        const map: Record<string, string> = { ...FALLBACK_SLUGS }
        for (const role of json.data) {
          if (role.cookieValue && role.slug) map[role.cookieValue] = role.slug
        }
        setCookieToSlug(map)
      })
      .catch(() => {})
  }, [])

  const providerSlug = cookieVal ? cookieToSlug[cookieVal] : null
  const basePath = providerSlug ? `/provider/${providerSlug}` : ''

  const dynamicSearch = useDynamicSearchItems(basePath)
  const featureConfig = useRoleFeatureConfig(user?.userType)

  // Render loading state on SSR + before mount to keep server and first-client paint identical
  if (!mounted || userLoading) {
    return <DashboardLoadingState />
  }

  if (!user) {
    return <>{children}</>
  }

  // Try registry first (non-provider roles: insurance, corporate, etc.)
  const registryConfig = getSidebarConfig(user.userType)

  let sidebarItems: SidebarItem[]
  let subtitle: string
  let profileHref: string
  let networkHref: string

  if (registryConfig) {
    sidebarItems = registryConfig.items
    subtitle = registryConfig.userSubtitle
    profileHref = registryConfig.profileHref
    networkHref = registryConfig.networkHref
  } else {
    // Provider role — build items dynamically
    const coreItems = getProviderSidebarItems(basePath)
    sidebarItems = dynamicSearch.length > 0
      ? [...coreItems.filter(i => !i.id.startsWith('search-') && i.id !== 'divider-search'), ...dynamicSearch]
      : coreItems
    sidebarItems = filterSidebarByFeatures(sidebarItems, featureConfig)
    subtitle = user.userType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    profileHref = `${basePath}/profile`
    networkHref = `${basePath}/network`
  }

  const displayName = `${user.firstName} ${user.lastName}`
  const searchSegment = pathname.replace(/^\/search\/?/, '').split('/')[0]
  const activeSectionId = searchSegment ? `search-${searchSegment}` : 'overview'

  const handleLogout = () => {
    clearUser()
    router.push('/login')
  }

  // Full-bleed pages inside the dashboard (no padding so the content can
  // stretch to the very bottom of the screen).
  const isFullBleed = pathname === '/search/ai'

  return (
    <DashboardLayout
      userName={displayName}
      userSubtitle={subtitle}
      userImage={user.profileImage}
      sidebarItems={sidebarItems}
      activeSectionId={activeSectionId}
      notificationCount={0}
      profileHref={profileHref}
      networkHref={networkHref}
      onLogout={handleLogout}
      mainClassName={isFullBleed ? '!p-0 !overflow-hidden relative' : undefined}
    >
      {children}
    </DashboardLayout>
  )
}
