'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useAppConfig } from '@/hooks/useAppConfig'
import SearchAutocomplete from '@/components/search/SearchAutocomplete'

// ─── Stats strip data types ──────────────────────────────────────────────
interface StatItem { number: string | number; label: string; icon?: string }
const LOADING_STATS: StatItem[] = [
  { icon: '🩺', label: 'Providers', number: '—' },
  { icon: '👥', label: 'Patients', number: '—' },
  { icon: '🏥', label: 'Specialties', number: '—' },
  { icon: '💊', label: 'Products', number: '—' },
  { icon: '📋', label: 'Consultations', number: '—' },
  { icon: '🌍', label: 'Regions', number: '—' },
]
function fmtNum(n: string | number): string {
  const v = typeof n === 'string' ? parseInt(n) : n
  if (isNaN(v)) return String(n)
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M+`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K+`
  return v.toLocaleString()
}

// Country flag components
const flags: Record<string, React.ReactNode> = {
 MU: ( // Mauritius
 <div className="inline-flex flex-col rounded-sm overflow-hidden">
 <div className="h-1.5 w-6 bg-red-600" />
 <div className="h-1.5 w-6 bg-brand-navy" />
 <div className="h-1.5 w-6 bg-yellow-400" />
 <div className="h-1.5 w-6 bg-green-600" />
 </div>
 ),
 MG: ( // Madagascar
 <div className="inline-flex rounded-sm overflow-hidden">
 <div className="w-2 h-6 bg-white" />
 <div className="inline-flex flex-col">
 <div className="h-3 w-4 bg-red-600" />
 <div className="h-3 w-4 bg-green-600" />
 </div>
 </div>
 ),
 KE: ( // Kenya
 <div className="inline-flex flex-col rounded-sm overflow-hidden">
 <div className="h-1.5 w-6 bg-black" />
 <div className="h-0.5 w-6 bg-white" />
 <div className="h-1.5 w-6 bg-red-600" />
 <div className="h-0.5 w-6 bg-white" />
 <div className="h-1.5 w-6 bg-green-700" />
 </div>
 ),
 IN: ( // India
 <div className="inline-flex flex-col rounded-sm overflow-hidden">
 <div className="h-2 w-6 bg-orange-500" />
 <div className="h-2 w-6 bg-white" />
 <div className="h-2 w-6 bg-green-600" />
 </div>
 ),
 FR: ( // France
 <div className="inline-flex rounded-sm overflow-hidden">
 <div className="w-2 h-6 bg-blue-700" />
 <div className="w-2 h-6 bg-white" />
 <div className="w-2 h-6 bg-red-600" />
 </div>
 ),
}

function CountryFlag({ countryCode, className = "" }: { countryCode: string; className?: string }) {
 return <div className={className}>{flags[countryCode] || flags.MU}</div>
}

interface HeroSectionProps {
 content?: {
 mainTitle?: string
 highlightWord?: string
 subtitle?: string
 platformBadge?: string
 searchPlaceholder?: string
 ctaButtons?: Array<{ icon: string; label: string; shortLabel: string }>
 }
 slides?: Array<{
 id: string
 title: string
 subtitle?: string | null
 imageUrl: string
 sortOrder: number
 }>
 countryCode?: string
}

