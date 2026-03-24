'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { PATIENT_SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'
import { PatientDashboardProvider } from './context'

export default createDashboardLayout({
 userSubtitle: 'Patient',
 sidebarItems: PATIENT_SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/patient/profile',
 networkHref: '/patient/network',
 ContextProvider: PatientDashboardProvider,
})
