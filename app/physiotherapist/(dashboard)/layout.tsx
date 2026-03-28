'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Physiotherapist',
 sidebarItems: SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/physiotherapist/profile',
 networkHref: '/physiotherapist/network',
 dynamicSearchBasePath: '/physiotherapist',
})
