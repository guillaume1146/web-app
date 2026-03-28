import { FaHome, FaNewspaper, FaShieldAlt, FaComments, FaVideo, FaMoneyBillWave, FaSitemap, FaTag, FaUsersCog } from 'react-icons/fa'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'
import { createGetActiveSectionFromPath } from '@/lib/dashboard/getActiveSectionFromPath'
import { getPatientHealthItems, getSearchItems } from '@/lib/dashboard/patientHealthItems'

const base = '/regional'

export const REGIONAL_ADMIN_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'feed', label: 'Feed', labelKey: 'nav.feed', icon: FaNewspaper, color: 'text-orange-600', bgColor: 'bg-orange-50', href: `${base}/feed` },
  { id: 'overview', label: 'Dashboard', labelKey: 'nav.overview', icon: FaHome, color: 'text-blue-600', bgColor: 'bg-blue-50', href: base },
  { id: 'administration', label: 'Administration', labelKey: 'nav.administration', icon: FaShieldAlt, color: 'text-blue-600', bgColor: 'bg-blue-50', href: `${base}/administration` },
  { id: 'services', label: 'Services & Workflows', labelKey: 'nav.services', icon: FaTag, color: 'text-brand-navy', bgColor: 'bg-sky-50', href: `${base}/services` },
  { id: 'workflows', label: 'Workflow Templates', labelKey: 'nav.workflows', icon: FaSitemap, color: 'text-brand-teal', bgColor: 'bg-sky-50', href: `${base}/workflows` },
  { id: 'roles', label: 'Provider Roles', labelKey: 'nav.roles', icon: FaUsersCog, color: 'text-violet-600', bgColor: 'bg-violet-50', href: `${base}/roles` },
  { id: 'billing', label: 'Billing', labelKey: 'nav.billing', icon: FaMoneyBillWave, color: 'text-emerald-600', bgColor: 'bg-emerald-50', href: `${base}/billing` },
  { id: 'video', label: 'Video Call', labelKey: 'nav.video', icon: FaVideo, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/video` },
  { id: 'messages', label: 'Messages', labelKey: 'nav.messages', icon: FaComments, color: 'text-pink-600', bgColor: 'bg-pink-50', href: `${base}/messages` },
  ...getPatientHealthItems(base),
  ...getSearchItems(base),
]

export const getActiveSectionFromPath = createGetActiveSectionFromPath(base, REGIONAL_ADMIN_SIDEBAR_ITEMS)
