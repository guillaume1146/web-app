import HeroSection from '@/components/home/HeroSection'
import CompanyTrustBar from '@/components/home/CompanyTrustBar'
import DiscoverSection from '@/components/home/DiscoverSection'
import NearMeSectionLoader from '@/components/home/NearMeSectionLoader'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <NearMeSectionLoader />
      <CompanyTrustBar />
      <DiscoverSection />
    </>
  )
}
