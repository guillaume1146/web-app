'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { LAB_TECH_SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Lab Technician',
 sidebarItems: LAB_TECH_SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/lab-technician/profile',
 networkHref: '/lab-technician/network',
})
