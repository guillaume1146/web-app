'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Dentist',
 sidebarItems: SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/dentist/profile',
 networkHref: '/dentist/network',
})
