import HeroSection from '@/components/home/HeroSection'
import ProviderTypesSection from '@/components/home/ProviderTypesSection'
import MarketplaceTwoColumn from '@/components/home/MarketplaceTwoColumn'
import CommunityPosts from '@/components/home/CommunityPosts'
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
 const statsContent = sectionMap['stats'] as { items: { number: string; label: string; color?: string }[] } | undefined

 const slides: HeroSlide[] = heroSlides.map((s: { id: string; title: string; subtitle: string | null; imageUrl: string; sortOrder: number }) => ({
 id: s.id,
 title: s.title,
 subtitle: s.subtitle,
 imageUrl: s.imageUrl,
 sortOrder: s.sortOrder,
 }))

 // Priority order: book-a-provider + shop-health-products at the top
 // (primary marketplace), then stats + community suggestions, then AI
 // agent (replaces static FAQ) and value proposition.
 // The MediWyzAgentSection (static FAQ/chat) has been removed — replaced
 // by the FloatingChatWidget available on every page (see app/layout.tsx).
 const sections = [
 <HeroSection key="hero" content={heroContent} slides={slides.length > 0 ? slides : undefined} />,
 <ProviderTypesSection key="services" />,
 <MarketplaceTwoColumn key="marketplace" />,
 <CommunityPosts key="community" />,
 ]

 const labels = ['Welcome', 'Services', 'Marketplace', 'Community']

 return (
 <LandingPageContent sections={sections} labels={labels} />
 )
}
