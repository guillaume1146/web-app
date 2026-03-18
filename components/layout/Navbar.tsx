'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import {
  FaHome,
  FaUserMd,
  FaPills,
  FaRobot,
  FaPhone,
  FaBars,
  FaTimes,
  FaInfoCircle,
  FaUserNurse,
  FaAmbulance,
  FaFlask,
  FaBaby,
  FaChevronDown,
  FaShieldAlt,
  FaUser,
  FaSignOutAlt,
} from 'react-icons/fa'

import HealthwyzLogo from '@/components/ui/HealthwyzLogo'
import SearchAutocomplete from '@/components/search/SearchAutocomplete'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { useCapacitor } from '@/hooks/useCapacitor'

const serviceCategories = {
  'Healthcare Services': [
    { href: '/search/doctors', label: 'Find Doctors', desc: 'Book GP & specialist consultations', icon: FaUserMd, color: 'from-blue-500 to-blue-600' },
    { href: '/search/nurses', label: 'Nursing Care', desc: 'Home visits & health monitoring', icon: FaUserNurse, color: 'from-purple-500 to-purple-600' },
    { href: '/search/childcare', label: 'Childcare', desc: 'Trusted nannies & child services', icon: FaBaby, color: 'from-pink-500 to-pink-600' },
    { href: '/search/emergency', label: 'Emergency', desc: 'Ambulance & first response', icon: FaAmbulance, color: 'from-red-500 to-red-600' },
    { href: '/search/caregivers', label: 'Caregivers', desc: 'Elder & disability home care', icon: FaUser, color: 'from-teal-500 to-teal-600' },
  ],
  'Medical Services': [
    { href: '/search/dentists', label: 'Dentists', desc: 'Dental care & oral health', icon: FaUser, color: 'from-sky-500 to-sky-600' },
    { href: '/search/optometrists', label: 'Eye Care', desc: 'Vision testing & eye health', icon: FaUser, color: 'from-violet-500 to-violet-600' },
    { href: '/search/physiotherapists', label: 'Physio', desc: 'Rehabilitation & therapy', icon: FaUser, color: 'from-lime-500 to-lime-600' },
    { href: '/search/nutritionists', label: 'Nutrition', desc: 'Diet plans & counseling', icon: FaUser, color: 'from-yellow-500 to-yellow-600' },
    { href: '/search/medicines', label: 'Medicines', desc: 'Order & get delivered', icon: FaPills, color: 'from-orange-500 to-orange-600' },
    { href: '/search/lab', label: 'Lab Testing', desc: 'Book tests & view results', icon: FaFlask, color: 'from-cyan-500 to-cyan-600' },
    { href: '/search/insurance', label: 'Insurance', desc: 'Health coverage plans', icon: FaShieldAlt, color: 'from-indigo-500 to-indigo-600' },
  ],
  'Digital Health': [
    { href: '/search/ai', label: 'AI Support', desc: 'AI-powered health assistant', icon: FaRobot, color: 'from-green-500 to-green-600' },
  ],
}

const COOKIE_TO_SLUG: Record<string, string> = {
  patient: 'patient',
  doctor: 'doctor',
  nurse: 'nurse',
  'child-care-nurse': 'nanny',
  pharmacy: 'pharmacist',
  lab: 'lab-technician',
  ambulance: 'responder',
  insurance: 'insurance',
  corporate: 'corporate',
  'referral-partner': 'referral-partner',
  admin: 'admin',
  'regional-admin': 'regional',
  caregiver: 'caregiver',
  physiotherapist: 'physiotherapist',
  dentist: 'dentist',
  optometrist: 'optometrist',
  nutritionist: 'nutritionist',
}

