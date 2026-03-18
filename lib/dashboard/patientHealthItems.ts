import {
  FaHeartbeat, FaRobot, FaSearch, FaUserMd, FaUserNurse, FaBaby,
  FaFlask, FaAmbulance, FaCapsules, FaHandHoldingHeart, FaWalking,
  FaTooth, FaEye, FaAppleAlt,
} from 'react-icons/fa'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'

/**
 * Returns AI Health Assistant + My Health sidebar items for any role.
 */
export function getPatientHealthItems(base: string): SidebarItem[] {
  return [
    { id: 'ai-assistant', label: 'AI Health Assistant', labelKey: 'nav.aiAssistant', icon: FaRobot, color: 'text-indigo-600', bgColor: 'bg-indigo-50', href: `${base}/ai-assistant` },
    { id: 'my-health', label: 'My Health', labelKey: 'nav.health', icon: FaHeartbeat, color: 'text-red-600', bgColor: 'bg-red-50', href: `${base}/my-health` },
  ]
}

/**
 * Returns search/browse sidebar items for ALL provider types.
 * Reusable across all role sidebar configs.
 */
export function getSearchItems(base: string): SidebarItem[] {
  return [
    { id: 'divider-search', label: 'Search & Browse', icon: FaSearch, color: 'text-gray-400', bgColor: 'bg-gray-50', href: '', divider: true },
    { id: 'search-doctors', label: 'Find Doctors', icon: FaUserMd, color: 'text-blue-600', bgColor: 'bg-blue-50', href: `${base}/search/doctors` },
    { id: 'search-nurses', label: 'Find Nurses', icon: FaUserNurse, color: 'text-purple-600', bgColor: 'bg-purple-50', href: `${base}/search/nurses` },
    { id: 'search-childcare', label: 'Find Childcare', icon: FaBaby, color: 'text-pink-600', bgColor: 'bg-pink-50', href: `${base}/search/childcare` },
    { id: 'search-caregivers', label: 'Find Caregivers', icon: FaHandHoldingHeart, color: 'text-teal-600', bgColor: 'bg-teal-50', href: `${base}/search/caregivers` },
    { id: 'search-physio', label: 'Find Physio', icon: FaWalking, color: 'text-lime-600', bgColor: 'bg-lime-50', href: `${base}/search/physiotherapists` },
    { id: 'search-dentists', label: 'Find Dentists', icon: FaTooth, color: 'text-sky-600', bgColor: 'bg-sky-50', href: `${base}/search/dentists` },
    { id: 'search-eye', label: 'Find Eye Care', icon: FaEye, color: 'text-violet-600', bgColor: 'bg-violet-50', href: `${base}/search/optometrists` },
    { id: 'search-nutrition', label: 'Find Nutrition', icon: FaAppleAlt, color: 'text-yellow-600', bgColor: 'bg-yellow-50', href: `${base}/search/nutritionists` },
    { id: 'search-lab', label: 'Find Lab Tests', icon: FaFlask, color: 'text-cyan-600', bgColor: 'bg-cyan-50', href: `${base}/search/lab` },
    { id: 'search-emergency', label: 'Emergency Services', icon: FaAmbulance, color: 'text-red-600', bgColor: 'bg-red-50', href: `${base}/search/emergency` },
    { id: 'search-medicines', label: 'Buy Medicines', icon: FaCapsules, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/search/medicines` },
  ]
}
