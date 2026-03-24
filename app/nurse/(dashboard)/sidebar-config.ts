import { FaHome, FaNewspaper, FaVideo, FaComments, FaMoneyBillWave, FaBriefcaseMedical ,
  FaSitemap, FaTag, FaCubes,
} from 'react-icons/fa'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'
import { createGetActiveSectionFromPath } from '@/lib/dashboard/getActiveSectionFromPath'
import { getPatientHealthItems, getSearchItems } from '@/lib/dashboard/patientHealthItems'

const base = '/nurse'

export const NURSE_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'feed', label: 'Feed', labelKey: 'nav.feed', icon: FaNewspaper, color: 'text-orange-600', bgColor: 'bg-orange-50', href: `${base}/feed` },
  { id: 'overview', label: 'Dashboard', labelKey: 'nav.overview', icon: FaHome, color: 'text-teal-600', bgColor: 'bg-teal-50', href: base },
  { id: 'practice', label: 'My Practice', labelKey: 'nav.practice', icon: FaBriefcaseMedical, color: 'text-teal-600', bgColor: 'bg-teal-50', href: `${base}/practice` },
  { id: 'billing', label: 'Billing', labelKey: 'nav.billing', icon: FaMoneyBillWave, color: 'text-emerald-600', bgColor: 'bg-emerald-50', href: `${base}/billing` },
  { id: 'services', label: 'My Services', labelKey: 'nav.services', icon: FaTag, color: 'text-brand-navy', bgColor: 'bg-sky-50', href: `${base}/services` },
  { id: 'inventory', label: 'My Inventory', labelKey: 'nav.inventory', icon: FaCubes, color: 'text-amber-600', bgColor: 'bg-amber-50', href: `${base}/inventory` },
  { id: 'workflows', label: 'Workflows', labelKey: 'nav.workflows', icon: FaSitemap, color: 'text-brand-teal', bgColor: 'bg-sky-50', href: `${base}/workflows` },
  { id: 'video', label: 'Video Call', labelKey: 'nav.video', icon: FaVideo, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/video` },
  { id: 'messages', label: 'Messages', labelKey: 'nav.messages', icon: FaComments, color: 'text-pink-600', bgColor: 'bg-pink-50', href: `${base}/messages` },
  ...getPatientHealthItems(base),
  ...getSearchItems(base),
]

export const getActiveSectionFromPath = createGetActiveSectionFromPath(base, NURSE_SIDEBAR_ITEMS)
