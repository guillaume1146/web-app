'use client'

import { useState, useEffect } from 'react'

export interface ProviderRole {
  role: string
  label: string
  searchPath: string
  icon: string
  color: string
  providerCount: number
  specialties: { name: string; description: string | null }[]
}

let cachedRoles: ProviderRole[] | null = null

/**
 * Hook to fetch provider roles from the database.
 * Cached — only fetches once per page load.
 */
export function useProviderRoles() {
  const [roles, setRoles] = useState<ProviderRole[]>(cachedRoles || [])
  const [loading, setLoading] = useState(!cachedRoles)

  useEffect(() => {
    if (cachedRoles) return
    fetch('/api/roles')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          cachedRoles = json.data
          setRoles(json.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { roles, loading }
}
