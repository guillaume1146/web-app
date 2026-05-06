import dynamic from 'next/dynamic'
import HeroSection from '@/components/home/HeroSection'
import CompanyTrustBar from '@/components/home/CompanyTrustBar'
import DiscoverSection from '@/components/home/DiscoverSection'

// Lazy-load the map section — it loads the Google Maps JS SDK which is heavy
const NearMeSection = dynamic(() => import('@/components/home/NearMeSection'), { ssr: false })

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CompanyTrustBar />
      <NearMeSection />
      <DiscoverSection />
    </>
  )
}
