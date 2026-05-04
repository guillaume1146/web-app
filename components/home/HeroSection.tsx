'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useAppConfig } from '@/hooks/useAppConfig'
import HeroBookingWidget from '@/components/home/HeroBookingWidget'

// ─── Flag mini-icons ──────────────────────────────────────────────────────────

const flags: Record<string, React.ReactNode> = {
  MU: (
    <div className="inline-flex flex-col rounded-sm overflow-hidden">
      <div className="h-1.5 w-6 bg-red-600" />
      <div className="h-1.5 w-6 bg-brand-navy" />
      <div className="h-1.5 w-6 bg-yellow-400" />
      <div className="h-1.5 w-6 bg-green-600" />
    </div>
  ),
  MG: (
    <div className="inline-flex rounded-sm overflow-hidden">
      <div className="w-2 h-6 bg-white" />
      <div className="inline-flex flex-col">
        <div className="h-3 w-4 bg-red-600" />
        <div className="h-3 w-4 bg-green-600" />
      </div>
    </div>
  ),
  KE: (
    <div className="inline-flex flex-col rounded-sm overflow-hidden">
      <div className="h-1.5 w-6 bg-black" />
      <div className="h-0.5 w-6 bg-white" />
      <div className="h-1.5 w-6 bg-red-600" />
      <div className="h-0.5 w-6 bg-white" />
      <div className="h-1.5 w-6 bg-green-700" />
    </div>
  ),
  FR: (
    <div className="inline-flex rounded-sm overflow-hidden">
      <div className="w-2 h-6 bg-blue-700" />
      <div className="w-2 h-6 bg-white" />
      <div className="w-2 h-6 bg-red-600" />
    </div>
  ),
}

