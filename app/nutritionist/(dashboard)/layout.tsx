'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Nutritionist',
 sidebarItems: SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/nutritionist/profile',
 networkHref: '/nutritionist/network',
})
