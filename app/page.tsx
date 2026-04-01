import prisma from '@/lib/db'
import HeroSection from '@/components/home/HeroSection'
import StatsSection from '@/components/home/StatsSection'
import ProviderMarketplace from '@/components/home/ProviderMarketplace'
import HealthShopMarketplace from '@/components/home/HealthShopMarketplace'
import WhyChooseSection from '@/components/home/WhyChooseSection'
import FaqSection from '@/components/home/FaqSection'
import LandingPageContent from '@/components/home/LandingPageContent'
import { HeroContent, HeroSlide } from '@/types'

export const revalidate = 60

async function getCmsData() {
 try {
 const [sections, heroSlides] = await Promise.all([
 prisma.cmsSection.findMany({
 where: { isVisible: true, countryCode: null },
 orderBy: { sortOrder: 'asc' },
 }),
 prisma.cmsHeroSlide.findMany({
 where: { isActive: true, countryCode: null },
 orderBy: { sortOrder: 'asc' },
 }),
 ])

 const sectionMap: Record<string, unknown> = {}
 for (const section of sections) {
 sectionMap[section.sectionType] = section.content
 }

 return { sectionMap, heroSlides }
 } catch {
 return { sectionMap: {}, heroSlides: [] }
 }
}

export default async function HomePage() {
 const { sectionMap, heroSlides } = await getCmsData()

 const heroContent = sectionMap['hero'] as HeroContent | undefined
 const statsContent = sectionMap['stats'] as { items: { number: string; label: string; color?: string }[] } | undefined
 const whyChooseContent = sectionMap['why_choose'] as { title: string; subtitle: string; items: { icon: string; title: string; description: string }[] } | undefined

 const slides: HeroSlide[] = heroSlides.map((s: { id: string; title: string; subtitle: string | null; imageUrl: string; sortOrder: number }) => ({
 id: s.id,
 title: s.title,
 subtitle: s.subtitle,
 imageUrl: s.imageUrl,
 sortOrder: s.sortOrder,
 }))

 const sections = [
 <HeroSection key="hero" content={heroContent} slides={slides.length > 0 ? slides : undefined} />,
 <StatsSection key="stats" />,
 <ProviderMarketplace key="providers" />,
 <HealthShopMarketplace key="shop" />,
 <WhyChooseSection key="why" title={whyChooseContent?.title} subtitle={whyChooseContent?.subtitle} items={whyChooseContent?.items} />,
 <FaqSection key="faq" />,
 ]

 const labels = ['Welcome', 'Our Impact', 'Providers', 'Health Shop', 'Why MediWyz', 'FAQ']

 return (
 <LandingPageContent sections={sections} labels={labels} />
 )
}