function CountryFlag({ countryCode, className = '' }: { countryCode: string; className?: string }) {
  return <div className={className}>{flags[countryCode] || flags.MU}</div>
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HeroSectionProps {
  content?: {
    mainTitle?: string
    highlightWord?: string
    subtitle?: string
    platformBadge?: string
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

// ─── Image animation variants ─────────────────────────────────────────────────

const imageVariants = {
  enter:  { opacity: 0, scale: 1.06 },
  center: { opacity: 1, scale: 1, transition: { duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  exit:   { opacity: 0, scale: 0.97, transition: { duration: 0.5, ease: [0.55, 0.085, 0.68, 0.53] as const } },
}

// ─── Component ────────────────────────────────────────────────────────────────

const HeroSection: React.FC<HeroSectionProps> = ({ content, slides, countryCode = 'MU' }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { config } = useAppConfig()

  const defaultHeroImages = [
    { src: '/images/hero/gemini-doctor-3-removebg-1.png', alt: 'Specialist Medical Doctor',  title: 'Medical Specialists',      description: 'Consult verified specialists across 15+ fields' },
    { src: '/images/hero/medicine-1.png',                 alt: 'Buy medicines online',        title: 'Medicine Store',           description: 'Order prescriptions & wellness products online' },
    { src: '/images/hero/doctor-1.png',                   alt: 'Professional Doctor',         title: 'Expert Medical Care',      description: 'Qualified professionals at your service' },
    { src: '/images/hero/ambulance-1.png',                alt: 'Emergency Ambulance',         title: 'Emergency Services',       description: 'Rapid response when every second counts' },
    { src: '/images/hero/insurance-1.png',                alt: 'Health Insurance',            title: 'Insurance Protection',     description: 'Coverage plans for individuals & families' },
    { src: '/images/hero/nurse-1.png',                    alt: 'Professional Nurse',          title: 'Nursing Excellence',       description: 'Home visits & ongoing health monitoring' },
    { src: '/images/hero/doctor-2.png',                   alt: 'Experienced Doctor',          title: 'Healthcare Professionals', description: 'Trusted providers verified by MediWyz' },
    { src: '/images/hero/patient-1.png',                  alt: 'Patient Care',                title: 'Patient-Centered Care',   description: 'Your health journey, our commitment' },
  ]

  const heroImages = slides
    ? slides.map(s => ({ src: s.imageUrl, alt: s.subtitle || s.title, title: s.title, description: s.subtitle ?? undefined }))
    : defaultHeroImages

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % heroImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [heroImages.length])

  const titleParts = (content?.mainTitle || config.heroTitle || 'Healthcare, Reimagined').split(',')

  return (
    <section
      className="overflow-hidden"
      style={{ background: '#001E40', minHeight: 520 }}
    >
      {/* ── 3-column flex row — fills the hero height ─────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-stretch" style={{ minHeight: 'inherit' }}>

        {/* ── COL 1: Platform description (left, ~37%) ─────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="lg:flex-[37] flex flex-col justify-center
            px-5 sm:px-8 lg:px-10 xl:px-12
            py-8 sm:py-10 lg:py-0"
        >
          {/* Country flag + platform badge */}
          <div className="inline-flex self-start items-center bg-white/10 rounded-lg px-3 py-1.5 mb-4 border border-white/20">
            <CountryFlag countryCode={countryCode} className="mr-2" />
            <span className="text-xs font-semibold text-brand-sky tracking-wide uppercase">
              {content?.platformBadge || config.platformDescription || "Africa's #1 HealthTech Platform"}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold mb-3 leading-[1.08] text-white">
            {titleParts.map((part, i) => (
              <span key={i} className={i === 1 ? 'text-brand-sky' : ''}>
                {part.trim()}
                {i === 0 && titleParts.length > 1 && ','}{i === 0 && titleParts.length > 1 && <br />}
              </span>
            ))}
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-md">
            {content?.subtitle ||
              "Africa's most trusted health platform. Book verified specialists, get AI-powered insights, and access pharmacy — all in one place."}
          </p>

          {/* Trust stats */}
          <div className="flex flex-wrap gap-5 mt-5">
            {[
              { value: '500+', label: 'Verified Providers' },
              { value: '15+', label: 'Specialties' },
              { value: '6', label: 'Countries' },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-xl font-black text-white leading-none">{stat.value}</span>
                <span className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── COL 2: Booking widget — fills full height (center, ~36%) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          className="lg:flex-[36] flex flex-col
            border-t lg:border-t-0 lg:border-l lg:border-r border-white/10"
        >
          <HeroBookingWidget fullHeight />
        </motion.div>

        {/* ── COL 3: Image animation + caption (right, ~27%) ───────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="hidden lg:flex lg:flex-[27] relative overflow-hidden"
        >
          {/* Animated image carousel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentImageIndex}
              variants={imageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0"
            >
              <Image
                src={heroImages[currentImageIndex].src}
                alt={heroImages[currentImageIndex].alt}
                fill
                className="object-cover object-center"
                sizes="27vw"
                priority={currentImageIndex === 0}
              />
            </motion.div>
          </AnimatePresence>

          {/* Bottom gradient for caption legibility */}
          <div
            className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-10"
            style={{ background: 'linear-gradient(to top, rgba(0,10,30,0.95) 0%, rgba(0,10,30,0.5) 60%, transparent 100%)' }}
          />

          {/* Image caption — animates with each slide */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-10 z-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={`caption-${currentImageIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4 }}
                className="flex items-start gap-2"
              >
                <div className="w-0.5 h-8 rounded-full bg-brand-sky flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white leading-tight">
                    {heroImages[currentImageIndex].title}
                  </p>
                  {heroImages[currentImageIndex].description && (
                    <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">
                      {heroImages[currentImageIndex].description}
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Carousel dots */}
            <div className="flex gap-1.5 mt-3">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  aria-label={`Slide ${index + 1}`}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    index === currentImageIndex
                      ? 'bg-white w-5'
                      : 'bg-white/30 hover:bg-white/50 w-1'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}

export default HeroSection
