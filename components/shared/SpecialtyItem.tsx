import { FaStethoscope, FaHeart, FaBrain, FaBaby, FaEye, FaTooth, FaFemale, FaUserMd } from 'react-icons/fa'
import type { SpecialtyItemProps } from '@/types'
import type { IconType } from 'react-icons'

const iconMap: Record<string, IconType> = {
 FaStethoscope: FaStethoscope,
 FaHeart: FaHeart,
 FaBrain: FaBrain,
 FaBaby: FaBaby,
 FaEye: FaEye,
 FaTooth: FaTooth,
 FaFemale: FaFemale,
 FaUserMd: FaUserMd,
}

const SpecialtyItem: React.FC<SpecialtyItemProps> = ({ name, icon, color }) => {
 const Icon = iconMap[icon]
 
 return (
 <div className="bg-white border-2 border-gray-200 rounded-xl p-6 text-center hover:border-primary-blue hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer">
 {Icon && <Icon className={`text-3xl ${color} mb-3 mx-auto`} />}
 <p className="text-sm font-medium text-gray-900">{name}</p>
 </div>
 )
}

export default SpecialtyItem