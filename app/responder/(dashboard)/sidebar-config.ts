import { FaHome, FaNewspaper, FaComments, FaVideo, FaClipboardList, FaMoneyBillWave } from 'react-icons/fa'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'
import { createGetActiveSectionFromPath } from '@/lib/dashboard/getActiveSectionFromPath'
import { getPatientHealthItems, getSearchItems } from '@/lib/dashboard/patientHealthItems'

const base = '/responder'

export const RESPONDER_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'feed', label: 'Feed', labelKey: 'nav.feed', icon: FaNewspaper, color: 'text-orange-600', bgColor: 'bg-orange-50', href: `${base}/feed` },
  { id: 'overview', label: 'Dashboard', labelKey: 'nav.overview', icon: FaHome, color: 'text-red-600', bgColor: 'bg-red-50', href: base },
  { id: 'operations', label: 'Operations', labelKey: 'nav.operations', icon: FaClipboardList, color: 'text-amber-600', bgColor: 'bg-amber-50', href: `${base}/operations` },
  { id: 'billing', label: 'Billing', labelKey: 'nav.billing', icon: FaMoneyBillWave, color: 'text-emerald-600', bgColor: 'bg-emerald-50', href: `${base}/billing` },
  { id: 'video', label: 'Video Call', labelKey: 'nav.video', icon: FaVideo, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/video` },
  { id: 'messages', label: 'Messages', labelKey: 'nav.messages', icon: FaComments, color: 'text-pink-600', bgColor: 'bg-pink-50', href: `${base}/messages` },
  ...getPatientHealthItems(base),
  ...getSearchItems(base),
]

export const getActiveSectionFromPath = createGetActiveSectionFromPath(base, RESPONDER_SIDEBAR_ITEMS)
