import HeroSection from '@/components/home/HeroSection'
import ServicesSection from '@/components/home/ServicesSection'
import HealthShopMarketplace from '@/components/home/HealthShopMarketplace'
import CommunityPosts from '@/components/home/CommunityPosts'
import ProvidersSection from '@/components/home/ProvidersSection'
import LandingPageContent from '@/components/home/LandingPageContent'
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

 const slides: HeroSlide[] = heroSlides.map((s: { id: string; title: string; subtitle: string | null; imageUrl: string; sortOrder: number }) => ({
 id: s.id,
 title: s.title,
 subtitle: s.subtitle,
 imageUrl: s.imageUrl,
 sortOrder: s.sortOrder,
 }))

 const sections = [
 <HeroSection key="hero" content={heroContent} slides={slides.length > 0 ? slides : undefined} />,
 <ServicesSection key="services" />,
 <HealthShopMarketplace key="health-shop" />,
 <CommunityPosts key="community" />,
 <ProvidersSection key="providers" />,
 ]

 const labels = ['Welcome', 'Services', 'Health Shop', 'Community', 'Providers']

 return (
 <LandingPageContent sections={sections} labels={labels} />
 )
}
