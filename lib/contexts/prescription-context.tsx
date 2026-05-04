'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface PrescriptionState {
  imageUrl: string | null
  medicines: string[]
  rawText: string
  uploadedAt: string | null
}

interface PrescriptionContextType {
  prescription: PrescriptionState
  hasPrescription: boolean
  setPrescription: (state: PrescriptionState) => void
  clearPrescription: () => void
  isExtracting: boolean
  setIsExtracting: (v: boolean) => void
}

const EMPTY: PrescriptionState = { imageUrl: null, medicines: [], rawText: '', uploadedAt: null }
const STORAGE_KEY = 'mediwyz_prescription'

const Ctx = createContext<PrescriptionContextType | null>(null)

export function PrescriptionProvider({ children }: { children: ReactNode }) {
  const [prescription, setPrescriptionState] = useState<PrescriptionState>(EMPTY)
  const [isExtracting, setIsExtracting] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setPrescriptionState(JSON.parse(stored) as PrescriptionState)
    } catch { /* ignore */ }
  }, [])

  const setPrescription = useCallback((state: PrescriptionState) => {
    setPrescriptionState(state)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* ignore */ }
  }, [])

  const clearPrescription = useCallback(() => {
    setPrescriptionState(EMPTY)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <Ctx.Provider value={{ prescription, hasPrescription: !!prescription.imageUrl, setPrescription, clearPrescription, isExtracting, setIsExtracting }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePrescription() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePrescription must be used within PrescriptionProvider')
  return ctx
}
