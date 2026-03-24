'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslation, type SupportedLanguage } from '@/lib/i18n'
import { FaGlobe } from 'react-icons/fa'

interface LanguageSwitcherProps {
 /** 'navbar' for public pages, 'header' for dashboard header area */
 variant?: 'navbar' | 'header'
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'navbar' }) => {
 const { language, setLanguage, supportedLanguages } = useTranslation()
 const [open, setOpen] = useState(false)
 const ref = useRef<HTMLDivElement>(null)

 // Close on outside click
 useEffect(() => {
 const handler = (e: MouseEvent) => {
 if (ref.current && !ref.current.contains(e.target as Node)) {
 setOpen(false)
 }
 }
 if (open) {
 document.addEventListener('mousedown', handler)
 }
 return () => document.removeEventListener('mousedown', handler)
 }, [open])

 const current = supportedLanguages.find((l) => l.code === language)

 const isHeader = variant === 'header'

 return (
 <div className="relative" ref={ref}>
 <button
 onClick={() => setOpen(!open)}
 className={
 isHeader
 ? 'p-2 sm:p-2.5 md:p-3 text-gray-600 hover:text-blue-600 bg-gray-100 rounded-lg hover:bg-blue-100 transition flex items-center gap-1.5'
 : 'flex items-center gap-1.5 text-gray-700 hover:text-blue-600 transition-colors duration-200 px-2 py-1.5 rounded-md hover:bg-blue-50 text-sm font-medium'
 }
 aria-label="Change language"
 aria-expanded={open}
 >
 <FaGlobe className={isHeader ? 'text-sm sm:text-base md:text-lg' : 'text-sm'} />
 <span className="hidden sm:inline text-xs sm:text-sm">
 {current?.flag} {current?.code.toUpperCase()}
 </span>
 </button>

 {open && (
 <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
 {supportedLanguages.map((lang) => (
 <button
 key={lang.code}
 onClick={() => {
 setLanguage(lang.code as SupportedLanguage)
 setOpen(false)
 }}
 className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-blue-50 transition-colors ${
 language === lang.code
 ? 'bg-blue-50 text-blue-700 font-medium'
 : 'text-gray-700'
 }`}
 >
 <span className="text-lg">{lang.flag}</span>
 <span>{lang.label}</span>
 {language === lang.code && (
 <span className="ml-auto text-blue-600 text-xs">&#10003;</span>
 )}
 </button>
 ))}
 </div>
 )}
 </div>
 )
}

export default LanguageSwitcher
