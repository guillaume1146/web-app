'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { NANNY_SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Childcare',
 sidebarItems: NANNY_SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/nanny/profile',
 networkHref: '/nanny/network',
})
