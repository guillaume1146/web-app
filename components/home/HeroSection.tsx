'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useAppConfig } from '@/hooks/useAppConfig'
import HeroBookingWidget from '@/components/home/HeroBookingWidget'

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

const imageVariants = {
  enter:  { opacity: 0, scale: 1.04 },
  center: { opacity: 1, scale: 1, transition: { duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  exit:   { opacity: 0, scale: 0.97, transition: { duration: 0.5, ease: [0.55, 0.085, 0.68, 0.53] as const } },
}

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
      className="relative overflow-visible"
      style={{ background: '#001E40', minHeight: 680 }}
    >
      {/* ── Full-width image carousel ─────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden rounded-none">
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
              className="object-contain object-right sm:object-right-bottom"
              sizes="100vw"
              priority={currentImageIndex === 0}
            />
          </motion.div>
        </AnimatePresence>

        {/* Left gradient — solid behind text + widget, fades before image zone */}
        <div
          className="absolute inset-y-0 left-0 right-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #001E40 55%, #001E40dd 65%, #001E4066 72%, transparent 80%)' }}
        />

        {/* Bottom gradient — caption legibility */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #001E40 0%, #001E4088 50%, transparent 100%)' }}
        />
      </div>

      {/* ── Layout: text dominant left, widget compact right, image far-right ── */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-10 xl:px-14 pt-8 sm:pt-10 lg:pt-12 pb-10 sm:pb-14 lg:pr-[18%]">
        <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-10">

          {/* LEFT: headline & subtitle — dominant, takes most of the space */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="flex-1 min-w-0 max-w-xl"
          >
            {/* Country flag + platform badge */}
            <div className="inline-flex items-center bg-white/10 rounded-lg px-3 py-1.5 mb-5 border border-white/20">
              <CountryFlag countryCode={countryCode} className="mr-2" />
              <span className="text-xs font-semibold text-brand-sky tracking-wide uppercase">
                {content?.platformBadge || config.platformDescription || "Africa's #1 HealthTech Platform"}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold mb-5 leading-[1.08] text-white">
              {titleParts.map((part, i) => (
                <span key={i} className={i === 1 ? 'text-brand-sky' : ''}>
                  {part.trim()}
                  {i === 0 && titleParts.length > 1 && ','}{i === 0 && titleParts.length > 1 && <br />}
                </span>
              ))}
            </h1>

            <p className="text-base sm:text-lg text-gray-300 leading-relaxed max-w-md">
              {content?.subtitle ||
                "Africa's most trusted health platform. Book verified specialists, get AI-powered insights, and access pharmacy — all in one place."}
            </p>

            {/* Trust stats */}
            <div className="flex flex-wrap gap-4 mt-6">
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

            {/* Slide caption */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`caption-${currentImageIndex}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.4 }}
                className="mt-6 hidden sm:flex items-center gap-2"
              >
                <div className="w-1 h-8 rounded-full bg-brand-sky/60 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white/80">{heroImages[currentImageIndex].title}</p>
                  {heroImages[currentImageIndex].description && (
                    <p className="text-[10px] text-white/45 mt-0.5">{heroImages[currentImageIndex].description}</p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* RIGHT: booking widget — compact fixed width */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
            className="w-full lg:flex-shrink-0 lg:w-[360px] xl:w-[400px]"
          >
            <HeroBookingWidget />
          </motion.div>

        </div>
      </div>

      {/* ── Carousel dots ──────────────────────────────────────── */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
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
    </section>
  )
}

export default HeroSection
