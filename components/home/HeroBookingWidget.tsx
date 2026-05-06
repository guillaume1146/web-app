'use client'

import '@/lib/utils/register-icons'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaCheckCircle, FaCalendarAlt,
} from 'react-icons/fa'
import { useBookingDrawer } from '@/lib/contexts/booking-drawer-context'

// ─── Types ────────────────────────────────────────────────────────────────────

type WidgetStep = 'service' | 'provider' | 'workflow' | 'slot'

interface ServiceItem {
  id: string
  serviceName: string
  category: string
  defaultPrice: number
  duration?: number | null
  providerType: string
  iconKey?: string | null
  emoji?: string | null
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

interface WorkflowOption {
  id: string
  name: string
  serviceMode: string
}

interface TimeSlot {
  id: string
  label: string
  taken: boolean
  hour: number
  minute: number
}

// ─── Slot helpers ─────────────────────────────────────────────────────────────

function toSlotLabel(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM'
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${display}:${m.toString().padStart(2, '0')} ${period}`
}

/** Fallback: deterministic slots when the API returns nothing (empty DB / offline). */
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

const MODE_EMOJI: Record<string, string> = {
  office: '🏥',
  home: '🏠',
  video: '📹',
}
const MODE_LABEL: Record<string, string> = {
  office: 'In-Person',
  home: 'Home Visit',
  video: 'Video Call',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface HeroBookingWidgetProps {
  fullHeight?: boolean
}

export default function HeroBookingWidget({ fullHeight = false }: HeroBookingWidgetProps) {
  const { openDrawer } = useBookingDrawer()

  const [widgetStep, setWidgetStep] = useState<WidgetStep>('service')

  // Services
  const [services, setServices] = useState<ServiceItem[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [serviceQuery, setServiceQuery] = useState('')
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)

  // Providers
  const [providers, setProviders] = useState<ProviderResult[]>([])
  const [providersLoading, setProvidersLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<ProviderResult | null>(null)

  // Workflows
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowOption | null>(null)

  // Days & slots
  const [days] = useState<Date[]>(() => upcomingDays(7))
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  // ── On mount: fetch services ───────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/search/services?limit=100')
      .then(r => r.json())
      .then(j => { if (j.success) setServices(j.data ?? []) })
      .catch(() => {})
      .finally(() => setServicesLoading(false))
  }, [])

  // ── Fetch slots for a given provider + day ─────────────────────────────────
  async function fetchSlotsForProvider(prov: ProviderResult, date: Date) {
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

  // ── Service selected ───────────────────────────────────────────────────────
  async function handleSelectService(svc: ServiceItem) {
    setSelectedService(svc)
    setSelectedProvider(null)
    setSelectedWorkflow(null)
    setSelectedSlot(null)
    setProvidersLoading(true)
    setWidgetStep('provider')
    try {
      const res = await fetch(
        `/api/search/providers?type=${svc.providerType}&serviceId=${svc.id}&limit=20`
      )
      const j = await res.json()
      if (j.success) {
        setProviders(
          (j.data ?? []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: (
              `${(p.firstName as string) ?? ''} ${(p.lastName as string) ?? ''}`.trim() ||
              (p.name as string) ||
              'Provider'
            ),
            userType: p.userType as string,
            profileImage: (p.profileImage as string | null) ?? null,
            address: (p.address as string | null) ?? null,
            rating:
              ((p.doctorProfile as Record<string, unknown> | null)?.rating as number) ??
              (p.rating as number) ??
              0,
            specializations:
              ((p.doctorProfile as Record<string, unknown> | null)?.specialty as string[]) ??
              ((p.nurseProfile as Record<string, unknown> | null)?.specializations as string[]) ??
              [],
          } as ProviderResult))
        )
      }
    } catch {
      /* non-fatal */
    } finally {
      setProvidersLoading(false)
    }
  }

  // ── Provider selected ──────────────────────────────────────────────────────
  async function handleSelectProvider(prov: ProviderResult) {
    setSelectedProvider(prov)
    setSelectedSlot(null)
    try {
      const res = await fetch(`/api/providers/${prov.id}/services`)
      const j = await res.json()
      if (j.success) {
        const match = (j.data ?? []).find((s: Record<string, unknown>) => s.id === selectedService?.id)
        const wfs: WorkflowOption[] = (
          (match?.workflows as Array<Record<string, unknown>>) ?? []
        ).map((w: Record<string, unknown>) => ({
          id: w.id as string,
          name: w.name as string,
          serviceMode: (w.serviceMode as string) ?? 'office',
        }))
        if (wfs.length > 1) {
          setWorkflows(wfs)
          setWidgetStep('workflow')
        } else {
          setSelectedWorkflow(wfs[0] ?? null)
          setWorkflows(wfs)
          setWidgetStep('slot')
          fetchSlotsForProvider(prov, selectedDay)
        }
      } else {
        setWidgetStep('slot')
        fetchSlotsForProvider(prov, selectedDay)
      }
    } catch {
      setWidgetStep('slot')
      fetchSlotsForProvider(prov, selectedDay)
    }
  }

  // ── Workflow selected ──────────────────────────────────────────────────────
  function handleSelectWorkflow(wf: WorkflowOption) {
    setSelectedWorkflow(wf)
    setWidgetStep('slot')
    if (selectedProvider) fetchSlotsForProvider(selectedProvider, selectedDay)
  }

  // ── Day changed ────────────────────────────────────────────────────────────
  function handleSelectDay(d: Date) {
    setSelectedDay(d)
    setSelectedSlot(null)
    if (widgetStep === 'slot' && selectedProvider) fetchSlotsForProvider(selectedProvider, d)
  }

  // ── Slot clicked ───────────────────────────────────────────────────────────
  function handleSlotClick(slot: TimeSlot) {
    if (slot.taken || !selectedService || !selectedProvider) return
    setSelectedSlot(slot)
    const dateStr = selectedDay.toISOString().slice(0, 10)
    const timeStr = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`
    openDrawer({
      service: {
        id: selectedService.id,
        serviceName: selectedService.serviceName,
        category: selectedService.category,
        defaultPrice: selectedService.defaultPrice,
        duration: selectedService.duration ?? undefined,
        providerType: selectedService.providerType,
        iconKey: selectedService.iconKey,
        emoji: selectedService.emoji,
      },
      provider: {
        id: selectedProvider.id,
        name: selectedProvider.name,
        userType: selectedProvider.userType,
        profileImage: selectedProvider.profileImage,
        address: selectedProvider.address,
        rating: selectedProvider.rating,
        specializations: selectedProvider.specializations,
      },
      workflow: selectedWorkflow ?? undefined,
      date: dateStr,
      time: timeStr,
      timeLabel: slot.label,
      dateLabel: `${DOW[selectedDay.getDay()]}, ${MONTHS[selectedDay.getMonth()]} ${selectedDay.getDate()}`,
    })
  }

