import { FaVideo, FaCalendarCheck, FaTruck, FaRobot } from 'react-icons/fa'
import type { ServiceCardProps } from '@/types'

const ServiceCard: React.FC<ServiceCardProps> = ({ title, description, icon}) => {
 // Define icon colors for each service
 const getIconColor = (iconType: string) => {
 switch (iconType) {
 case 'FaVideo':
 return 'text-blue-600' // Blue for Video Consultation
 case 'FaCalendarCheck':
 return 'text-green-600' // Green for Easy Appointment Booking
 case 'FaTruck':
 return 'text-purple-600' // Purple for Medicine Delivery
 case 'FaRobot':
 return 'text-orange-600' // Orange for AI Health Assistant
 default:
 return 'text-gray-600'
 }
 }

 // Render icons with appropriate colors
 const renderIcon = () => {
 const iconColor = getIconColor(icon)
 
 switch (icon) {
 case 'FaVideo':
 return <FaVideo className={`${iconColor} text-4xl`} />
 case 'FaCalendarCheck':
 return <FaCalendarCheck className={`${iconColor} text-4xl`} />
 case 'FaTruck':
 return <FaTruck className={`${iconColor} text-4xl`} />
 case 'FaRobot':
 return <FaRobot className={`${iconColor} text-4xl`} />
 default:
 return <FaVideo className={`${iconColor} text-4xl`} />
 }
 }
 
 return (
 <div className="bg-white rounded-2xl p-8 shadow-lg card-hover border border-gray-100">
 {/* Icon Container */}
 <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-gray-200">
 {renderIcon()}
 </div>
 
 {/* Content */}
 <h3 className="text-xl font-semibold mb-3 text-gray-900 text-center">{title}</h3>
 <p className="text-gray-600 text-center leading-relaxed">{description}</p>
 </div>
 )
}

export default ServiceCard