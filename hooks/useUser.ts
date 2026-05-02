'use client'

import { useState, useEffect, useCallback } from 'react'

export interface CurrentUser {
  id: string
  firstName: string
  lastName: string
  email: string
  profileImage?: string | null
  userType: string
  verified?: boolean
  redirectPath?: string
}

const STORAGE_KEY = 'mediwyz_user'

let cachedUser: CurrentUser | null = null

export function useUser(): {
  user: CurrentUser | null
  loading: boolean
  updateUser: (data: Partial<CurrentUser>) => void
  clearUser: () => void
} {
  const [user, setUser] = useState<CurrentUser | null>(cachedUser)
  const [loading, setLoading] = useState(!cachedUser)

  useEffect(() => {
    if (cachedUser) {
      setUser(cachedUser)
      setLoading(false)
      return
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        cachedUser = parsed
        setUser(parsed)
      }
    } catch {
      // silent
    }
    setLoading(false)
  }, [])

  const updateUser = useCallback((data: Partial<CurrentUser>) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...data }
      cachedUser = updated
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const clearUser = useCallback(() => {
    cachedUser = null
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('mediwyz_token')
    localStorage.removeItem('mediwyz_userType')
    localStorage.removeItem('mediwyz_redirectPath')
  }, [])

  return { user, loading, updateUser, clearUser }
}

/** Quick sync getter for non-hook contexts (e.g. fetch helpers) */
export function getUserId(): string | null {
  if (cachedUser) return cachedUser.id
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      cachedUser = parsed
      return parsed.id
    }
  } catch {
    // silent
  }
  return null
}
