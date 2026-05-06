'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { FaMapMarkerAlt, FaCrosshairs, FaSpinner, FaChevronRight, FaClinicMedical } from 'react-icons/fa'
import Image from 'next/image'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProviderPin {
  id: string
  firstName: string
  lastName: string
  profileImage: string | null
  userType: string
  address: string | null
  latitude: number
  longitude: number
  distanceKm: number
  specialty: string[]
}

interface EntityPin {
  id: string
  name: string
  type: string
  address: string | null
  city: string | null
  phone: string | null
  latitude: number
  longitude: number
  distanceKm: number
}

type SearchMode = 'DOCTOR' | 'NURSE' | 'DENTIST' | 'PHARMACIST' | 'clinic' | 'hospital' | 'laboratory' | 'ALL'

const MODES: { value: SearchMode; label: string; color: string; emoji: string }[] = [
  { value: 'ALL',        label: 'All',          color: '#0C6780', emoji: '🏥' },
  { value: 'DOCTOR',     label: 'Doctors',      color: '#4F46E5', emoji: '👨‍⚕️' },
  { value: 'NURSE',      label: 'Nurses',       color: '#0891B2', emoji: '👩‍⚕️' },
  { value: 'DENTIST',    label: 'Dentists',     color: '#7C3AED', emoji: '🦷' },
  { value: 'PHARMACIST', label: 'Pharmacists',  color: '#059669', emoji: '💊' },
  { value: 'clinic',     label: 'Clinics',      color: '#DC2626', emoji: '🏥' },
  { value: 'hospital',   label: 'Hospitals',    color: '#B45309', emoji: '🏨' },
  { value: 'laboratory', label: 'Labs',         color: '#6D28D9', emoji: '🔬' },
]

const PROVIDER_TYPES = new Set(['DOCTOR', 'NURSE', 'DENTIST', 'PHARMACIST', 'NANNY', 'CAREGIVER', 'PHYSIOTHERAPIST', 'OPTOMETRIST', 'NUTRITIONIST', 'LAB_TECHNICIAN', 'EMERGENCY_WORKER'])
const ENTITY_TYPES = new Set(['clinic', 'hospital', 'laboratory', 'pharmacy'])

const MAURITIUS_CENTER: [number, number] = [-20.2, 57.5]

// ─── Leaflet marker factory (SVG div icons, no image dependency) ──────────────

function makeCircleIcon(color: string, size = 28) {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2.5"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  })
}

