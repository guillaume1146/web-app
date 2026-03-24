'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { NURSE_SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Nurse',
 sidebarItems: NURSE_SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/nurse/profile',
 networkHref: '/nurse/network',
})
