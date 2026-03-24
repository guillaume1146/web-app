'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { INSURANCE_SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Insurance',
 sidebarItems: INSURANCE_SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/insurance/profile',
 networkHref: '/insurance/network',
})
