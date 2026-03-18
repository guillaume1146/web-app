'use client'

import { useState, useRef, useEffect, ReactNode, TouchEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FaArrowRight, FaChevronRight } from 'react-icons/fa'

interface MobileSwipeWrapperProps {
  children: ReactNode[]
  sectionLabels?: string[]
}

export default function MobileSwipeWrapper({ children, sectionLabels }: MobileSwipeWrapperProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const router = useRouter()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Prevent body scroll on mobile when swipe wrapper is active
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isMobile])

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 60

    if (diff > threshold) {
      // Swipe left → next
      if (currentIndex < children.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        // On last section, swipe left → go to signup
        router.push('/signup')
      }
    } else if (diff < -threshold && currentIndex > 0) {
      // Swipe right → previous
      setCurrentIndex(prev => prev - 1)
    }
  }

  const isLast = currentIndex === children.length - 1

  // Desktop: normal vertical scroll
  if (!isMobile) {
    return <>{children}</>
  }

  // Mobile: horizontal swipe with full-screen sections
  return (
    <div className="fixed inset-0 top-[64px] z-30 bg-white">
      {/* Skip button — top right */}
      <button
        onClick={() => router.push('/login')}
        className="absolute top-2 right-3 z-50 text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm"
      >
        Skip
      </button>

      {/* Swipeable container */}
      <div
        className="w-full h-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {children.map((child, i) => (
            <div
              key={i}
              className="w-full flex-shrink-0 h-full overflow-hidden px-2 pb-14"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', maxHeight: '100%' }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar: dots + next/get started button */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-3 z-50 flex items-center justify-between safe-area-bottom">
        {/* Dot indicators */}
        <div className="flex gap-1.5">
          {children.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`transition-all duration-200 rounded-full ${
                i === currentIndex
                  ? 'w-5 h-2 bg-blue-600'
                  : 'w-2 h-2 bg-gray-300'
              }`}
              aria-label={sectionLabels?.[i] || `Section ${i + 1}`}
            />
          ))}
        </div>

        {/* Next / Get Started button */}
        {isLast ? (
          <button
            onClick={() => router.push('/signup')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-full text-sm font-semibold shadow-lg hover:bg-blue-700 transition"
          >
            Get Started <FaArrowRight className="text-xs" />
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex(prev => prev + 1)}
            className="flex items-center gap-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition"
          >
            Next <FaChevronRight className="text-[10px]" />
          </button>
        )}
      </div>

      {/* Section label badge */}
      {sectionLabels && sectionLabels[currentIndex] && (
        <div className="absolute top-2 left-3 z-40 pointer-events-none">
          <span className="bg-white/90 backdrop-blur-sm text-[10px] font-medium text-gray-500 px-2.5 py-1 rounded-full shadow-sm border border-gray-100">
            {currentIndex + 1}/{children.length} — {sectionLabels[currentIndex]}
          </span>
        </div>
      )}
    </div>
  )
}