  // ── Back navigation ────────────────────────────────────────────────────────
  function goBack() {
    if (widgetStep === 'provider') {
      setWidgetStep('service')
      setSelectedService(null)
    } else if (widgetStep === 'workflow') {
      setWidgetStep('provider')
    } else if (widgetStep === 'slot') {
      if (workflows.length > 1) {
        setWidgetStep('workflow')
      } else {
        setWidgetStep('provider')
        setSelectedProvider(null)
      }
    }
  }

  // ── Filtered services ──────────────────────────────────────────────────────
  const filteredServices = services.filter(s =>
    !serviceQuery ||
    s.serviceName.toLowerCase().includes(serviceQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(serviceQuery.toLowerCase())
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.3, ease: 'easeOut' }}
      className={fullHeight ? 'flex-1 min-h-0 flex flex-col' : 'w-full'}
    >
      <div
        className={
          fullHeight
            ? 'flex flex-col flex-1 min-h-0 overflow-hidden'
            : 'rounded-2xl overflow-hidden border border-white/20 shadow-2xl'
        }
        style={
          fullHeight
            ? { background: 'rgba(0,10,25,0.55)' }
            : { background: 'rgba(0,10,25,0.55)', backdropFilter: 'blur(18px)' }
        }
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {widgetStep !== 'service' && (
              <button
                onClick={goBack}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs transition-all"
                aria-label="Go back"
              >
                ‹
              </button>
            )}
            <FaCalendarAlt className="text-[#9AE1FF] text-sm" />
            <span className="text-xs font-bold text-white/90 tracking-wide">Book an Appointment</span>
          </div>
          {/* Breadcrumb pills */}
          <div className="flex items-center gap-1">
            {selectedService && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/15 text-white/70 max-w-[80px] truncate">
                {selectedService.emoji ?? '⚕️'} {selectedService.serviceName}
              </span>
            )}
            {selectedProvider && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/15 text-white/70 max-w-[70px] truncate">
                {selectedProvider.name.split(' ')[0]}
              </span>
            )}
          </div>
        </div>

        {/* ── Step indicator ────────────────────────────────────────── */}
        <div className="flex items-center border-b border-white/10">
          {(['service', 'provider', 'slot'] as const).map((s, i) => {
            const stepOrder: WidgetStep[] = ['service', 'provider', 'workflow', 'slot']
            const currentIdx = stepOrder.indexOf(widgetStep)
            const thisStepCode = s === 'slot' ? 'slot' : s
            const thisIdx = stepOrder.indexOf(thisStepCode)
            const done = currentIdx > thisIdx
            const active =
              s === 'service'
                ? widgetStep === 'service'
                : s === 'provider'
                  ? widgetStep === 'provider' || widgetStep === 'workflow'
                  : widgetStep === 'slot'
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
                {i + 1}.{' '}
                {s === 'service' ? 'Service' : s === 'provider' ? 'Provider' : 'Date & Time'}
              </div>
            )
          })}
        </div>

        {/* ── Animated step body ────────────────────────────────────── */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={widgetStep}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.18 }}
            className={fullHeight ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}
          >
            {widgetStep === 'service' && (
              <ServiceStep
                services={filteredServices}
                loading={servicesLoading}
                query={serviceQuery}
                onQueryChange={setServiceQuery}
                onSelect={handleSelectService}
                fullHeight={fullHeight}
              />
            )}
            {widgetStep === 'provider' && (
              <ProviderStep
                providers={providers}
                loading={providersLoading}
                onSelect={handleSelectProvider}
                selectedId={selectedProvider?.id}
                fullHeight={fullHeight}
              />
            )}
            {widgetStep === 'workflow' && (
              <WorkflowStepWidget
                workflows={workflows}
                onSelect={handleSelectWorkflow}
                selectedId={selectedWorkflow?.id}
                fullHeight={fullHeight}
              />
            )}
            {widgetStep === 'slot' && (
              <SlotStepWidget
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

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 bg-black/25 flex items-center justify-between gap-3 border-t border-white/10 flex-shrink-0">
          <div className="text-[11px] min-w-0">
            {widgetStep === 'slot' && selectedSlot ? (
              <span className="text-[#9AE1FF] font-semibold flex items-center gap-1">
                <FaCheckCircle className="text-[9px] flex-shrink-0" /> {selectedSlot.label} selected
              </span>
            ) : (
              <span className="text-white/40">
                {widgetStep === 'service'
                  ? 'Choose a service to start'
                  : widgetStep === 'provider'
                    ? 'Choose your provider'
                    : widgetStep === 'workflow'
                      ? 'Choose appointment type'
                      : 'Pick a time above'}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── SERVICE STEP ─────────────────────────────────────────────────────────────

function ServiceStep({
  services,
  loading,
  query,
  onQueryChange,
  onSelect,
  fullHeight,
}: {
  services: ServiceItem[]
  loading: boolean
  query: string
  onQueryChange: (q: string) => void
  onSelect: (svc: ServiceItem) => void
  fullHeight: boolean
}) {
  return (
    <div className={`px-3 pt-3 pb-2 ${fullHeight ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
      {/* Search input */}
      <input
        type="text"
        placeholder="Search services…"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        className="w-full mb-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-[11px] placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
      />
      {loading ? (
        <div className="space-y-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="animate-pulse h-10 rounded-xl bg-white/8" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-white/30 text-xs">
            {query ? 'No services match your search' : 'No services available'}
          </p>
        </div>
      ) : (
        <div className={`space-y-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 ${fullHeight ? 'flex-1 min-h-0' : 'max-h-56'}`}>
          {services.map(svc => (
            <button
              key={svc.id}
              onClick={() => onSelect(svc)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/8 hover:bg-white/15 text-left transition-all border border-transparent hover:border-white/15"
            >
              <span className="text-base flex-shrink-0">{svc.emoji ?? '⚕️'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[11px] font-semibold leading-tight truncate">
                  {svc.serviceName}
                </p>
                <p className="text-white/40 text-[10px] truncate">{svc.category}</p>
              </div>
              <span className="text-[#9AE1FF] text-[10px] font-bold flex-shrink-0">
                Rs {(svc.defaultPrice ?? 0).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── PROVIDER STEP ────────────────────────────────────────────────────────────

function ProviderStep({
  providers,
  loading,
  onSelect,
  selectedId,
  fullHeight,
}: {
  providers: ProviderResult[]
  loading: boolean
  onSelect: (p: ProviderResult) => void
  selectedId?: string
  fullHeight: boolean
}) {
  return (
    <div className={`px-3 pt-3 pb-2 ${fullHeight ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
      {loading ? (
        <div className="space-y-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="animate-pulse h-12 rounded-xl bg-white/8" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-white/30 text-xs">No providers offer this service yet</p>
        </div>
      ) : (
        <div className={`space-y-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 ${fullHeight ? 'flex-1 min-h-0' : 'max-h-60'}`}>
          {providers.map(p => {
            const initials = p.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
            const selected = p.id === selectedId
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all border ${
                  selected
                    ? 'bg-white/20 border-white/30'
                    : 'bg-white/8 hover:bg-white/15 border-transparent hover:border-white/15'
                }`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #0C6780, #9AE1FF44)' }}>
                  {p.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.profileImage}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={e => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[11px] font-semibold leading-tight truncate">
                    {p.name}
                  </p>
                  {p.specializations.length > 0 ? (
                    <p className="text-white/40 text-[10px] truncate">
                      {p.specializations.slice(0, 2).join(', ')}
                    </p>
                  ) : p.address ? (
                    <p className="text-white/40 text-[10px] truncate">{p.address}</p>
                  ) : null}
                </div>
                {p.rating > 0 && (
                  <span className="text-[#9AE1FF] text-[10px] font-bold flex-shrink-0">
                    ★ {p.rating.toFixed(1)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── WORKFLOW SUB-STEP ────────────────────────────────────────────────────────

function WorkflowStepWidget({
  workflows,
  onSelect,
  selectedId,
  fullHeight,
}: {
  workflows: WorkflowOption[]
  onSelect: (wf: WorkflowOption) => void
  selectedId?: string
  fullHeight: boolean
}) {
  return (
    <div className={`px-3 pt-3 pb-2 ${fullHeight ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
      <p className="text-[10px] text-white/40 mb-2">Choose appointment type</p>
      <div className={`space-y-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 ${fullHeight ? 'flex-1 min-h-0' : 'max-h-56'}`}>
        {workflows.map(wf => {
          const selected = wf.id === selectedId
          return (
            <button
              key={wf.id}
              onClick={() => onSelect(wf)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all border ${
                selected
                  ? 'bg-white/20 border-white/30'
                  : 'bg-white/8 hover:bg-white/15 border-transparent hover:border-white/15'
              }`}
            >
              <span className="text-base flex-shrink-0">
                {MODE_EMOJI[wf.serviceMode] ?? '📋'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[11px] font-semibold leading-tight truncate">
                  {wf.name}
                </p>
                <p className="text-white/40 text-[10px]">
                  {MODE_LABEL[wf.serviceMode] ?? wf.serviceMode}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── SLOT SUB-STEP ────────────────────────────────────────────────────────────

function SlotStepWidget({
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

  return (
    <div className={`px-4 pt-3 pb-2 ${fullHeight ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
      {/* Day strip */}
      <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden mb-2 flex-shrink-0">
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

      {/* Slots */}
      {isSunday ? (
        <div className="py-5 text-center">
          <p className="text-white/30 text-xs">Closed on Sundays</p>
          <p className="text-white/20 text-[10px] mt-1">Select another day →</p>
        </div>
      ) : slotsLoading ? (
        <div className="py-5 flex justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="py-5 text-center">
          <p className="text-white/30 text-xs">No slots available</p>
        </div>
      ) : (
        <div
          className={`grid grid-cols-4 gap-1.5 overflow-y-auto
            [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20
            ${fullHeight ? 'flex-1 min-h-0 content-start' : 'max-h-44'}`}
        >
          {slots.map(slot => {
            const sel = selectedSlot?.id === slot.id
            return (
              <button
                key={slot.id}
                onClick={() => onSlotClick(slot)}
                disabled={slot.taken}
                className={`py-2 rounded-lg text-[10px] font-semibold transition-all text-center leading-tight
                  ${
                    slot.taken
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
  )
}