const Navbar: React.FC = () => {
  const router = useRouter()
  const { user: authUser, clearUser } = useUser()
  const isCapacitor = useCapacitor()
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [profileHref, setProfileHref] = useState('/login')
  const [userSlug, setUserSlug] = useState<string | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Get userType slug from cookie
  useEffect(() => {
    const match = document.cookie
      .split(';')
      .find((c) => c.trim().startsWith('mediwyz_userType='))
    if (match) {
      const cookieVal = decodeURIComponent(match.trim().split('=')[1] ?? '')
      const slug = COOKIE_TO_SLUG[cookieVal] || 'patient'
      setProfileHref(`/${slug}/profile`)
      setUserSlug(slug)
    }
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch { /* ignore */ }
    clearUser()
    document.cookie = 'mediwyz_token=; path=/; max-age=0'
    document.cookie = 'mediwyz_userType=; path=/; max-age=0'
    router.push('/login')
  }, [router, clearUser])

  const toggleDropdown = (category: string) => {
    setActiveDropdown(activeDropdown === category ? null : category)
  }

  const isLoggedIn = !!authUser

  const getServiceHref = (href: string) => userSlug ? `/${userSlug}${href}` : href

  return (
    <nav role="navigation" aria-label="Main navigation" className="sticky top-0 z-50">
      {/* Spacer for Android status bar in Capacitor WebView */}
      {isCapacitor && <div className="bg-white h-14" />}
      {/* Brand gradient accent line */}
      <div className="h-1 bg-gradient-to-r from-primary-blue via-primary-teal to-secondary-green" />
      <div className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        Skip to main content
      </a>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md">
            <HealthwyzLogo
              width={isMobile ? 140 : 160}
              height={isMobile ? 35 : 40}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center space-x-6">
            <Link
              href="/"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-blue-50"
            >
              <FaHome className="text-sm" />
              <span className="text-sm font-medium">Home</span>
            </Link>

            {/* Services Dropdown — hidden when logged in (accessible from dashboard sidebar) */}
            {!isLoggedIn && (
              <div className="relative group">
                <button
                  className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-haspopup="true"
                  aria-label="Services menu"
                >
                  <FaUserMd className="text-sm" aria-hidden="true" />
                  <span className="text-sm font-medium">Services</span>
                  <FaChevronDown className="text-xs" aria-hidden="true" />
                </button>

                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[580px] bg-white rounded-2xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-5">
                    {Object.entries(serviceCategories).map(([category, services]) => (
                      <div key={category} className="mb-4 last:mb-0">
                        <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 px-1">{category}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {services.map((service) => (
                            <Link
                              key={service.href}
                              href={getServiceHref(service.href)}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group/card"
                            >
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center flex-shrink-0 shadow-sm group-hover/card:shadow-md transition-shadow`}>
                                <service.icon className="text-white text-sm" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 group-hover/card:text-blue-600 transition-colors">{service.label}</p>
                                <p className="text-[11px] text-gray-400 leading-tight">{service.desc}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Link
              href="/about"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-blue-50"
            >
              <FaInfoCircle className="text-sm" />
              <span className="text-sm font-medium">About</span>
            </Link>

            <Link
              href="/contact"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-blue-50"
            >
              <FaPhone className="text-sm" />
              <span className="text-sm font-medium">Contact</span>
            </Link>
          </div>

          {/* Right: Search, Language, Auth */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="hidden lg:block w-48 xl:w-64">
              <SearchAutocomplete variant="navbar" placeholder="Search doctors, medicines..." />
            </div>

            <LanguageSwitcher variant="navbar" />

            {isLoggedIn ? (
              <>
                <Link
                  href={profileHref}
                  className="flex items-center gap-1.5 px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <FaUser className="text-sm" />
                  <span>My Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition text-sm font-medium"
                >
                  <FaSignOutAlt className="text-sm" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2.5 border-2 border-blue-500 text-blue-600 rounded-full hover:bg-blue-50 transition-all duration-200 font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-full hover:from-blue-700 hover:to-green-600 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="xl:hidden text-gray-700 p-2 rounded-md hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <FaTimes size={20} aria-hidden="true" /> : <FaBars size={20} aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile/Tablet Menu */}
        {isMenuOpen && (
          <div className="xl:hidden">
            <div className="py-4 border-t border-gray-200">
              {/* Mobile Search */}
              <div className="px-2 mb-4">
                <SearchAutocomplete variant="navbar" placeholder="Search doctors, medicines..." />
              </div>

              {/* Navigation Links */}
              <div className="space-y-2 px-2">
                <Link
                  href="/"
                  className="flex items-center space-x-3 text-gray-700 py-3 px-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaHome className="text-blue-600" />
                  <span className="font-medium">Home</span>
                </Link>

                {/* Mobile: Icon grid — hidden when logged in */}
                {!isLoggedIn && (
                  <div className="sm:hidden grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-gray-100">
                    {Object.values(serviceCategories).flat().map((service) => (
                      <Link
                        key={service.href}
                        href={getServiceHref(service.href)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                        aria-label={service.label}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center shadow-sm`}>
                          <service.icon className="text-white text-sm" />
                        </div>
                        <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{service.label}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Tablet+: Expandable categories — hidden when logged in */}
                {!isLoggedIn && (
                <div className="hidden sm:block">
                  {Object.entries(serviceCategories).map(([category, services]) => (
                    <div key={category} className="border-b border-gray-100 pb-3 mb-3">
                      <button
                        onClick={() => toggleDropdown(category)}
                        className="flex items-center justify-between w-full text-left py-2 px-3 text-gray-800 font-semibold hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <span className="text-sm">{category}</span>
                        <FaChevronDown
                          className={`text-xs transition-transform duration-200 ${
                            activeDropdown === category ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {activeDropdown === category && (
                        <div className="mt-2 space-y-1 pl-4">
                          {services.map((service) => (
                            <Link
                              key={service.href}
                              href={getServiceHref(service.href)}
                              className="flex items-center space-x-3 py-2.5 px-3 text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 rounded-lg transition-colors"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              <service.icon className="text-blue-500" />
                              <span>{service.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                )}

                <Link
                  href="/about"
                  className="flex items-center space-x-3 text-gray-700 py-3 px-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaInfoCircle className="text-blue-600" />
                  <span className="font-medium">About</span>
                </Link>

                <Link
                  href="/contact"
                  className="flex items-center space-x-3 text-gray-700 py-3 px-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaPhone className="text-blue-600" />
                  <span className="font-medium">Contact</span>
                </Link>
              </div>

              {/* Mobile Language Switcher */}
              <div className="px-2 mt-3">
                <LanguageSwitcher variant="navbar" />
              </div>

              {/* Mobile Auth Buttons */}
              <div className="pt-4 px-2 space-y-3 border-t border-gray-200 mt-4">
                {isLoggedIn ? (
                  <>
                    <Link
                      href={profileHref}
                      className="flex items-center justify-center gap-2 py-3 border-2 border-blue-500 text-blue-600 rounded-full font-medium hover:bg-blue-50 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FaUser /> My Profile
                    </Link>
                    <button
                      onClick={() => { setIsMenuOpen(false); handleLogout() }}
                      className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <FaSignOutAlt /> Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="block text-center py-3 border-2 border-blue-500 text-blue-600 rounded-full font-medium hover:bg-blue-50 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="block text-center py-3 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-full font-medium shadow-md hover:from-blue-700 hover:to-green-600 transition-all duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </nav>
  )
}

export default Navbar
