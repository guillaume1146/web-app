'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { CORPORATE_SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Corporate',
 sidebarItems: CORPORATE_SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/corporate/profile',
 networkHref: '/corporate/network',
 dynamicSearchBasePath: '/corporate',
})
