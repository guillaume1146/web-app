'use client'

import { useState, useEffect } from 'react'
import { FaSearch, FaCapsules } from 'react-icons/fa'
import * as FaIcons from 'react-icons/fa'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'

interface RoleData {
  code: string
  label: string
  slug: string
  icon: string
  color: string
  searchEnabled: boolean
}

/**
 * Hook that fetches provider roles from /api/roles and builds
 * dynamic sidebar search items. Falls back to empty array on error.
 */
export function useDynamicSearchItems(basePath: string): SidebarItem[] {
  const [items, setItems] = useState<SidebarItem[]>([])

  useEffect(() => {
    // Look up the user's region first so the sidebar matches the regional
    // admin's CRUD (which is region-scoped). Fall back to global-only on error.
    const runFetch = async () => {
      let regionCode: string | null = null
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' })
        const meJson = await meRes.json()
        regionCode = meJson?.user?.regionCode ?? null
      } catch { /* swallow */ }
      const qs = new URLSearchParams({ searchEnabled: 'true' })
      if (regionCode) qs.set('regionCode', regionCode)
      return fetch(`/api/roles?${qs.toString()}`, { credentials: 'include' })
    }

    runFetch()
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data) return

        const roles: RoleData[] = json.data
        const result: SidebarItem[] = [
          {
            id: 'divider-search',
            label: 'Search & Browse',
            icon: FaSearch,
            color: 'text-gray-400',
            bgColor: 'bg-gray-50',
            href: '',
            divider: true,
          },
        ]

        for (const role of roles) {
          // Dynamically resolve icon from react-icons/fa
          const IconComponent = (FaIcons as Record<string, React.ComponentType<{ className?: string }>>)[role.icon] || FaSearch

          result.push({
            id: `search-${role.slug}`,
            label: `Find ${role.label}`,
            icon: IconComponent,
            color: 'text-gray-600',
            bgColor: 'bg-gray-50',
            href: `/search/${role.slug}`,
          })
        }

        // Health Shop at the end
        result.push({
          id: 'search-health-shop',
          label: 'Health Shop',
          icon: FaCapsules,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          href: `/search/health-shop`,
        })

        setItems(result)
      })
      .catch(() => {
        // Fallback: empty (static items from getSearchItems will be used)
      })
  }, [basePath])

  return items
}
