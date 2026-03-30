'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { DashboardLayout, DashboardLoadingState } from '@/components/dashboard'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'
import { useUser } from '@/hooks/useUser'
import { useDynamicSearchItems } from '@/hooks/useDynamicSearchItems'
import {
  FaHome, FaRss, FaBriefcaseMedical, FaMoneyBillWave, FaCubes,
  FaCogs, FaProjectDiagram, FaVideo, FaComments, FaRobot,
  FaHeartbeat, FaShieldAlt, FaUsersCog, FaSitemap, FaTag,
  FaBuilding, FaHandshake, FaUsers,
} from 'react-icons/fa'

interface RoleConfig {
  isProvider: boolean
  singularLabel: string
  code: string
}

function buildSidebarItems(role: RoleConfig | null, userType: string): SidebarItem[] {
  const items: SidebarItem[] = [
    { id: 'feed', label: 'Feed', icon: FaRss, color: 'text-orange-600', bgColor: 'bg-orange-50', href: '/feed' },
    { id: 'overview', label: 'Dashboard', icon: FaHome, color: 'text-blue-600', bgColor: 'bg-blue-50', href: '/' },
  ]

  // Provider-specific items
  if (role?.isProvider) {
    items.push(
      { id: 'practice', label: 'My Practice', icon: FaBriefcaseMedical, color: 'text-cyan-600', bgColor: 'bg-cyan-50', href: '/practice' },
      { id: 'billing', label: 'Billing', icon: FaMoneyBillWave, color: 'text-green-600', bgColor: 'bg-green-50', href: '/billing' },
      { id: 'services', label: 'My Services', icon: FaCogs, color: 'text-purple-600', bgColor: 'bg-purple-50', href: '/services' },
      { id: 'inventory', label: 'My Inventory', icon: FaCubes, color: 'text-amber-600', bgColor: 'bg-amber-50', href: '/inventory' },
      { id: 'workflows', label: 'Workflows', icon: FaProjectDiagram, color: 'text-indigo-600', bgColor: 'bg-indigo-50', href: '/workflows' },
    )
  }

  // Regional admin items
  if (userType === 'REGIONAL_ADMIN') {
    items.push(
      { id: 'administration', label: 'Administration', icon: FaShieldAlt, color: 'text-blue-600', bgColor: 'bg-blue-50', href: '/administration' },
      { id: 'regional-services', label: 'Services & Workflows', icon: FaTag, color: 'text-[#001E40]', bgColor: 'bg-sky-50', href: '/regional-services' },
      { id: 'regional-workflows', label: 'Workflow Templates', icon: FaSitemap, color: 'text-[#0C6780]', bgColor: 'bg-sky-50', href: '/regional-workflows' },
      { id: 'roles', label: 'Provider Roles', icon: FaUsersCog, color: 'text-violet-600', bgColor: 'bg-violet-50', href: '/roles' },
    )
  }

  // Corporate admin items
  if (userType === 'CORPORATE_ADMIN') {
    items.push(
      { id: 'management', label: 'Management', icon: FaBuilding, color: 'text-blue-600', bgColor: 'bg-blue-50', href: '/management' },
    )
  }

  // Patient-specific items (non-provider, non-admin)
  if (!role?.isProvider && userType === 'PATIENT') {
    items.push(
      { id: 'billing', label: 'Billing', icon: FaMoneyBillWave, color: 'text-green-600', bgColor: 'bg-green-50', href: '/billing' },
    )
  }

  // Common items for ALL users
  items.push(
    { id: 'video', label: 'Video Call', icon: FaVideo, color: 'text-teal-600', bgColor: 'bg-teal-50', href: '/video' },
    { id: 'messages', label: 'Messages', icon: FaComments, color: 'text-pink-600', bgColor: 'bg-pink-50', href: '/messages' },
    { id: 'ai', label: 'AI Health Assistant', icon: FaRobot, color: 'text-violet-600', bgColor: 'bg-violet-50', href: '/ai-assistant' },
    { id: 'health', label: 'My Health', icon: FaHeartbeat, color: 'text-red-600', bgColor: 'bg-red-50', href: '/my-health' },
  )

  return items
}

function getActiveSectionFromPath(pathname: string): string {
  if (pathname === '/') return 'overview'
  const segment = pathname.split('/').filter(Boolean)[0]
  const map: Record<string, string> = {
    feed: 'feed', practice: 'practice', billing: 'billing',
    services: 'services', inventory: 'inventory', workflows: 'workflows',
    video: 'video', messages: 'messages', 'ai-assistant': 'ai',
    'my-health': 'health', administration: 'administration',
    'regional-services': 'regional-services', 'regional-workflows': 'regional-workflows',
    roles: 'roles', management: 'management', search: 'search',
    profile: 'profile', network: 'network', settings: 'settings',
  }
  return map[segment] || 'overview'
}

export default function UnifiedDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading, clearUser } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const dynamicSearch = useDynamicSearchItems('')
  const [roleConfig, setRoleConfig] = useState<RoleConfig | null>(null)

  // Fetch role config from ProviderRole table
  useEffect(() => {
    if (!user) return
    fetch('/api/roles?all=true')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const found = json.data.find((r: { code: string }) => r.code === user.userType)
          if (found) setRoleConfig({ isProvider: found.isProvider, singularLabel: found.singularLabel, code: found.code })
        }
      })
      .catch(() => {})
  }, [user])

  const handleLogout = useCallback(() => {
    clearUser()
    router.push('/login')
  }, [clearUser, router])

  if (userLoading) return <DashboardLoadingState />

  if (!user) {
    router.push('/login')
    return <DashboardLoadingState />
  }

  const coreItems = buildSidebarItems(roleConfig, user.userType)
  const sidebarItems = dynamicSearch.length > 0
    ? [...coreItems, ...dynamicSearch]
    : coreItems

  return (
    <DashboardLayout
      userName={`${user.firstName} ${user.lastName}`}
      userImage={user.profileImage}
      userSubtitle={roleConfig?.singularLabel || user.userType?.replace(/_/g, ' ') || ''}
      sidebarItems={sidebarItems}
      activeSectionId={getActiveSectionFromPath(pathname)}
      profileHref="/profile"
      networkHref="/network"
      onLogout={handleLogout}
    >
      {children}
    </DashboardLayout>
  )
}
