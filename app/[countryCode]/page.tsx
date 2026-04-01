import { notFound } from 'next/navigation'
import prisma from '@/lib/db'
import HeroSection from '@/components/home/HeroSection'
import StatsSection from '@/components/home/StatsSection'
import ProviderMarketplace from '@/components/home/ProviderMarketplace'
import HealthShopMarketplace from '@/components/home/HealthShopMarketplace'
import DetailedServicesSection from '@/components/home/DetailedServicesSection'
import CommunityPosts from '@/components/home/CommunityPosts'
import WhyChooseSection from '@/components/home/WhyChooseSection'
import ProfessionalBanner from '@/components/shared/ProfessionalBanner'
import { HeroContent, HeroSlide } from '@/types'

export const revalidate = 60

const VALID_COUNTRY_CODES = [
 'MG', // Madagascar
 'KE', // Kenya
 'IN', // India
 'FR', // France
 'DE', // Germany
 'GB', // United Kingdom
 'US', // United States
 'ZA', // South Africa
 'MU', // Mauritius
 'SC', // Seychelles
 'TZ', // Tanzania
 'UG', // Uganda
 'NG', // Nigeria
 'GH', // Ghana
 'SN', // Senegal
 'MA', // Morocco
 'EG', // Egypt
 'AE', // UAE
]

async function getCmsData(countryCode: string) {
 try {
 // Fetch country-specific AND global content in parallel
 const [countrySections, globalSections, countrySlides, globalSlides] = await Promise.all([
 prisma.cmsSection.findMany({ where: { isVisible: true, countryCode }, orderBy: { sortOrder: 'asc' } }),
 prisma.cmsSection.findMany({ where: { isVisible: true, countryCode: null }, orderBy: { sortOrder: 'asc' } }),
 prisma.cmsHeroSlide.findMany({ where: { isActive: true, countryCode }, orderBy: { sortOrder: 'asc' } }),
 prisma.cmsHeroSlide.findMany({ where: { isActive: true, countryCode: null }, orderBy: { sortOrder: 'asc' } }),
 ])

 // Merge: country-specific sections override global, fallback to global for missing types
 const sectionMap: Record<string, unknown> = {}
 for (const section of globalSections) {
 sectionMap[section.sectionType] = section.content
 }
 for (const section of countrySections) {
 sectionMap[section.sectionType] = section.content // override global
 }

 // Use country slides if available, otherwise fall back to global
 const heroSlides = countrySlides.length > 0 ? countrySlides : globalSlides

 return { sectionMap, heroSlides }
 } catch {
 return { sectionMap: {}, heroSlides: [] }
 }
}

export default async function CountryHomePage({
 params,
}: {
 params: Promise<{ countryCode: string }>
}) {
 const { countryCode: rawCode } = await params
 const countryCode = rawCode.toUpperCase()

 if (!VALID_COUNTRY_CODES.includes(countryCode)) {
 notFound()
 }

 const { sectionMap, heroSlides } = await getCmsData(countryCode)

 const heroContent = sectionMap['hero'] as HeroContent | undefined
 const statsContent = sectionMap['stats'] as { items: { number: string; label: string; color?: string }[] } | undefined
 const servicesContent = sectionMap['services'] as { title: string; subtitle: string; items: { id: number; title: string; description: string; icon: string; gradient: string }[] } | undefined
 const detailedContent = sectionMap['detailed_services'] as Record<string, unknown> | undefined
 const specialtiesContent = sectionMap['specialties'] as { title: string; subtitle: string; items: { id: number; name: string; icon: string; color: string }[] } | undefined
 const whyChooseContent = sectionMap['why_choose'] as { title: string; subtitle: string; items: { icon: string; title: string; description: string }[] } | undefined
 const ctaContent = sectionMap['cta_banner'] as { title: string; description: string; primaryButton?: string; secondaryButton?: string } | undefined

 const slides: HeroSlide[] = heroSlides.map((s: { id: string; title: string; subtitle: string | null; imageUrl: string; sortOrder: number }) => ({
 id: s.id,
 title: s.title,
 subtitle: s.subtitle,
 imageUrl: s.imageUrl,
 sortOrder: s.sortOrder,
 }))

 return (
 <>
 <HeroSection content={heroContent} slides={slides.length > 0 ? slides : undefined} countryCode={countryCode} />
 <StatsSection />
 <ProviderMarketplace />
 <HealthShopMarketplace />
 <CommunityPosts />
 <DetailedServicesSection content={detailedContent} />
 <WhyChooseSection
 title={whyChooseContent?.title}
 subtitle={whyChooseContent?.subtitle}
 items={whyChooseContent?.items}
 />
 <div className="container mx-auto px-4">
 <ProfessionalBanner
 title={ctaContent?.title || "Ready to Take Control of Your Health?"}
 description={ctaContent?.description || "Join thousands of Mauritians who trust MediWyz for their healthcare needs. Start your journey to better health today."}
 primaryButton={ctaContent?.primaryButton || "Schedule Consultation"}
 secondaryButton={ctaContent?.secondaryButton || "Learn More"}
 />
 </div>
 </>
 )
}
