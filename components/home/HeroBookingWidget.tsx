'use client'

import '@/lib/utils/register-icons'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import {
  FaTimes, FaLock, FaArrowRight, FaCheckCircle, FaCalendarAlt,
} from 'react-icons/fa'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoleData {
  code: string
  label: string
  singularLabel: string
  slug: string
  color: string
  iconKey?: string | null
}

interface TimeSlot {
  id: string
  label: string
  taken: boolean
  hour: number
  minute: number
}

interface ServiceItem {
  id: string
  serviceName: string
  category: string
  defaultPrice: number
  iconKey?: string | null
  emoji?: string | null
}

// ─── Slot helpers ─────────────────────────────────────────────────────────────

function toSlotLabel(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM'
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${display}:${m.toString().padStart(2, '0')} ${period}`
}

/** Fallback: deterministic slots when the API returns nothing (empty DB / offline). */
function fallbackSlots(date: Date, roleCode: string): TimeSlot[] {
  const dow = date.getDay()
  if (dow === 0) return []
  const endH = dow === 6 ? 13 : 18
  let h5 = 5381
  const hash = (s: string) => {
    for (let i = 0; i < s.length; i++) h5 = ((h5 << 5) - h5 + s.charCodeAt(i)) | 0
    return Math.abs(h5)
  }
  const slots: TimeSlot[] = []
  for (let h = 9; h < endH; h++) {
    if (h === 12) continue
    for (let m = 0; m < 60; m += 30) {
      const busy = (h >= 9 && h <= 11) || (h >= 14 && h <= 16)
      const taken = hash(`${date.toDateString()}|${roleCode}|${h}|${m}`) % 100 < (busy ? 60 : 28)
      slots.push({ id: `${h}:${m}`, label: toSlotLabel(h, m), taken, hour: h, minute: m })
    }
  }
  return slots
}

/** Map API response slots to the widget's TimeSlot format. */
function apiSlotsToTimeSlots(apiSlots: Array<{ time: string; taken: boolean }>): TimeSlot[] {
  return apiSlots.map(s => {
    const [h, m] = s.time.split(':').map(Number)
    return { id: s.time, label: toSlotLabel(h, m), taken: s.taken, hour: h, minute: m }
  })
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function upcomingDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
}

function isLoggedIn() {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith('mediwyz_userType='))
}

// ─── Fallback roles (shown while /api/roles loads) ────────────────────────────

const STUB_ROLES: RoleData[] = [
  { code: 'DOCTOR', label: 'Doctors', singularLabel: 'Doctor', slug: 'doctors', color: '#0C6780', iconKey: 'healthicons:doctor' },
  { code: 'NURSE', label: 'Nurses', singularLabel: 'Nurse', slug: 'nurses', color: '#7C3AED', iconKey: 'healthicons:nurse' },
  { code: 'DENTIST', label: 'Dentists', singularLabel: 'Dentist', slug: 'dentists', color: '#059669', iconKey: 'healthicons:dentistry' },
  { code: 'PHYSIOTHERAPIST', label: 'Physios', singularLabel: 'Physiotherapist', slug: 'physiotherapists', color: '#D97706', iconKey: 'healthicons:physiotherapy' },
  { code: 'NUTRITIONIST', label: 'Nutritionists', singularLabel: 'Nutritionist', slug: 'nutritionists', color: '#DB2777', iconKey: 'healthicons:nutrition-care' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function HeroBookingWidget() {
  const [roles, setRoles] = useState<RoleData[]>(STUB_ROLES)
  const [activeRole, setActiveRole] = useState<RoleData>(STUB_ROLES[0])
  const [days] = useState<Date[]>(() => upcomingDays(7))
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [modal, setModal] = useState<'none' | 'login' | 'services' | 'cart'>('none')
  const [cartService, setCartService] = useState<ServiceItem | null>(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const pillsRef = useRef<HTMLDivElement>(null)

  function scrollPills(dir: 'left' | 'right') {
    pillsRef.current?.scrollBy({ left: dir === 'right' ? 130 : -130, behavior: 'smooth' })
  }

  // Load roles from DB
  useEffect(() => {
    fetch('/api/roles?searchEnabled=true')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.length) {
          const r: RoleData[] = j.data.slice(0, 8)
          setRoles(r)
          setActiveRole(r[0])
        }
      })
      .catch(() => {})
  }, [])

  // Fetch real slot availability from the backend whenever role or day changes
  useEffect(() => {
    const dateStr = selectedDay.toISOString().slice(0, 10)
    setSlotsLoading(true)
    setSelectedSlot(null)
    fetch(`/api/search/available-slots?date=${dateStr}&roleCode=${activeRole.code}`)
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.slots?.length) {
          setSlots(apiSlotsToTimeSlots(j.data.slots))
        } else {
          // No availability data in DB yet — fall back to deterministic preview
          setSlots(fallbackSlots(selectedDay, activeRole.code))
        }
      })
      .catch(() => setSlots(fallbackSlots(selectedDay, activeRole.code)))
      .finally(() => setSlotsLoading(false))
  }, [selectedDay, activeRole.code])

  // Load services when role changes
  useEffect(() => {
    fetch(`/api/services/catalog?providerType=${activeRole.code}`)
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data) {
          const flat: ServiceItem[] = []
          for (const g of j.data) {
            for (const s of g.services || []) flat.push(s)
          }
          setServices(flat.slice(0, 6))
        }
      })
      .catch(() => {})
  }, [activeRole.code])

  const availableCount = slots.filter(s => !s.taken).length
  const isSunday = selectedDay.getDay() === 0

  function selectRole(r: RoleData) {
    setActiveRole(r)
    setSelectedSlot(null)
  }

  function selectDay(d: Date) {
    setSelectedDay(d)
    setSelectedSlot(null)
  }

  function handleSlotClick(slot: TimeSlot) {
    if (slot.taken) return
    setSelectedSlot(slot)
    setModal(isLoggedIn() ? 'services' : 'login')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password }),
        credentials: 'include',
      })
      const j = await res.json()
      if (j.success) {
        setModal('services')
      } else {
        setLoginError(j.message || 'Incorrect email or password')
      }
    } catch {
      setLoginError('Connection error — please try again')
    } finally {
      setLoginLoading(false)
    }
  }

  function selectService(svc: ServiceItem) {
    setCartService(svc)
    setModal('cart')
  }

  function confirmBooking() {
    if (!cartService || !selectedSlot) return
    const dateStr = selectedDay.toISOString().slice(0, 10)
    const timeStr = `${selectedSlot.hour.toString().padStart(2, '0')}:${selectedSlot.minute.toString().padStart(2, '0')}`
    window.location.href = `/search/${activeRole.slug}?service=${cartService.id}&date=${dateStr}&time=${timeStr}`
  }

  const slotDateLabel = `${DOW[selectedDay.getDay()]}, ${MONTHS[selectedDay.getMonth()]} ${selectedDay.getDate()}`

  return (
    <>
      {/* ── Widget card ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.3, ease: 'easeOut' }}
        className="w-full"
      >
        <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl"
          style={{ background: 'rgba(0,10,25,0.55)', backdropFilter: 'blur(18px)' }}>

          {/* ── Header + provider pills ─────────────── */}
          <div className="px-4 pt-4 pb-3 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-[#9AE1FF] text-sm" />
                <span className="text-xs font-bold text-white/90 tracking-wide">Book an Appointment</span>
              </div>
              <span className="text-[10px] text-white/50 tabular-nums">
                {isSunday ? 'Closed today' : `${availableCount} open`}
              </span>
            </div>

            {/* Provider type pills — with prev/next scroll arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollPills('left')}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white/70 hover:text-white transition-all text-xs"
                aria-label="Scroll left"
              >
                ‹
              </button>
              <div ref={pillsRef} className="flex gap-1.5 overflow-x-auto pb-0.5 flex-1 [&::-webkit-scrollbar]:hidden scroll-smooth">
                {roles.map(role => {
                  const active = role.code === activeRole.code
                  return (
                    <button
                      key={role.code}
                      onClick={() => selectRole(role)}
                      style={active ? { backgroundColor: role.color, borderColor: role.color } : {}}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold
                        transition-all border whitespace-nowrap
                        ${active
                          ? 'text-white shadow-lg shadow-black/30'
                          : 'bg-white/10 text-white/75 border-white/15 hover:bg-white/20 hover:text-white'
                        }`}
                    >
                      {role.iconKey && <Icon icon={role.iconKey} width={13} height={13} />}
                      {role.singularLabel}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => scrollPills('right')}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white/70 hover:text-white transition-all text-xs"
                aria-label="Scroll right"
              >
                ›
              </button>
            </div>
          </div>

          {/* ── Day selector ────────────────────────── */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {days.map(d => {
                const sel = d.toDateString() === selectedDay.toDateString()
                const isToday = d.toDateString() === new Date().toDateString()
                const closed = d.getDay() === 0
                return (
                  <button
                    key={d.toDateString()}
                    onClick={() => selectDay(d)}
                    disabled={closed}
                    className={`flex-shrink-0 flex flex-col items-center px-2.5 py-2 rounded-xl transition-all min-w-[42px]
                      ${closed ? 'opacity-30 cursor-not-allowed' : ''}
                      ${sel
                        ? 'bg-white text-[#001E40] shadow-lg'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                      }`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider">{DOW[d.getDay()]}</span>
                    <span className={`text-sm font-black mt-0.5 leading-none
                      ${isToday && !sel ? 'text-[#9AE1FF]' : ''}`}>
                      {d.getDate()}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-white/40 mt-2 pl-0.5">{slotDateLabel}</p>
          </div>

          {/* ── Time slots ──────────────────────────── */}
          <div className="px-4 pb-4">
            {isSunday ? (
              <div className="py-5 text-center">
                <p className="text-white/30 text-xs">Closed on Sundays</p>
                <p className="text-white/20 text-[10px] mt-1">Select another day →</p>
              </div>
            ) : slotsLoading ? (
              <div className="py-5 flex justify-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="py-5 text-center">
                <p className="text-white/30 text-xs">No slots available</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto
                [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
                {slots.map(slot => {
                  const sel = selectedSlot?.id === slot.id
                  return (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotClick(slot)}
                      disabled={slot.taken}
                      className={`py-2 rounded-lg text-[10px] font-semibold transition-all text-center leading-tight
                        ${slot.taken
                          ? 'bg-white/5 text-white/18 cursor-not-allowed line-through decoration-white/20'
                          : sel
                            ? 'bg-white text-[#001E40] ring-2 ring-white/60 shadow-lg scale-105'
                            : 'bg-white/15 text-white hover:bg-white/25 hover:scale-105 active:scale-95 cursor-pointer'
                        }`}
                    >
                      {slot.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Footer ──────────────────────────────── */}
          <div className="px-4 py-2.5 bg-black/25 flex items-center justify-between gap-3 border-t border-white/10">
            <div className="text-[11px] min-w-0">
              {selectedSlot ? (
                <span className="text-[#9AE1FF] font-semibold flex items-center gap-1">
                  <FaCheckCircle className="text-[9px] flex-shrink-0" />
                  {selectedSlot.label} selected
                </span>
              ) : (
                <span className="text-white/40">Pick a time above</span>
              )}
            </div>
            <Link
              href={`/search/${activeRole.slug}`}
              className="flex-shrink-0 flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition-colors font-medium"
            >
              Browse all <FaArrowRight className="text-[9px]" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Modals (fixed overlay — avoids overflow-hidden clipping) ─── */}
      <AnimatePresence>
        {modal !== 'none' && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,10,30,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setModal('none') }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              {/* ── Login modal ──────────────────────── */}
              {modal === 'login' && (
                <>
                  <div className="flex items-start justify-between px-5 pt-5 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <FaLock className="text-[#0C6780] text-xs" />
                        <h3 className="text-sm font-bold text-[#001E40]">Sign in to book</h3>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {activeRole.singularLabel} · {selectedSlot?.label} · {slotDateLabel}
                      </p>
                    </div>
                    <button onClick={() => setModal('none')} className="p-1.5 text-gray-300 hover:text-gray-500 -mt-1 -mr-1 rounded-lg">
                      <FaTimes className="text-xs" />
                    </button>
                  </div>

                  <form onSubmit={handleLogin} className="px-5 pb-5 space-y-3">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={loginForm.email}
                      autoComplete="email"
                      onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                      required
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C6780]/30 focus:border-[#0C6780]"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={loginForm.password}
                      autoComplete="current-password"
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      required
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C6780]/30 focus:border-[#0C6780]"
                    />

                    {loginError && (
                      <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{loginError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full py-2.5 bg-[#0C6780] text-white rounded-xl text-sm font-semibold
                        hover:bg-[#0a5a6e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <FaLock className="text-[10px]" />
                      {loginLoading ? 'Signing in…' : 'Sign In & Continue'}
                    </button>

                    <div className="flex items-center justify-between pt-1">
                      <Link href="/signup" className="text-xs text-[#0C6780] hover:underline font-medium">
                        Create free account
                      </Link>
                      <Link href={`/login?redirect=/search/${activeRole.slug}`} className="text-xs text-gray-400 hover:text-gray-600">
                        Full login page →
                      </Link>
                    </div>
                  </form>
                </>
              )}

              {/* ── Service picker ────────────────────── */}
              {modal === 'services' && (
                <>
                  <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                    <div>
                      <h3 className="text-sm font-bold text-[#001E40]">Choose a service</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {activeRole.singularLabel} · {selectedSlot?.label} · {slotDateLabel}
                      </p>
                    </div>
                    <button onClick={() => setModal('none')} className="p-1.5 text-gray-300 hover:text-gray-500 -mt-1 -mr-1 rounded-lg">
                      <FaTimes className="text-xs" />
                    </button>
                  </div>

                  <div className="px-4 py-3 max-h-80 overflow-y-auto space-y-1.5">
                    {services.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">Loading services…</p>
                    ) : (
                      services.map(svc => (
                        <button
                          key={svc.id}
                          onClick={() => selectService(svc)}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-100
                            hover:border-[#0C6780]/40 hover:bg-[#0C6780]/5 transition-all text-left group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#0C6780]/10 flex items-center justify-center flex-shrink-0">
                            {svc.iconKey ? (
                              <Icon icon={svc.iconKey} width={18} height={18} color="#0C6780" />
                            ) : (
                              <span className="text-base">{svc.emoji ?? '⚕️'}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 leading-tight">{svc.serviceName}</p>
                            <p className="text-[10px] text-gray-400">{svc.category}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-xs font-bold text-[#0C6780]">Rs {svc.defaultPrice.toLocaleString()}</p>
                            <FaArrowRight className="text-[9px] text-gray-300 group-hover:text-[#0C6780] transition-colors ml-auto mt-0.5" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                    <Link
                      href={`/search/${activeRole.slug}`}
                      className="block text-center text-xs text-[#0C6780] hover:underline font-medium"
                    >
                      Browse all {activeRole.label} providers →
                    </Link>
                  </div>
                </>
              )}

              {/* ── Booking cart / summary ────────────── */}
              {modal === 'cart' && cartService && (
                <>
                  <div className="flex items-start justify-between px-5 pt-5 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#001E40]">Booking Summary</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">Review your selection</p>
                    </div>
                    <button onClick={() => setModal('none')} className="p-1.5 text-gray-300 hover:text-gray-500 -mt-1 -mr-1 rounded-lg">
                      <FaTimes className="text-xs" />
                    </button>
                  </div>

                  {/* Cart details */}
                  <div className="px-5 pb-5 space-y-3">
                    {/* Provider type row */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${activeRole.color}18` }}>
                        {activeRole.iconKey && <Icon icon={activeRole.iconKey} width={20} height={20} color={activeRole.color} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Provider</p>
                        <p className="text-xs font-bold text-gray-900">{activeRole.singularLabel}</p>
                      </div>
                    </div>

                    {/* Service row */}
                    <div className="flex items-center gap-3 p-3 bg-[#0C6780]/5 rounded-xl border border-[#0C6780]/20">
                      <div className="w-9 h-9 rounded-lg bg-[#0C6780]/10 flex items-center justify-center flex-shrink-0">
                        {cartService.iconKey ? (
                          <Icon icon={cartService.iconKey} width={20} height={20} color="#0C6780" />
                        ) : (
                          <span className="text-base">{cartService.emoji ?? '⚕️'}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Service</p>
                        <p className="text-xs font-bold text-gray-900 leading-tight">{cartService.serviceName}</p>
                        <p className="text-[10px] text-gray-500">{cartService.category}</p>
                      </div>
                      <p className="text-sm font-black text-[#0C6780] flex-shrink-0">Rs {cartService.defaultPrice.toLocaleString()}</p>
                    </div>

                    {/* Date + time row */}
                    <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <FaCalendarAlt className="text-[#0C6780] text-sm flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900">{slotDateLabel}</p>
                        <p className="text-[10px] text-gray-500">{selectedSlot?.label}</p>
                      </div>
                      <FaCheckCircle className="text-emerald-500 text-sm flex-shrink-0" />
                    </div>

                    {/* CTA */}
                    <button
                      onClick={confirmBooking}
                      className="w-full py-3 bg-[#0C6780] text-white rounded-xl text-sm font-bold
                        hover:bg-[#0a5a6e] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#0C6780]/30"
                    >
                      Book Now <FaArrowRight className="text-xs" />
                    </button>

                    <button
                      onClick={() => setModal('services')}
                      className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors font-medium"
                    >
                      ← Change service
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
