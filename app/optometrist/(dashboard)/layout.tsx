'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Optometrist',
 sidebarItems: SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/optometrist/profile',
 networkHref: '/optometrist/network',
 dynamicSearchBasePath: '/optometrist',
})
