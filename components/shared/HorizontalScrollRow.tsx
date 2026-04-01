'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import Link from 'next/link'

interface HorizontalScrollRowProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  seeAllHref?: string
  seeAllLabel?: string
  children: ReactNode
  className?: string
}

export default function HorizontalScrollRow({
  title,
  subtitle,
  icon,
  seeAllHref,
  seeAllLabel = 'See All',
  children,
  className = '',
}: HorizontalScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    const observer = new ResizeObserver(checkScroll)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      observer.disconnect()
    }
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.75
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  return (
    <div className={`mb-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3 min-w-0">
          {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {/* Desktop scroll arrows */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default transition-all"
              aria-label="Scroll left"
            >
              <FaChevronLeft className="text-xs" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default transition-all"
              aria-label="Scroll right"
            >
              <FaChevronRight className="text-xs" />
            </button>
          </div>
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="text-sm font-medium text-[#0C6780] hover:text-[#001E40] transition-colors whitespace-nowrap"
            >
              {seeAllLabel} &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Scrollable Row */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        style={{ scrollbarWidth: 'thin' }}
      >
        {children}
      </div>
    </div>
  )
}
