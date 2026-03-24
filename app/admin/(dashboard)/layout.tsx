'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { ADMIN_SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Admin',
 sidebarItems: ADMIN_SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/admin/profile',
 networkHref: '/admin/network',
})
