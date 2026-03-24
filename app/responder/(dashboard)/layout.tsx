'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { RESPONDER_SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Responder',
 sidebarItems: RESPONDER_SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/responder/profile',
 networkHref: '/responder/network',
})
