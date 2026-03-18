import { FaHome, FaNewspaper, FaBriefcaseMedical, FaComments, FaVideo, FaMoneyBillWave } from 'react-icons/fa'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'
import { createGetActiveSectionFromPath } from '@/lib/dashboard/getActiveSectionFromPath'
import { getPatientHealthItems, getSearchItems } from '@/lib/dashboard/patientHealthItems'

const base = '/pharmacist'

export const PHARMACIST_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'feed', label: 'Feed', labelKey: 'nav.feed', icon: FaNewspaper, color: 'text-orange-600', bgColor: 'bg-orange-50', href: `${base}/feed` },
  { id: 'overview', label: 'Dashboard', labelKey: 'nav.overview', icon: FaHome, color: 'text-teal-600', bgColor: 'bg-teal-50', href: base },
  { id: 'pharmacy', label: 'My Pharmacy', labelKey: 'nav.pharmacy', icon: FaBriefcaseMedical, color: 'text-teal-600', bgColor: 'bg-teal-50', href: `${base}/pharmacy` },
  { id: 'billing', label: 'Billing', labelKey: 'nav.billing', icon: FaMoneyBillWave, color: 'text-emerald-600', bgColor: 'bg-emerald-50', href: `${base}/billing` },
  { id: 'video', label: 'Video Call', labelKey: 'nav.video', icon: FaVideo, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/video` },
  { id: 'messages', label: 'Messages', labelKey: 'nav.messages', icon: FaComments, color: 'text-pink-600', bgColor: 'bg-pink-50', href: `${base}/messages` },
  ...getPatientHealthItems(base),
  ...getSearchItems(base),
]

export const getActiveSectionFromPath = createGetActiveSectionFromPath(base, PHARMACIST_SIDEBAR_ITEMS)
