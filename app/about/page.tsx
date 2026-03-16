import type { Metadata } from 'next'
import PageHeader from '@/components/shared/PageHeader'

export const metadata: Metadata = {
  title: 'About MediWyz',
  description: 'Learn about MediWyz, the healthcare platform connecting patients with doctors, nurses, and health professionals across Mauritius through telemedicine and digital health services.',
  openGraph: {
    title: 'About MediWyz - Healthcare Platform for Mauritius',
    description: 'MediWyz connects patients with qualified healthcare providers through video consultations, e-prescriptions, and comprehensive health management.',
  },
}
import AboutSection from '@/components/home/AboutSection'
import MissionVisionSection from '@/components/home/MissionVisionSection'
import WhoWeAreSection from '@/components/home/WhoWeAreSection'
import ProfessionalBanner from '@/components/shared/ProfessionalBanner'
import { FaInfoCircle } from 'react-icons/fa'

export default function AboutPage() {
  return (
    <>
      <PageHeader
        icon={FaInfoCircle}
        title="About MediWyz"
        description="Learn about our mission to revolutionize healthcare in Mauritius through innovation, accessibility, and quality care."
      />
      
      <AboutSection />
      <MissionVisionSection />
      <WhoWeAreSection />
      
      <div className="container mx-auto px-4">
        <ProfessionalBanner
          title="Join Our Healthcare Revolution"
          description="Be part of our mission to make quality healthcare accessible to every Mauritian. Whether as a healthcare professional, partner, or patient, there's a place for you in our ecosystem."
          primaryButton="Get Started"
          secondaryButton="Contact Us"
        />
      </div>
    </>
  )
}