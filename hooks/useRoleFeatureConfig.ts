'use client'

import { useState, useEffect } from 'react'

interface RoleFeatureConfig {
  allEnabled: boolean
  features: Record<string, boolean>
  loading: boolean
}

const cache = new Map<string, { allEnabled: boolean; features: Record<string, boolean> }>()

/**
 * Fetches feature config for a user type from /api/role-config/[userType].
 * Used to filter sidebar items based on admin-configured permissions.
 * Results are cached in memory for the session.
 */
export function useRoleFeatureConfig(userType: string | undefined): RoleFeatureConfig {
  const [config, setConfig] = useState<RoleFeatureConfig>({
    allEnabled: true,
    features: {},
    loading: !!userType,
  })

  useEffect(() => {
    if (!userType) return

    const cached = cache.get(userType)
    if (cached) {
      setConfig({ ...cached, loading: false })
      return
    }

    fetch(`/api/role-config/${userType}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const result = { allEnabled: json.data.allEnabled, features: json.data.features || {} }
          cache.set(userType, result)
          setConfig({ ...result, loading: false })
        } else {
          setConfig({ allEnabled: true, features: {}, loading: false })
        }
      })
      .catch(() => {
        setConfig({ allEnabled: true, features: {}, loading: false })
      })
  }, [userType])

  return config
}

/**
 * Filters sidebar items based on role feature config.
 * If allEnabled=true (no config), returns all items.
 * Otherwise, removes items where features[item.id] === false.
 */
export function filterSidebarByFeatures<T extends { id: string }>(
  items: T[],
  config: RoleFeatureConfig
): T[] {
  if (config.allEnabled || config.loading) return items
  return items.filter(item => config.features[item.id] !== false)
}
