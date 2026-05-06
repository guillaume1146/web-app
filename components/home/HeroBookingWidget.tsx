'use client'

import '@/lib/utils/register-icons'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaCalendarAlt, FaCheckCircle } from 'react-icons/fa'
import { useBookingDrawer } from '@/lib/contexts/booking-drawer-context'

// ── Types ─────────────────────────────────────────────────────────────────────

type WidgetStep = 'provider' | 'slot'

interface Role {
  code: string
  label: string
  singularLabel: string
  color?: string | null
}

interface ProviderResult {
  id: string
  name: string
  userType: string
  profileImage: string | null
  address: string | null
  rating: number
  specializations: string[]
}

interface TimeSlot {
  id: string
  label: string
  taken: boolean
  hour: number
  minute: number
}

// ── Slot helpers ──────────────────────────────────────────────────────────────

function toSlotLabel(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM'
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${display}:${m.toString().padStart(2, '0')} ${period}`
}

/** Deterministic fallback when the API returns nothing (empty DB / offline). */
function fallbackSlots(date: Date, providerKey: string): TimeSlot[] {
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
      const taken = hash(`${date.toDateString()}|${providerKey}|${h}|${m}`) % 100 < (busy ? 60 : 28)
      slots.push({ id: `${h}:${m}`, label: toSlotLabel(h, m), taken, hour: h, minute: m })
    }
  }
  return slots
}

function apiSlotsToTimeSlots(apiSlots: Array<{ time: string; taken: boolean }>): TimeSlot[] {
  return apiSlots.map(s => {
    const [h, m] = s.time.split(':').map(Number)
    return { id: s.time, label: toSlotLabel(h, m), taken: s.taken, hour: h, minute: m }
  })
}

// ── Date helpers ──────────────────────────────────────────────────────────────

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function upcomingDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
}

function mapProvider(p: Record<string, unknown>): ProviderResult {
  return {
    id: p.id as string,
    name: `${(p.firstName as string) ?? ''} ${(p.lastName as string) ?? ''}`.trim() || (p.name as string) || 'Provider',
    userType: p.userType as string,
    profileImage: (p.profileImage as string | null) ?? null,
    address: (p.address as string | null) ?? null,
    rating:
      ((p.doctorProfile as Record<string, unknown> | null)?.rating as number) ??
      (p.rating as number) ?? 0,
    specializations:
      ((p.doctorProfile as Record<string, unknown> | null)?.specialty as string[]) ??
      ((p.nurseProfile as Record<string, unknown> | null)?.specializations as string[]) ??
      [],
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface HeroBookingWidgetProps {
  fullHeight?: boolean
}

export default function HeroBookingWidget({ fullHeight = false }: HeroBookingWidgetProps) {
  const { openDrawer } = useBookingDrawer()

  const [step, setStep] = useState<WidgetStep>('provider')

  // Roles for filter chips
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState('all')

  // Providers
  const [providers, setProviders] = useState<ProviderResult[]>([])
  const [providersLoading, setProvidersLoading] = useState(true)
  const [providerQuery, setProviderQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<ProviderResult | null>(null)

  // Days & slots
  const [days] = useState<Date[]>(() => upcomingDays(7))
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  // Load roles once
  useEffect(() => {
    fetch('/api/roles?searchEnabled=true')
      .then(r => r.json())
      .then(j => { if (j.success) setRoles(j.data ?? []) })
      .catch(() => {})
  }, [])

  // Reload providers when role chip changes
  useEffect(() => {
    setProvidersLoading(true)
    setProviders([])
    setSelectedProvider(null)
    setStep('provider')
    const qs = selectedRole === 'all' ? '' : `type=${selectedRole}&`
    fetch(`/api/search/providers?${qs}limit=15`)
      .then(r => r.json())
      .then(j => { if (j.success) setProviders((j.data ?? []).map(mapProvider)) })
      .catch(() => {})
      .finally(() => setProvidersLoading(false))
  }, [selectedRole])

  // Fetch available slots (API scan of all taken slots for this provider/day)
  async function fetchSlots(prov: ProviderResult, date: Date) {
    const dateStr = date.toISOString().slice(0, 10)
    setSlotsLoading(true)
    setSlots([])
    try {
      const res = await fetch(
        `/api/bookings/available-slots?providerId=${prov.id}&providerUserId=${prov.id}&date=${dateStr}&providerType=${prov.userType}`
      )
      const j = await res.json()
      if (j.success && j.slots?.length) {
        setSlots(apiSlotsToTimeSlots(j.slots))
      } else {
        setSlots(fallbackSlots(date, prov.id))
      }
    } catch {
      setSlots(fallbackSlots(date, prov.id))
    } finally {
      setSlotsLoading(false)
    }
  }

  function handleSelectProvider(prov: ProviderResult) {
    setSelectedProvider(prov)
    setSelectedSlot(null)
    setStep('slot')
    fetchSlots(prov, selectedDay)
  }

  function handleSelectDay(d: Date) {
    setSelectedDay(d)
    setSelectedSlot(null)
    if (selectedProvider) fetchSlots(selectedProvider, d)
  }

  // Slot clicked → open the booking drawer/modal for the full booking flow
  function handleSlotClick(slot: TimeSlot) {
    if (slot.taken || !selectedProvider) return
    const dateStr = selectedDay.toISOString().slice(0, 10)
    const timeStr = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`
    setSelectedSlot(slot)
    openDrawer({
      provider: {
        id: selectedProvider.id,
        name: selectedProvider.name,
        userType: selectedProvider.userType,
        profileImage: selectedProvider.profileImage,
        address: selectedProvider.address,
        rating: selectedProvider.rating,
        specializations: selectedProvider.specializations,
      },
      date: dateStr,
      time: timeStr,
      timeLabel: slot.label,
      dateLabel: `${DOW[selectedDay.getDay()]}, ${MONTHS[selectedDay.getMonth()]} ${selectedDay.getDate()}`,
    })
  }

  // Client-side name/specialty search filter
  const filteredProviders = providers.filter(p =>
    !providerQuery ||
    p.name.toLowerCase().includes(providerQuery.toLowerCase()) ||
    p.specializations.some(s => s.toLowerCase().includes(providerQuery.toLowerCase()))
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.3, ease: 'easeOut' }}
      className={fullHeight ? 'flex-1 min-h-0 flex flex-col' : 'w-full'}
    >
      <div
        className={`rounded-xl overflow-hidden border border-white/20 shadow-2xl ${
          fullHeight ? 'flex flex-col flex-1 min-h-0' : ''
        }`}
        style={{ background: 'rgba(0,10,25,0.55)', backdropFilter: 'blur(18px)' }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="px-4 pt-3.5 pb-2.5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {step === 'slot' && (
              <button
                onClick={() => { setStep('provider'); setSelectedProvider(null); setSlots([]) }}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs transition-all"
                aria-label="Back to providers"
              >
                ‹
              </button>
            )}
            <FaCalendarAlt className="text-[#9AE1FF] text-sm" />
            <span className="text-xs font-bold text-white/90 tracking-wide">Book a Slot</span>
          </div>
          {selectedProvider && step === 'slot' && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/15 text-white/70 max-w-[90px] truncate">
              {selectedProvider.name.split(' ')[0]}
            </span>
          )}
        </div>

        {/* ── Step indicator ───────────────────────────────────────────── */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          {(['provider', 'slot'] as const).map((s, i) => {
            const active = step === s
            const done = step === 'slot' && s === 'provider'
            return (
              <div
                key={s}
                className={`flex-1 py-1.5 text-center text-[10px] font-semibold border-b-2 transition-all ${
                  active
                    ? 'text-[#9AE1FF] border-[#9AE1FF]'
                    : done
                      ? 'text-white/50 border-transparent'
                      : 'text-white/25 border-transparent'
                }`}
              >
                {i + 1}. {s === 'provider' ? 'Provider' : 'Date & Time'}
              </div>
            )
          })}
        </div>

        {/* ── Animated step body ───────────────────────────────────────── */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: step === 'slot' ? 14 : -14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: step === 'slot' ? -14 : 14 }}
            transition={{ duration: 0.18 }}
            className={fullHeight ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}
          >
            {step === 'provider' && (
              <ProviderPickerStep
                roles={roles}
                selectedRole={selectedRole}
                onRoleChange={setSelectedRole}
                providers={filteredProviders}
                loading={providersLoading}
                query={providerQuery}
                onQueryChange={setProviderQuery}
                onSelect={handleSelectProvider}
                fullHeight={fullHeight}
              />
            )}
            {step === 'slot' && (
              <SlotStep
                days={days}
                selectedDay={selectedDay}
                selectedSlot={selectedSlot}
                slots={slots}
                slotsLoading={slotsLoading}
                onSelectDay={handleSelectDay}
                onSlotClick={handleSlotClick}
                fullHeight={fullHeight}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 bg-black/25 flex items-center border-t border-white/10 flex-shrink-0">
          <span className="text-[11px] min-w-0">
            {step === 'slot' && selectedSlot ? (
              <span className="text-[#9AE1FF] font-semibold flex items-center gap-1">
                <FaCheckCircle className="text-[9px] flex-shrink-0" /> {selectedSlot.label} selected — booking opens…
              </span>
            ) : step === 'slot' ? (
              <span className="text-white/40">Select an available slot to book</span>
            ) : (
              <span className="text-white/40">Choose a provider to see open slots</span>
            )}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── PROVIDER PICKER STEP ──────────────────────────────────────────────────────

function ProviderPickerStep({
  roles,
  selectedRole,
  onRoleChange,
  providers,
  loading,
  query,
  onQueryChange,
  onSelect,
  fullHeight,
}: {
  roles: Role[]
  selectedRole: string
  onRoleChange: (r: string) => void
  providers: ProviderResult[]
  loading: boolean
  query: string
  onQueryChange: (q: string) => void
  onSelect: (p: ProviderResult) => void
  fullHeight: boolean
}) {
  return (
    <div className={`px-3 pt-3 pb-2 ${fullHeight ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
      {/* Role filter chips */}
      {roles.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden mb-2 flex-shrink-0 pb-0.5">
          <button
            onClick={() => onRoleChange('all')}
            className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all border ${
              selectedRole === 'all'
                ? 'bg-white text-[#001E40] border-white'
                : 'bg-white/10 text-white/60 border-white/15 hover:bg-white/20 hover:text-white'
            }`}
          >
            All
          </button>
          {roles.slice(0, 6).map(r => (
            <button
              key={r.code}
              onClick={() => onRoleChange(r.code)}
              className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all border whitespace-nowrap ${
                selectedRole === r.code
                  ? 'bg-white text-[#001E40] border-white'
                  : 'bg-white/10 text-white/60 border-white/15 hover:bg-white/20 hover:text-white'
              }`}
            >
              {r.singularLabel || r.label}
            </button>
          ))}
        </div>
      )}

      {/* Search input */}
      <input
        type="text"
        placeholder="Search by name or specialty…"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        className="w-full mb-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-[11px] placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors flex-shrink-0"
      />

      {/* Provider list */}
      {loading ? (
        <div className="space-y-1.5 flex-shrink-0">
          {[0, 1, 2].map(i => (
            <div key={i} className="animate-pulse h-12 rounded-xl bg-white/8" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-white/30 text-xs">
            {query ? 'No providers match your search' : 'No providers available'}
          </p>
        </div>
      ) : (
        <div
          className={`space-y-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 ${
            fullHeight ? 'flex-1 min-h-0' : 'max-h-52'
          }`}
        >
          {providers.map(p => {
            const initials = p.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/8 hover:bg-white/15 text-left transition-all border border-transparent hover:border-white/15"
              >
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #0C6780, #9AE1FF44)' }}
                >
                  {p.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.profileImage}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[11px] font-semibold leading-tight truncate">{p.name}</p>
                  {p.specializations.length > 0 ? (
                    <p className="text-white/40 text-[10px] truncate">{p.specializations.slice(0, 2).join(', ')}</p>
                  ) : p.address ? (
                    <p className="text-white/40 text-[10px] truncate">{p.address}</p>
                  ) : null}
                </div>
                {p.rating > 0 && (
                  <span className="text-[#9AE1FF] text-[10px] font-bold flex-shrink-0">★ {p.rating.toFixed(1)}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── SLOT STEP ─────────────────────────────────────────────────────────────────

function SlotStep({
  days,
  selectedDay,
  selectedSlot,
  slots,
  slotsLoading,
  onSelectDay,
  onSlotClick,
  fullHeight,
}: {
  days: Date[]
  selectedDay: Date
  selectedSlot: TimeSlot | null
  slots: TimeSlot[]
  slotsLoading: boolean
  onSelectDay: (d: Date) => void
  onSlotClick: (slot: TimeSlot) => void
  fullHeight: boolean
}) {
  const isSunday = selectedDay.getDay() === 0
  // Show only available (non-taken) slots — the hero widget is for quick slot picking,
  // not a full calendar view of busy/free time.
  const availableSlots = slots.filter(s => !s.taken)

  return (
    <div className={`px-4 pt-3 pb-2 ${fullHeight ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
      {/* Day strip */}
      <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden mb-2.5 flex-shrink-0">
        {days.map(d => {
          const sel = d.toDateString() === selectedDay.toDateString()
          const isToday = d.toDateString() === new Date().toDateString()
          const closed = d.getDay() === 0
          return (
            <button
              key={d.toDateString()}
              onClick={() => onSelectDay(d)}
              disabled={closed}
              className={`flex-shrink-0 flex flex-col items-center px-2.5 py-2 rounded-xl transition-all min-w-[42px]
                ${closed ? 'opacity-30 cursor-not-allowed' : ''}
                ${sel
                  ? 'bg-white text-[#001E40] shadow-lg'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider">{DOW[d.getDay()]}</span>
              <span className={`text-sm font-black mt-0.5 leading-none ${isToday && !sel ? 'text-[#9AE1FF]' : ''}`}>
                {d.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* Available slots only */}
      {isSunday ? (
        <div className="py-5 text-center flex-shrink-0">
          <p className="text-white/30 text-xs">Closed on Sundays</p>
          <p className="text-white/20 text-[10px] mt-1">Select another day →</p>
        </div>
      ) : slotsLoading ? (
        <div className="py-5 flex justify-center gap-1.5 flex-shrink-0">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      ) : availableSlots.length === 0 ? (
        <div className="py-5 text-center flex-shrink-0">
          <p className="text-white/30 text-xs">No available slots for this day</p>
          <p className="text-white/20 text-[10px] mt-1">Try another day →</p>
        </div>
      ) : (
        <div
          className={`grid grid-cols-4 gap-1.5 overflow-y-auto
            [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20
            ${fullHeight ? 'flex-1 min-h-0 content-start' : 'max-h-40'}`}
        >
          {availableSlots.map(slot => {
            const sel = selectedSlot?.id === slot.id
            return (
              <button
                key={slot.id}
                onClick={() => onSlotClick(slot)}
                className={`py-2 rounded-lg text-[10px] font-semibold transition-all text-center leading-tight cursor-pointer
                  ${sel
                    ? 'bg-white text-[#001E40] ring-2 ring-white/60 shadow-lg scale-105'
                    : 'bg-white/15 text-white hover:bg-[#9AE1FF]/30 hover:text-white hover:scale-105 active:scale-95'
                  }`}
              >
                {slot.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
