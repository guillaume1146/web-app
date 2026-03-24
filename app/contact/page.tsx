import type { Metadata } from 'next'
import PageHeader from '@/components/shared/PageHeader'

export const metadata: Metadata = {
 title: 'Contact Us',
 description: 'Get in touch with the MediWyz support team. We are here to help with appointments, technical support, provider inquiries, and partnership opportunities.',
 openGraph: {
 title: 'Contact MediWyz Support',
 description: 'Reach out to our healthcare support team for help with your account, consultations, or any questions.',
 },
}
import ContactForm from '@/components/forms/ContactForm'

export default function ContactPage() {
 return (
 <>
 <PageHeader
 title="Contact Us"
 description="Get in touch with our healthcare support team"
 />
 
 <div className="container mx-auto px-4 py-12">
 <div className="max-w-xl mx-auto">
 <ContactForm />
 </div>
 </div>
 </>
 )
}