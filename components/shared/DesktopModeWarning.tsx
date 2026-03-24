'use client'

import { useState, useEffect } from 'react'
import { FaMobileAlt, FaTimes } from 'react-icons/fa'

/**
 * Detects when Chrome Android's "Desktop site" mode is active and shows
 * a dismissible banner with instructions to fix it.
 *
 * Detection: on mobile devices, screen.width is the real device width (~360px)
 * but window.innerWidth will be ~980px when "Desktop site" is enabled.
 */
export default function DesktopModeWarning() {
 const [show, setShow] = useState(false)

 useEffect(() => {
 const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
 const screenW = window.screen.width
 const viewportW = window.innerWidth

 // If viewport is significantly wider than physical screen on a mobile device
 if (isMobile && screenW < 768 && viewportW > screenW * 1.5) {
 // Don't show again if dismissed in this session
 const dismissed = sessionStorage.getItem('desktop-mode-warning-dismissed')
 if (!dismissed) {
 setShow(true)
 }
 }
 }, [])

 if (!show) return null

 const handleDismiss = () => {
 setShow(false)
 sessionStorage.setItem('desktop-mode-warning-dismissed', '1')
 }

 return (
 <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-amber-500 text-white px-4 py-3 shadow-lg"
 style={{ fontSize: '14px' }}
 >
 <div className="flex items-start gap-3 max-w-lg mx-auto">
 <FaMobileAlt className="text-xl flex-shrink-0 mt-0.5" />
 <div className="flex-1">
 <p className="font-semibold">Desktop mode detected</p>
 <p className="text-sm mt-1 text-amber-50">
 Chrome&apos;s &quot;Desktop site&quot; is enabled, causing the app to display incorrectly.
 To fix: open Chrome &rarr; Settings &rarr; Site settings &rarr; Desktop site &rarr; turn OFF,
 then reinstall the app.
 </p>
 </div>
 <button onClick={handleDismiss} className="p-1 flex-shrink-0" aria-label="Dismiss">
 <FaTimes />
 </button>
 </div>
 </div>
 )
}
