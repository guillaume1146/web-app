import { FaHome, FaNewspaper, FaBriefcaseMedical, FaComments, FaVideo, FaMoneyBillWave } from 'react-icons/fa'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'
import { createGetActiveSectionFromPath } from '@/lib/dashboard/getActiveSectionFromPath'
import { getPatientHealthItems, getSearchItems } from '@/lib/dashboard/patientHealthItems'

const base = '/insurance'

export const INSURANCE_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'feed', label: 'Feed', labelKey: 'nav.feed', icon: FaNewspaper, color: 'text-orange-600', bgColor: 'bg-orange-50', href: `${base}/feed` },
  { id: 'overview', label: 'Dashboard', labelKey: 'nav.overview', icon: FaHome, color: 'text-blue-600', bgColor: 'bg-blue-50', href: base },
  { id: 'portfolio', label: 'My Portfolio', labelKey: 'nav.portfolio', icon: FaBriefcaseMedical, color: 'text-blue-600', bgColor: 'bg-blue-50', href: `${base}/portfolio` },
  { id: 'billing', label: 'Billing', labelKey: 'nav.billing', icon: FaMoneyBillWave, color: 'text-emerald-600', bgColor: 'bg-emerald-50', href: `${base}/billing` },
  { id: 'video', label: 'Video Call', labelKey: 'nav.video', icon: FaVideo, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/video` },
  { id: 'messages', label: 'Messages', labelKey: 'nav.messages', icon: FaComments, color: 'text-pink-600', bgColor: 'bg-pink-50', href: `${base}/messages` },
  ...getPatientHealthItems(base),
  ...getSearchItems(base),
]

export const getActiveSectionFromPath = createGetActiveSectionFromPath(base, INSURANCE_SIDEBAR_ITEMS)
