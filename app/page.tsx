import HeroSection from '@/components/home/HeroSection'
import CompanyTrustBar from '@/components/home/CompanyTrustBar'
import DiscoverSection from '@/components/home/DiscoverSection'
import { HeroContent, HeroSlide } from '@/types'

export const revalidate = 60

async function getCmsData() {
  try {
    const apiUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const [sectionsRes, slidesRes] = await Promise.all([
      fetch(`${apiUrl}/api/cms/sections`, { next: { revalidate: 60 } }),
      fetch(`${apiUrl}/api/cms/hero-slides`, { next: { revalidate: 60 } }),
    ])
    const sectionsJson = await sectionsRes.json()
    const slidesJson = await slidesRes.json()
    return {
      sectionMap: sectionsJson.data?.sectionMap || {},
      heroSlides: slidesJson.data || [],
    }
  } catch {
    return { sectionMap: {}, heroSlides: [] }
  }
}

export default async function HomePage() {
  const { sectionMap, heroSlides } = await getCmsData()

  const heroContent = sectionMap['hero'] as HeroContent | undefined

  const slides: HeroSlide[] = heroSlides.map((s: {
    id: string; title: string; subtitle: string | null; imageUrl: string; sortOrder: number
  }) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    imageUrl: s.imageUrl,
    sortOrder: s.sortOrder,
  }))

  return (
    <>
      <HeroSection content={heroContent} slides={slides.length > 0 ? slides : undefined} />
      <CompanyTrustBar />
      <DiscoverSection />
    </>
  )
}
