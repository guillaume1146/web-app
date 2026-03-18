'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
  userSubtitle: 'Caregiver',
  sidebarItems: SIDEBAR_ITEMS,
  getActiveSectionFromPath,
  profileHref: '/caregiver/profile',
  networkHref: '/caregiver/network',
})
