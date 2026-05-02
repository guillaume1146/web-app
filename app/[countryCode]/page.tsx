import { notFound } from 'next/navigation'
import HeroSection from '@/components/home/HeroSection'
import MarketplaceTwoColumn from '@/components/home/MarketplaceTwoColumn'
import CommunityPosts from '@/components/home/CommunityPosts'
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
 const apiUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
 // Fetch country-specific AND global content from NestJS API
 const [countrySectionsRes, globalSectionsRes, countrySlidesRes, globalSlidesRes] = await Promise.all([
   fetch(`${apiUrl}/api/cms/sections?countryCode=${countryCode}`, { next: { revalidate: 60 } }),
   fetch(`${apiUrl}/api/cms/sections`, { next: { revalidate: 60 } }),
   fetch(`${apiUrl}/api/cms/hero-slides?countryCode=${countryCode}`, { next: { revalidate: 60 } }),
   fetch(`${apiUrl}/api/cms/hero-slides`, { next: { revalidate: 60 } }),
 ])
 const [countrySections, globalSections, countrySlides, globalSlides] = await Promise.all([
   countrySectionsRes.json(), globalSectionsRes.json(), countrySlidesRes.json(), globalSlidesRes.json(),
 ])

 // Merge: global first, then country-specific overrides
 const sectionMap: Record<string, unknown> = { ...(globalSections.data?.sectionMap || {}), ...(countrySections.data?.sectionMap || {}) }
 const heroSlides = (countrySlides.data?.length > 0) ? countrySlides.data : (globalSlides.data || [])

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
 <MarketplaceTwoColumn />
 <CommunityPosts />
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
