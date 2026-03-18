import { FaHome, FaNewspaper, FaVideo, FaComments, FaMoneyBillWave, FaSearch, FaUserMd, FaUserNurse, FaBaby, FaFlask, FaAmbulance, FaCapsules, FaBriefcaseMedical } from 'react-icons/fa'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'
import { createGetActiveSectionFromPath } from '@/lib/dashboard/getActiveSectionFromPath'
import { getPatientHealthItems } from '@/lib/dashboard/patientHealthItems'

const base = '/dentist'

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'feed', label: 'Feed', labelKey: 'nav.feed', icon: FaNewspaper, color: 'text-orange-600', bgColor: 'bg-orange-50', href: `${base}/feed` },
  { id: 'overview', label: 'Dashboard', labelKey: 'nav.overview', icon: FaHome, color: 'text-sky-600', bgColor: 'bg-sky-50', href: base },
  { id: 'practice', label: 'My Practice', labelKey: 'nav.practice', icon: FaBriefcaseMedical, color: 'text-sky-600', bgColor: 'bg-sky-50', href: `${base}/practice` },
  { id: 'billing', label: 'Billing', labelKey: 'nav.billing', icon: FaMoneyBillWave, color: 'text-emerald-600', bgColor: 'bg-emerald-50', href: `${base}/billing` },
  { id: 'video', label: 'Video Call', labelKey: 'nav.video', icon: FaVideo, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/video` },
  { id: 'messages', label: 'Messages', labelKey: 'nav.messages', icon: FaComments, color: 'text-pink-600', bgColor: 'bg-pink-50', href: `${base}/messages` },
  ...getPatientHealthItems(base),
  { id: 'divider-search', label: 'Search & Browse', icon: FaSearch, color: 'text-gray-400', bgColor: 'bg-gray-50', href: '', divider: true },
  { id: 'search-doctors', label: 'Find Doctors', icon: FaUserMd, color: 'text-blue-600', bgColor: 'bg-blue-50', href: `${base}/search/doctors` },
  { id: 'search-nurses', label: 'Find Nurses', icon: FaUserNurse, color: 'text-purple-600', bgColor: 'bg-purple-50', href: `${base}/search/nurses` },
  { id: 'search-childcare', label: 'Find Childcare', icon: FaBaby, color: 'text-yellow-600', bgColor: 'bg-yellow-50', href: `${base}/search/childcare` },
  { id: 'search-lab', label: 'Find Lab Tests', icon: FaFlask, color: 'text-cyan-600', bgColor: 'bg-cyan-50', href: `${base}/search/lab` },
  { id: 'search-emergency', label: 'Emergency Services', icon: FaAmbulance, color: 'text-red-600', bgColor: 'bg-red-50', href: `${base}/search/emergency` },
  { id: 'search-medicines', label: 'Buy Medicines', icon: FaCapsules, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/search/medicines` },
]

export const getActiveSectionFromPath = createGetActiveSectionFromPath(base, SIDEBAR_ITEMS)
