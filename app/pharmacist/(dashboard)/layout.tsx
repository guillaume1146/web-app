'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { PHARMACIST_SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Pharmacist',
 sidebarItems: PHARMACIST_SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/pharmacist/profile',
 networkHref: '/pharmacist/network',
})