const HeroSection: React.FC<HeroSectionProps> = ({ content, slides, countryCode = 'MU' }) => {
 const [currentImageIndex, setCurrentImageIndex] = useState(0)
 const { config } = useAppConfig()
 const [heroStats, setHeroStats] = useState<StatItem[]>(LOADING_STATS)

 useEffect(() => {
  fetch('/api/stats')
   .then(r => r.json())
   .then(d => { if (d.success && d.data) setHeroStats(d.data) })
   .catch(() => {})
 }, [])

 const defaultHeroImages = [
 {
 src: "/images/hero/gemini-doctor-3-removebg-1.png",
 alt: "Specialist Medical Doctor",
 title: "Medical Specialists"
 },
 {
 src: "/images/hero/medicine-1.png",
 alt: "Browse and purchase medicines with doctor's prescription. Fast delivery across Mauritius.",
 title: "Medicine Store"
 },
 {
 src: "/images/hero/doctor-1.png",
 alt: "Professional Doctor Consultation",
 title: "Expert Medical Care"
 },
 {
 src: "/images/hero/ambulance-1.png",
 alt: "Emergency Ambulance Service",
 title: "Emergency Services"
 },
 {
 src: "/images/hero/insurance-1.png",
 alt: "Health Insurance Coverage",
 title: "Insurance Protection"
 },
 {
 src: "/images/hero/nurse-1.png",
 alt: "Professional Nurse Care",
 title: "Nursing Excellence"
 },
 {
 src: "/images/hero/doctor-2.png",
 alt: "Experienced Medical Doctor",
 title: "Healthcare Professionals"
 },
 {
 src: "/images/hero/patient-1.png",
 alt: "Patient Care Services",
 title: "Patient-Centered Care"
 }
 ]

 const heroImages = slides
 ? slides.map((s) => ({ src: s.imageUrl, alt: s.subtitle || s.title, title: s.title }))
 : defaultHeroImages

 useEffect(() => {
 const interval = setInterval(() => {
 setCurrentImageIndex((prev) => (prev + 1) % heroImages.length)
 }, 5000)
 return () => clearInterval(interval)
 }, [heroImages.length])

 // Animation variants
 const containerVariants = {
 hidden: { opacity: 0 },
 visible: {
 opacity: 1,
 transition: {
 staggerChildren: 0.2,
 delayChildren: 0.1
 }
 }
 }

 const itemVariants = {
 hidden: { opacity: 0, y: 50, scale: 0.9 },
 visible: {
 opacity: 1,
 y: 0,
 scale: 1,
 transition: {
 type: "spring" as const,
 stiffness: 100,
 damping: 12
 }
 }
 }

 const imageVariants = {
 enter: {
 opacity: 0,
 scale: 1.05,
 },
 center: {
 opacity: 1,
 scale: 1,
 transition: {
 duration: 0.8,
 ease: [0.25, 0.46, 0.45, 0.94] as const,
 }
 },
 exit: {
 opacity: 0,
 scale: 0.95,
 transition: {
 duration: 0.5,
 ease: [0.55, 0.085, 0.68, 0.53] as const
 }
 }
 }

 return (
 <section className="relative overflow-hidden py-4 sm:py-5 lg:py-6"
   style={{ background: '#001E40' }}
 >
 <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14">
   {/*
     3-column layout on desktop — makes the hero significantly shorter
     because content spreads horizontally instead of stacking vertically.

     Mobile: stacks top→bottom in order: text | image | search+CTA
     Desktop: [Col 1: badge+title+desc] [Col 2: image] [Col 3: search+CTA]
              4/12                        4/12            4/12
   */}
   <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center">

     {/* COL 1 — Platform identity: badge, title, description */}
     <motion.div
       variants={containerVariants}
       initial="hidden"
       animate="visible"
       className="order-1 lg:col-span-4 text-center lg:text-left"
     >
       {/* Flag + badge */}
       <motion.div
         variants={itemVariants}
         className="inline-flex items-center bg-white/10 rounded-lg px-3 py-1.5 mb-3 border border-white/20"
       >
         <CountryFlag countryCode={countryCode} className="mr-2" />
         <span className="text-xs font-medium text-brand-sky">
           {content?.platformBadge || config.platformDescription}
         </span>
       </motion.div>

       <motion.h1
         variants={itemVariants}
         className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight text-white"
       >
         {(content?.mainTitle || config.heroTitle || 'Healthcare, Simplified').split(',').map((part, index) => (
           <span key={index} className={index === 1 ? 'text-brand-sky' : ''}>
             {part.trim()}
             {index === 0 && ','}{index === 0 && <br />}
           </span>
         ))}
       </motion.h1>

       <motion.p
         variants={itemVariants}
         className="text-sm sm:text-base text-gray-300 leading-relaxed line-clamp-3"
       >
         {content?.subtitle || 'Connect with qualified doctors, get AI-powered health insights, and access medicines across Mauritius. Your trusted healthcare companion.'}
       </motion.p>
     </motion.div>

     {/* COL 2 — Doctor image carousel (centre, visual anchor) */}
     <motion.div
       className="order-3 lg:order-2 lg:col-span-4"
       initial={{ opacity: 0, scale: 0.95 }}
       animate={{ opacity: 1, scale: 1 }}
       transition={{ duration: 0.8, delay: 0.2 }}
     >
       <div className="relative w-full" style={{ height: '260px' }}>
         <AnimatePresence mode="wait">
           <motion.div
             key={currentImageIndex}
             variants={imageVariants}
             initial="enter"
             animate="center"
             exit="exit"
             className="absolute inset-0 rounded-2xl overflow-hidden"
           >
             <div className="relative w-full h-full">
               <Image
                 src={heroImages[currentImageIndex].src}
                 alt={heroImages[currentImageIndex].alt}
                 fill
                 className="object-contain object-center"
                 sizes="(max-width: 1024px) 90vw, 33vw"
                 priority={currentImageIndex === 0}
               />
               {/* No overlay — keep image fully visible */}
               {/* Caption */}
               <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                 <div className="bg-white/90 backdrop-blur-md rounded-lg px-3 py-2 border border-gray-200">
                   <p className="text-xs font-bold text-gray-900 truncate">
                     {heroImages[currentImageIndex].title}
                   </p>
                 </div>
               </div>
             </div>
           </motion.div>
         </AnimatePresence>

         {/* Carousel dots */}
         <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
           {heroImages.map((_, index) => (
             <button
               key={index}
               onClick={() => setCurrentImageIndex(index)}
               aria-label={`Slide ${index + 1}`}
               className={`h-1.5 rounded-full transition-all duration-300 ${
                 index === currentImageIndex
                   ? 'bg-white w-6 scale-110'
                   : 'bg-white/40 hover:bg-white/60 w-1.5'
               }`}
             />
           ))}
         </div>
       </div>
     </motion.div>

     {/* COL 3 — Search bar + CTA buttons */}
     <motion.div
       variants={containerVariants}
       initial="hidden"
       animate="visible"
       className="order-2 lg:order-3 lg:col-span-4 flex flex-col gap-3"
     >
       {/* Search */}
       <motion.div variants={itemVariants}>
         <SearchAutocomplete
           variant="hero"
           placeholder={content?.searchPlaceholder || 'Search doctors, medicines, nurses...'}
         />
       </motion.div>

       {/* CTA buttons — fixed links, always navigable */}
       <motion.div variants={containerVariants} className="flex flex-col gap-2">
         {([
           { icon: '🩺', label: 'Find Health Service Providers', href: '/search/results?category=providers' },
           { icon: '🛒', label: 'Health Shop', href: '/search/health-shop' },
           { icon: '🤖', label: 'AI Health Assistant', href: '/search/ai' },
         ] as const).map(button => (
           <motion.div key={button.href} variants={itemVariants}>
             <Link
               href={button.href}
               className="bg-white/10 text-white border border-white/20 hover:bg-white/20
                 px-4 py-2.5 rounded-xl font-semibold transition-all hover:scale-[1.02]
                 active:scale-95 flex items-center justify-center gap-2 text-sm w-full"
             >
               <span>{button.icon}</span>
               <span>{button.label}</span>
             </Link>
           </motion.div>
         ))}
       </motion.div>
     </motion.div>

   </div>{/* end 3-col grid */}

 {/* ─── Stats strip — spans full hero width, sits below the columns ─ */}
 <div className="mt-6 sm:mt-8 border-t border-white/10 pt-5 sm:pt-6">
  <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-1 scrollbar-hide
    sm:grid sm:grid-cols-5 lg:grid-cols-10 justify-items-center">
   {heroStats.map((s, i) => (
    <div key={i} className="flex-shrink-0 text-center min-w-[64px]">
     {s.icon && <div className="text-lg sm:text-xl mb-0.5">{s.icon}</div>}
     <div className="text-base sm:text-lg font-bold text-white">
      {fmtNum(s.number)}
     </div>
     <div className="text-[10px] sm:text-xs text-white/55 leading-tight mt-0.5">
      {s.label}
     </div>
    </div>
   ))}
  </div>
 </div>

 </div>{/* end container */}
 </section>
 )
}

export default HeroSection