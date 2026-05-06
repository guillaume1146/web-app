'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface DrawerService {
  id: string
  serviceName: string
  category: string
  description?: string
  defaultPrice: number
  duration?: number
  providerType?: string
  iconKey?: string | null
  emoji?: string | null
}

export interface DrawerProvider {
  id: string
  name: string
  userType: string
  profileImage?: string | null
  address?: string | null
  rating?: number
  specializations?: string[]
  bio?: string
}

export interface DrawerRole {
  code: string
  label: string
  singularLabel: string
  slug: string
  color: string
  iconKey?: string | null
}

export interface DrawerOrganization {
  id: string
  name: string
  type: string
  logoUrl?: string | null
}

export interface OpenDrawerOptions {
  service?: DrawerService | null
  provider?: DrawerProvider | null
  role?: DrawerRole | null
  organization?: DrawerOrganization | null   // start booking from a specific organization
  date?: string | null        // YYYY-MM-DD
  time?: string | null        // HH:MM
  timeLabel?: string | null   // '9:00 AM'
  dateLabel?: string | null   // 'Mon, Jan 6'
}

interface BookingDrawerContextType {
  isOpen: boolean
  options: OpenDrawerOptions
  openDrawer: (opts: OpenDrawerOptions) => void
  closeDrawer: () => void
}

const BookingDrawerContext = createContext<BookingDrawerContextType | null>(null)

export function BookingDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<OpenDrawerOptions>({})

  const openDrawer = useCallback((opts: OpenDrawerOptions) => {
    setOptions(opts)
    setIsOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setIsOpen(false)
    setTimeout(() => setOptions({}), 300)
  }, [])

  return (
    <BookingDrawerContext.Provider value={{ isOpen, options, openDrawer, closeDrawer }}>
      {children}
    </BookingDrawerContext.Provider>
  )
}

export function useBookingDrawer() {
  const ctx = useContext(BookingDrawerContext)
  if (!ctx) throw new Error('useBookingDrawer must be used inside BookingDrawerProvider')
  return ctx
}
