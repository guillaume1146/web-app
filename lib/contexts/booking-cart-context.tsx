'use client'

import { createContext, useContext, useState, useEffect } from 'react'

export interface BookingSelection {
  role: {
    code: string
    label: string
    singularLabel: string
    slug: string
    color: string
    iconKey?: string | null
  }
  service: {
    id: string
    serviceName: string
    category: string
    description?: string | null
    defaultPrice: number
    iconKey?: string | null
    emoji?: string | null
  }
  date: string       // YYYY-MM-DD
  time: string       // HH:MM
  timeLabel: string  // "9:00 AM"
  dateLabel: string  // "Mon, May 4"
}

interface BookingCartCtx {
  selection: BookingSelection | null
  setSelection: (s: BookingSelection | null) => void
  clear: () => void
  loginModalOpen: boolean
  openLoginModal: (afterLogin?: () => void) => void
  closeLoginModal: () => void
  onAfterLogin: (() => void) | null
}

const BookingCartContext = createContext<BookingCartCtx>({
  selection: null,
  setSelection: () => {},
  clear: () => {},
  loginModalOpen: false,
  openLoginModal: () => {},
  closeLoginModal: () => {},
  onAfterLogin: null,
})

const STORAGE_KEY = 'mediwyz_booking_cart'

export function BookingCartProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelectionState] = useState<BookingSelection | null>(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [onAfterLogin, setOnAfterLogin] = useState<(() => void) | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSelectionState(JSON.parse(raw))
    } catch {}
  }, [])

  function setSelection(s: BookingSelection | null) {
    setSelectionState(s)
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    else localStorage.removeItem(STORAGE_KEY)
  }

  function clear() { setSelection(null) }

  function openLoginModal(afterLogin?: () => void) {
    setOnAfterLogin(afterLogin ? () => afterLogin : null)
    setLoginModalOpen(true)
  }

  function closeLoginModal() {
    setLoginModalOpen(false)
    setOnAfterLogin(null)
  }

  return (
    <BookingCartContext.Provider value={{
      selection, setSelection, clear,
      loginModalOpen, openLoginModal, closeLoginModal, onAfterLogin,
    }}>
      {children}
    </BookingCartContext.Provider>
  )
}

export function useBookingCart() { return useContext(BookingCartContext) }
