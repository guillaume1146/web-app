import { FaHome, FaNewspaper, FaBriefcaseMedical, FaVideo, FaComments, FaMoneyBillWave } from 'react-icons/fa'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'
import { createGetActiveSectionFromPath } from '@/lib/dashboard/getActiveSectionFromPath'
import { getPatientHealthItems, getSearchItems } from '@/lib/dashboard/patientHealthItems'

const base = '/nanny'

export const NANNY_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'feed', label: 'Feed', labelKey: 'nav.feed', icon: FaNewspaper, color: 'text-orange-600', bgColor: 'bg-orange-50', href: `${base}/feed` },
  { id: 'overview', label: 'Dashboard', labelKey: 'nav.overview', icon: FaHome, color: 'text-purple-600', bgColor: 'bg-purple-50', href: base },
  { id: 'activity', label: 'My Activity', labelKey: 'nav.activity', icon: FaBriefcaseMedical, color: 'text-cyan-600', bgColor: 'bg-cyan-50', href: `${base}/activity` },
  { id: 'billing', label: 'Billing', labelKey: 'nav.billing', icon: FaMoneyBillWave, color: 'text-emerald-600', bgColor: 'bg-emerald-50', href: `${base}/billing` },
  { id: 'video', label: 'Video Call', labelKey: 'nav.video', icon: FaVideo, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/video` },
  { id: 'messages', label: 'Messages', labelKey: 'nav.messages', icon: FaComments, color: 'text-pink-600', bgColor: 'bg-pink-50', href: `${base}/messages` },
  ...getPatientHealthItems(base),
  ...getSearchItems(base),
]

export const getActiveSectionFromPath = createGetActiveSectionFromPath(base, NANNY_SIDEBAR_ITEMS)
