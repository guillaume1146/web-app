'use client'

import { createContext, useContext } from 'react'

export interface DoctorUser {
 id: string
 firstName: string
 lastName: string
 email: string
 profileImage: string | null
 userType: string
}

const DoctorDashboardContext = createContext<DoctorUser | null>(null)

export function DoctorDashboardProvider({
 userData,
 children,
}: {
 userData: DoctorUser
 children: React.ReactNode
}) {
 return (
 <DoctorDashboardContext.Provider value={userData}>
 {children}
 </DoctorDashboardContext.Provider>
 )
}

export function useDoctorData(): DoctorUser {
 const ctx = useContext(DoctorDashboardContext)
 if (!ctx) throw new Error('useDoctorData must be used within DoctorDashboardProvider')
 return ctx
}
