import { SPECIALTIES } from '@/lib/constants'
import SpecialtyItem from '@/components/shared/SpecialtyItem'
import { Specialty } from '@/types'

interface SpecialtiesSectionProps {
 title?: string
 subtitle?: string
 items?: Specialty[]
}

const SpecialtiesSection: React.FC<SpecialtiesSectionProps> = ({ title, subtitle, items }) => {
 const data = items || SPECIALTIES

 return (
 <section className="py-16 bg-white">
 <div className="container mx-auto px-4">
 <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
 {title || 'Medical Specialties'}
 </h2>
 <p className="text-center text-gray-600 mb-12">
 {subtitle || 'Find doctors across various specialties and get expert care'}
 </p>

 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
 {data.map((specialty) => (
 <SpecialtyItem key={specialty.id} {...specialty} />
 ))}
 </div>
 </div>
 </section>
 )
}

export default SpecialtiesSection