function makeSquareIcon(color: string, emoji = '🏥') {
  return L.divIcon({
    html: `<div style="width:32px;height:32px;background:${color};border-radius:8px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:14px">${emoji}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })
}

const userIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
    <circle cx="11" cy="11" r="9" fill="#9AE1FF" stroke="white" stroke-width="3"/>
    <circle cx="11" cy="11" r="4" fill="white"/>
  </svg>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

// ─── Internal component: flies map to a new center ────────────────────────────

function FlyTo({ pos, zoom }: { pos: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => { map.flyTo(pos, zoom, { duration: 1.2 }) }, [map, pos, zoom])
  return null
}

// ─── Haversine (client-side) ─────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NearMeSection() {
  const [mode, setMode] = useState<SearchMode>('ALL')
  const [userPos, setUserPos]   = useState<[number, number] | null>(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [providers, setProviders] = useState<ProviderPin[]>([])
  const [entities, setEntities]   = useState<EntityPin[]>([])
  const [loading, setLoading]     = useState(false)
  const [flyTarget, setFlyTarget] = useState<{ pos: [number, number]; zoom: number } | null>(null)

  // Fix Leaflet's default icon path issue in Next.js
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })
  }, [])

  // Load all pins on mount
  useEffect(() => {
    fetch('/api/geo/map-data')
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setProviders(j.data.providers ?? [])
          setEntities(j.data.entities ?? [])
        }
      })
      .catch(() => {})
  }, [])

  const locate = useCallback(() => {
    if (!navigator.geolocation) { setLocError('Geolocation not supported'); return }
    setLocating(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setUserPos(p)
        setLocating(false)
        setFlyTarget({ pos: p, zoom: 13 })
      },
      () => { setLocating(false); setLocError('Location access denied') },
      { timeout: 8000 },
    )
  }, [])

  const searchNearest = useCallback(async () => {
    if (!userPos) { locate(); return }
    setLoading(true)
    try {
      if (mode === 'ALL') {
        setProviders(prev => [...prev]
          .map(p => ({ ...p, distanceKm: haversineKm(userPos[0], userPos[1], p.latitude, p.longitude) }))
          .sort((a, b) => a.distanceKm - b.distanceKm))
        setEntities(prev => [...prev]
          .map(e => ({ ...e, distanceKm: haversineKm(userPos[0], userPos[1], e.latitude, e.longitude) }))
          .sort((a, b) => a.distanceKm - b.distanceKm))
        return
      }
      if (PROVIDER_TYPES.has(mode)) {
        const j = await fetch(`/api/geo/providers?type=${mode}&lat=${userPos[0]}&lng=${userPos[1]}&limit=8`).then(r => r.json())
        if (j.success) setProviders(j.data)
      } else if (ENTITY_TYPES.has(mode)) {
        const j = await fetch(`/api/geo/entities?type=${mode}&lat=${userPos[0]}&lng=${userPos[1]}&limit=8`).then(r => r.json())
        if (j.success) setEntities(j.data)
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false) }
  }, [userPos, mode, locate])

  // Visible pins depending on mode
  const visibleProviders = mode === 'ALL' || PROVIDER_TYPES.has(mode)
    ? (mode === 'ALL' ? providers : providers.filter(p => p.userType === mode))
    : []
  const visibleEntities = mode === 'ALL' || ENTITY_TYPES.has(mode)
    ? (mode === 'ALL' ? entities : entities.filter(e => e.type === mode))
    : []

  const nearestProviders = userPos
    ? [...visibleProviders].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5)
    : visibleProviders.slice(0, 5)
  const nearestEntities = userPos
    ? [...visibleEntities].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5)
    : visibleEntities.slice(0, 5)
  const nearestAll = [...nearestProviders, ...nearestEntities]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 6)

  const providerColor = (type: string) => MODES.find(m => m.value === type)?.color ?? '#0C6780'

  return (
    <section className="bg-[#001E40] overflow-hidden">
      {/* Header */}
      <div className="px-6 sm:px-10 lg:px-16 pt-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Find Nearest <span className="text-brand-sky">Healthcare</span>
            </h2>
            <p className="text-sm text-white/60 mt-0.5">
              Discover providers &amp; clinics near your location across Mauritius
            </p>
          </div>
          <button
            onClick={locate}
            disabled={locating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-teal text-white text-sm font-semibold
              hover:bg-[#0a5568] disabled:opacity-60 transition-colors flex-shrink-0"
          >
            {locating ? <FaSpinner className="animate-spin" /> : <FaCrosshairs />}
            {userPos ? 'Update location' : 'Use my location'}
          </button>
        </div>

        {locError && <p className="text-xs text-red-400 mt-2">{locError}</p>}

        {/* Mode chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {MODES.map(m => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                mode === m.value
                  ? 'text-white border-transparent'
                  : 'text-white/60 border-white/20 hover:border-white/40 hover:text-white'
              }`}
              style={mode === m.value ? { backgroundColor: m.color } : {}}
            >
              {m.emoji} {m.label}
            </button>
          ))}

          {userPos && (
            <button
              onClick={searchNearest}
              disabled={loading}
              className="ml-auto px-4 py-1.5 rounded-full text-xs font-bold bg-brand-sky text-brand-navy transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {loading && <FaSpinner className="animate-spin inline mr-1" />}
              Sort by distance
            </button>
          )}
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="flex flex-col lg:flex-row" style={{ minHeight: 420 }}>

        {/* ── Leaflet map ──────────────────────────────────────────────── */}
        <div className="flex-1 relative" style={{ minHeight: 340 }}>
          <MapContainer
            center={MAURITIUS_CENTER}
            zoom={10}
            style={{ width: '100%', height: '100%', minHeight: 340 }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Fly to user location when located */}
            {flyTarget && <FlyTo pos={flyTarget.pos} zoom={flyTarget.zoom} />}

            {/* Provider pins */}
            {visibleProviders.map(p => (
              <Marker
                key={p.id}
                position={[p.latitude, p.longitude]}
                icon={makeCircleIcon(providerColor(p.userType))}
              >
                <Popup>
                  <div className="min-w-[160px] text-sm">
                    <p className="font-bold text-gray-900">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-500 capitalize">{p.userType.toLowerCase().replace(/_/g, ' ')}</p>
                    {p.specialty?.length > 0 && (
                      <p className="text-xs text-blue-600 mt-0.5">{p.specialty.slice(0, 2).join(', ')}</p>
                    )}
                    {p.address && <p className="text-xs text-gray-400 mt-0.5">{p.address}</p>}
                    {p.distanceKm > 0 && (
                      <p className="text-xs font-semibold mt-1">{p.distanceKm.toFixed(1)} km away</p>
                    )}
                    <a
                      href={`/profile/${p.id}`}
                      className="block mt-2 text-xs text-center py-1 px-3 bg-[#001E40] text-white rounded-lg"
                    >
                      View Profile →
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Entity pins */}
            {visibleEntities.map(e => {
              const modeInfo = MODES.find(m => m.value === e.type)
              return (
                <Marker
                  key={e.id}
                  position={[e.latitude, e.longitude]}
                  icon={makeSquareIcon(modeInfo?.color ?? '#DC2626', modeInfo?.emoji ?? '🏥')}
                >
                  <Popup>
                    <div className="min-w-[160px] text-sm">
                      <p className="font-bold text-gray-900">{e.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{e.type}</p>
                      {e.address && <p className="text-xs text-gray-400 mt-0.5">{e.address}</p>}
                      {e.city && <p className="text-xs text-gray-400">{e.city}</p>}
                      {e.distanceKm > 0 && (
                        <p className="text-xs font-semibold mt-1">{e.distanceKm.toFixed(1)} km away</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* User position */}
            {userPos && (
              <Marker position={userPos} icon={userIcon}>
                <Popup><span className="text-sm font-semibold">Your location</span></Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* ── Nearest results sidebar ──────────────────────────────── */}
        <div className="lg:w-72 xl:w-80 bg-[#001830] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col">
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-sm font-bold text-white">
              {userPos ? 'Nearest to you' : 'All providers'}&nbsp;
              <span className="text-white/40 font-normal">({nearestAll.length})</span>
            </p>
            {!userPos && (
              <p className="text-xs text-white/50 mt-0.5">Enable location to sort by distance</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {nearestAll.length === 0 && (
              <div className="px-5 py-10 text-center">
                <FaClinicMedical className="text-white/20 text-3xl mx-auto mb-2" />
                <p className="text-xs text-white/40">No results for this filter</p>
                <p className="text-xs text-white/30 mt-1">Seed geo coordinates to see pins</p>
              </div>
            )}
            {nearestAll.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => setFlyTarget({ pos: [item.latitude, item.longitude], zoom: 15 })}
              >
                <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden bg-white/10 flex items-center justify-center">
                  {'firstName' in item && item.profileImage ? (
                    <Image src={item.profileImage} alt="" width={36} height={36} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base">
                      {MODES.find(m => m.value === ('type' in item ? item.type : item.userType))?.emoji ?? '🏥'}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {'firstName' in item ? `${item.firstName} ${item.lastName}` : ('name' in item ? item.name : '')}
                  </p>
                  <p className="text-[10px] text-white/50 truncate capitalize">
                    {'userType' in item ? item.userType.toLowerCase().replace(/_/g, ' ') : ('type' in item ? item.type : '')}
                    {'specialty' in item && item.specialty?.length > 0 ? ` · ${item.specialty[0]}` : ''}
                    {'city' in item && item.city ? ` · ${item.city}` : ''}
                  </p>
                </div>

                {userPos && item.distanceKm > 0 && (
                  <span className="text-[10px] text-brand-sky font-semibold flex-shrink-0">
                    {item.distanceKm < 1
                      ? `${Math.round(item.distanceKm * 1000)} m`
                      : `${item.distanceKm.toFixed(1)} km`}
                  </span>
                )}
                <FaChevronRight className="text-white/20 text-[10px] flex-shrink-0" />
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-white/10">
            <Link
              href="/search/providers"
              className="block w-full text-center text-xs font-semibold text-brand-sky hover:text-white transition-colors"
            >
              Browse all providers →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
