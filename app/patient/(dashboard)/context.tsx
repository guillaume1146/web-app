'use client'

import { createContext, useContext } from 'react'
import type { Patient } from '@/lib/data/patients'

const PatientDashboardContext = createContext<Patient | null>(null)

export function PatientDashboardProvider({
 userData,
 children,
}: {
 userData: Patient
 children: React.ReactNode
}) {
 return (
 <PatientDashboardContext.Provider value={userData}>
 {children}
 </PatientDashboardContext.Provider>
 )
}

export function usePatientData(): Patient {
 const ctx = useContext(PatientDashboardContext)
 if (!ctx) throw new Error('usePatientData must be used within PatientDashboardProvider')
 return ctx
}
