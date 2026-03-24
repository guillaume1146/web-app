'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useAppConfig } from '@/hooks/useAppConfig'
import SearchAutocomplete from '@/components/search/SearchAutocomplete'

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
 <section className="relative overflow-hidden py-6 sm:py-8 lg:py-14"
 style={{
 background: '#001E40'
 }}
 >
 <div className="container mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 items-center">
 <motion.div 
 variants={containerVariants}
 initial="hidden"
 animate="visible"
 className="w-full order-1 lg:order-1 lg:col-span-6 text-center lg:text-left"
 >
 <motion.div 
 variants={itemVariants}
 className="inline-flex items-center bg-white/10 rounded-lg px-3 sm:px-4 py-2 mb-4 sm:mb-6 border border-white/20"
 >
 <CountryFlag countryCode={countryCode} className="mr-2 sm:mr-3" />
 <motion.span 
 className="text-xs sm:text-sm font-medium text-brand-sky"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 1.2, duration: 0.5 }}
 >
 {content?.platformBadge || config.platformDescription}
 </motion.span>
 </motion.div>

 <motion.h1
 variants={itemVariants}
 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight text-white"
 >
 {(content?.mainTitle || config.heroTitle).split(',').map((part, index) => (
 <span
 key={index}
 className={index === 1 ? "text-brand-sky" : ""}
 >
 {part.trim()}
 {index === 0 && ','}
 {index === 0 && <br />}
 </span>
 ))}
 </motion.h1>

 <motion.p
 variants={itemVariants}
 className="text-base text-left sm:text-lg lg:text-xl mb-6 sm:mb-8 text-gray-300 leading-relaxed px-2 lg:px-0 max-w-xl sm:mx-auto lg:mx-0 line-clamp-3 sm:line-clamp-none"
 >
 {content?.subtitle || 'Connect with qualified doctors, get AI-powered health insights, and access medicines across Mauritius. Your trusted healthcare companion.'}
 </motion.p>
 
 {/* Search with Autocomplete */}
 <motion.div
 variants={itemVariants}
 className="w-full max-w-2xl mx-auto lg:mx-0 mb-6 sm:mb-8"
 >
 <SearchAutocomplete
 variant="hero"
 placeholder={content?.searchPlaceholder || "Search doctors, medicines, nurses..."}
 />
 </motion.div>

 {/* Action Buttons - Responsive Grid */}
 <motion.div 
 variants={containerVariants}
 className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto lg:mx-0"
 >
 {(content?.ctaButtons || [
 { icon: "👨‍⚕️", label: "Find Doctors", shortLabel: "Doctors" },
 { icon: "💊", label: "Buy Medicines", shortLabel: "Medicines" },
 { icon: "🤖", label: "AI Health Assistant", shortLabel: "AI Health" }
 ]).map((button) => (
 <motion.button
 key={button.label}
 variants={itemVariants}
 className="bg-white/10 text-white border border-white/20 shadow-md hover:shadow-lg hover:bg-white/20 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base"
 >
 <span className="text-base sm:text-lg">{button.icon}</span>
 <span className="block sm:hidden">{button.shortLabel}</span>
 <span className="hidden sm:block">{button.label}</span>
 </motion.button>
 ))}
 </motion.div>
 </motion.div>

 <motion.div
 className="w-full order-2 lg:order-2 lg:col-span-6"
 initial={{ opacity: 0, x: 100 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{
 duration: 1.0,
 delay: 0.3,
 type: "spring",
 stiffness: 50,
 damping: 15
 }}
 >
 <div className="relative w-full aspect-[5/4]">
 
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
 className="object-center"
 sizes="(max-width: 640px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 70vw"
 priority={currentImageIndex === 0}
 />
 
 <div
 className="absolute inset-0 opacity-15"
 style={{ background: "linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, transparent 60%)" }}
 />
 
 {/* Image Title */}
 <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
 <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 sm:p-4 border border-gray-200">
 <h3 className="text-base sm:text-xl font-bold mb-1 text-gray-900">
 {heroImages[currentImageIndex].title}
 </h3>
 <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
 {heroImages[currentImageIndex].alt}
 </p>
 </div>
 </div>
 </div>
 </motion.div>
 </AnimatePresence>
 
 {/* Carousel Indicators */}
 <div className="absolute -bottom-8 sm:-bottom-10 left-1/2 transform -translate-x-1/2 flex gap-2 sm:gap-3">
 {heroImages.map((_, index) => (
 <button
 key={index}
 onClick={() => setCurrentImageIndex(index)}
 aria-label={`Go to slide ${index + 1}`}
 className={`h-2 sm:h-3 rounded-full transition-all duration-300 ${
 index === currentImageIndex
 ? 'bg-brand-navy w-8 sm:w-10 shadow-lg scale-110'
 : 'bg-gray-300 hover:bg-gray-400 w-2 sm:w-3'
 }`}
 />
 ))}
 </div>

 </div>
 </motion.div>
 </div>
 </div>
 </section>
 )
}

export default HeroSection