import prisma from '@/lib/db'
import HeroSection from '@/components/home/HeroSection'
import StatsSection from '@/components/home/StatsSection'
import ServicesSection from '@/components/home/ServicesSection'
import SpecialtiesSection from '@/components/home/SpecialtiesSection'
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
  const servicesContent = sectionMap['services'] as { title: string; subtitle: string; items: { id: number; title: string; description: string; icon: string; gradient: string }[] } | undefined
  const specialtiesContent = sectionMap['specialties'] as { title: string; subtitle: string; items: { id: number; name: string; icon: string; color: string }[] } | undefined
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
    <ServicesSection key="services" title={servicesContent?.title} subtitle={servicesContent?.subtitle} items={servicesContent?.items} />,
    <SpecialtiesSection key="specialties" title={specialtiesContent?.title} subtitle={specialtiesContent?.subtitle} items={specialtiesContent?.items} />,
    <WhyChooseSection key="why" title={whyChooseContent?.title} subtitle={whyChooseContent?.subtitle} items={whyChooseContent?.items} />,
    <FaqSection key="faq" />,
  ]

  const labels = ['Welcome', 'Our Impact', 'Services', 'Specialties', 'Why MediWyz', 'FAQ']

  return (
    <LandingPageContent sections={sections} labels={labels} />
  )
}
