'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { REGIONAL_ADMIN_SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Regional Admin',
 sidebarItems: REGIONAL_ADMIN_SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/regional/profile',
 networkHref: '/regional/network',
 dynamicSearchBasePath: '/regional',
})
