import { WHY_CHOOSE_REASONS } from '@/lib/constants'
import WhyChooseCard from '@/components/shared/WhyChooseCard'
import { WhyChooseReason } from '@/types'

interface WhyChooseSectionProps {
 title?: string
 subtitle?: string
 items?: WhyChooseReason[]
}

const WhyChooseSection: React.FC<WhyChooseSectionProps> = ({ title, subtitle, items }) => {
 const data = items || WHY_CHOOSE_REASONS

 return (
 <section className="py-16 bg-gray-50">
 <div className="container mx-auto px-4">
 <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
 {title || 'Why Choose MediWyz?'}
 </h2>
 <p className="text-center text-gray-600 mb-12">
 {subtitle || 'Trusted by thousands of Mauritians for quality healthcare'}
 </p>

 <div className="grid md:grid-cols-3 gap-8">
 {data.map((reason, index) => (
 <WhyChooseCard key={index} {...reason} />
 ))}
 </div>
 </div>
 </section>
 )
}

export default WhyChooseSection