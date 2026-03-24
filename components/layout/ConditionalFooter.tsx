'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Footer from './Footer'

export default function ConditionalFooter() {
 const pathname = usePathname()
 const [isMobile, setIsMobile] = useState(false)

 useEffect(() => {
 const check = () => setIsMobile(window.innerWidth < 640)
 check()
 window.addEventListener('resize', check)
 return () => window.removeEventListener('resize', check)
 }, [])

 // Hide footer on home page for mobile (swipe wrapper handles it)
 if (pathname === '/' && isMobile) return null

 // Show footer only on home page
 return pathname === '/' ? <Footer /> : null
}
