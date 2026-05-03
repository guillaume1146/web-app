'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useAppConfig } from '@/hooks/useAppConfig'

// Country flag components
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

const HeroSection: React.FC<HeroSectionProps> = ({ content, slides, countryCode = 'MU' }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { config } = useAppConfig()

  const defaultHeroImages = [
    { src: '/images/hero/gemini-doctor-3-removebg-1.png', alt: 'Specialist Medical Doctor',  title: 'Medical Specialists',    description: 'Consult verified specialists across 15+ fields' },
    { src: '/images/hero/medicine-1.png',                 alt: 'Buy medicines online',        title: 'Medicine Store',         description: 'Order prescriptions & wellness products online' },
    { src: '/images/hero/doctor-1.png',                   alt: 'Professional Doctor',         title: 'Expert Medical Care',    description: 'Qualified professionals at your service' },
    { src: '/images/hero/ambulance-1.png',                alt: 'Emergency Ambulance',         title: 'Emergency Services',     description: 'Rapid response when every second counts' },
    { src: '/images/hero/insurance-1.png',                alt: 'Health Insurance',            title: 'Insurance Protection',   description: 'Coverage plans for individuals & families' },
    { src: '/images/hero/nurse-1.png',                    alt: 'Professional Nurse',          title: 'Nursing Excellence',     description: 'Home visits & ongoing health monitoring' },
    { src: '/images/hero/doctor-2.png',                   alt: 'Experienced Doctor',          title: 'Healthcare Professionals', description: 'Trusted providers verified by MediWyz' },
    { src: '/images/hero/patient-1.png',                  alt: 'Patient Care',                title: 'Patient-Centered Care', description: 'Your health journey, our commitment' },
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 100, damping: 12 } },
  }

  const imageVariants = {
    enter:  { opacity: 0, scale: 1.05 },
    center: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as const } },
    exit:   { opacity: 0, scale: 0.95, transition: { duration: 0.5, ease: [0.55, 0.085, 0.68, 0.53] as const } },
  }

  return (
    <section className="relative overflow-hidden py-5 sm:py-7 lg:py-8" style={{ background: '#001E40' }}>
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14">
        {/* 2-column layout: text (5/12) | image carousel (7/12) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">

          {/* COL 1 — Badge + title + description */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="order-1 lg:col-span-5 text-center lg:text-left"
          >
            {/* Country flag + platform badge */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center bg-white/10 rounded-lg px-3 py-1.5 mb-4 border border-white/20"
            >
              <CountryFlag countryCode={countryCode} className="mr-2" />
              <span className="text-xs font-medium text-brand-sky">
                {content?.platformBadge || config.platformDescription}
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight text-white"
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
              className="text-sm sm:text-base lg:text-lg text-gray-300 leading-relaxed"
            >
              {content?.subtitle ||
                'Connect with qualified doctors, get AI-powered health insights, and access medicines across Mauritius. Your trusted healthcare companion.'}
            </motion.p>
          </motion.div>

          {/* COL 2 — Animated image carousel */}
          <motion.div
            className="order-2 lg:col-span-7"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative w-full" style={{ height: '300px' }}>
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
                      sizes="(max-width: 1024px) 90vw, 58vw"
                      priority={currentImageIndex === 0}
                    />
                    {/* Caption */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                      <div className="bg-white/90 backdrop-blur-md rounded-lg px-3 py-2 border border-gray-200 max-w-xs">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {heroImages[currentImageIndex].title}
                        </p>
                        {heroImages[currentImageIndex].description && (
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">
                            {heroImages[currentImageIndex].description}
                          </p>
                        )}
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

        </div>
      </div>
    </section>
  )
}

export default HeroSection
