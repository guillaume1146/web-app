'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
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

const MAURITIUS_CENTER = { lat: -20.2, lng: 57.5 }

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0a2744' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#001E40' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9AE1FF' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0C3460' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a4a6b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0C2A44' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0d3a5c' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a6090' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0d2f4a' }] },
]

// ─── Haversine (client-side, used when user grants location) ─────────────────

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
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: 'mediwyz-map',
  })

  const mapRef = useRef<google.maps.Map | null>(null)
  const [mode, setMode] = useState<SearchMode>('ALL')
  const [userPos, setUserPos]     = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating]   = useState(false)
  const [locError, setLocError]   = useState<string | null>(null)
  const [providers, setProviders] = useState<ProviderPin[]>([])
  const [entities, setEntities]   = useState<EntityPin[]>([])
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState<(ProviderPin | EntityPin) | null>(null)

  // Load all pins on mount
  useEffect(() => {
    fetch('/api/geo/map-data')
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setProviders(j.data.providers)
          setEntities(j.data.entities)
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
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPos(p)
        setLocating(false)
        mapRef.current?.panTo(p)
        mapRef.current?.setZoom(13)
      },
      () => { setLocating(false); setLocError('Location access denied') },
      { timeout: 8000 },
    )
  }, [])

  const searchNearest = useCallback(async () => {
    if (!userPos) { locate(); return }
    setLoading(true)
    try {
      let url = ''
      if (mode === 'ALL') {
        // Client-side sort from already-loaded data
        const sortedProviders = [...providers]
          .map(p => ({ ...p, distanceKm: haversineKm(userPos.lat, userPos.lng, p.latitude, p.longitude) }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
        const sortedEntities = [...entities]
          .map(e => ({ ...e, distanceKm: haversineKm(userPos.lat, userPos.lng, e.latitude, e.longitude) }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
        setProviders(sortedProviders)
        setEntities(sortedEntities)
        setLoading(false)
        return
      }
      if (PROVIDER_TYPES.has(mode)) {
        url = `/api/geo/providers?type=${mode}&lat=${userPos.lat}&lng=${userPos.lng}&limit=8`
        const j = await fetch(url).then(r => r.json())
        if (j.success) setProviders(j.data)
      } else if (ENTITY_TYPES.has(mode)) {
        url = `/api/geo/entities?type=${mode}&lat=${userPos.lat}&lng=${userPos.lng}&limit=8`
        const j = await fetch(url).then(r => r.json())
        if (j.success) setEntities(j.data)
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false)
    }
  }, [userPos, mode, providers, entities, locate])

  // Visible pins depending on mode
  const visibleProviders = mode === 'ALL' || PROVIDER_TYPES.has(mode)
    ? (mode === 'ALL' ? providers : providers.filter(p => p.userType === mode))
    : []
  const visibleEntities = mode === 'ALL' || ENTITY_TYPES.has(mode)
    ? (mode === 'ALL' ? entities : entities.filter(e => e.type === mode))
    : []

  // Results list = nearest N when user pos known
  const nearestProviders = userPos
    ? [...visibleProviders].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5)
    : visibleProviders.slice(0, 5)
  const nearestEntities = userPos
    ? [...visibleEntities].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5)
    : visibleEntities.slice(0, 5)
  const nearestAll = [...nearestProviders, ...nearestEntities]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 6)

  const modeColor = MODES.find(m => m.value === mode)?.color ?? '#0C6780'

  function markerIcon(color: string, size = 32) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 32 32'>
      <circle cx='16' cy='16' r='14' fill='${color}' stroke='white' stroke-width='2.5'/>
      <circle cx='16' cy='16' r='6' fill='white'/>
    </svg>`
    return { url: `data:image/svg+xml;base64,${btoa(svg)}`, scaledSize: new window.google.maps.Size(size, size), anchor: new window.google.maps.Point(size / 2, size / 2) }
  }

  function entityMarkerIcon(color: string) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'>
      <rect x='4' y='4' width='28' height='28' rx='6' fill='${color}' stroke='white' stroke-width='2.5'/>
      <text x='18' y='24' text-anchor='middle' font-size='16' fill='white'>🏥</text>
    </svg>`
    return { url: `data:image/svg+xml;base64,${btoa(svg)}`, scaledSize: new window.google.maps.Size(36, 36), anchor: new window.google.maps.Point(18, 18) }
  }

  const providerColor = (type: string) => MODES.find(m => m.value === type)?.color ?? '#0C6780'

  const onMapLoad = useCallback((map: google.maps.Map) => { mapRef.current = map }, [])

  return (
    <section className="bg-[#001E40] overflow-hidden">
      {/* Header bar */}
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

          {/* Locate button */}
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
              {loading ? <FaSpinner className="animate-spin inline mr-1" /> : null}
              Sort by distance
            </button>
          )}
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="flex flex-col lg:flex-row" style={{ minHeight: 420 }}>

        {/* ── Map ────────────────────────────────────────────────────── */}
        <div className="flex-1 relative" style={{ minHeight: 340 }}>
          {!apiKey && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a2a46] z-10">
              <div className="text-center px-6">
                <FaMapMarkerAlt className="text-brand-sky text-4xl mx-auto mb-3" />
                <p className="text-white font-semibold text-sm">Google Maps API key not configured</p>
                <p className="text-white/50 text-xs mt-1">
                  Add <code className="bg-white/10 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your .env.local
                </p>
              </div>
            </div>
          )}
          {loadError && apiKey && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a2a46] z-10">
              <p className="text-red-400 text-sm">Map failed to load. Check your API key.</p>
            </div>
          )}
          {isLoaded && !loadError && (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%', minHeight: 340 }}
              center={userPos ?? MAURITIUS_CENTER}
              zoom={userPos ? 12 : 10}
              onLoad={onMapLoad}
              options={{
                styles: MAP_STYLES,
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                backgroundColor: '#001E40',
              }}
            >
              {/* Provider pins */}
              {visibleProviders.map(p => (
                <Marker
                  key={p.id}
                  position={{ lat: p.latitude, lng: p.longitude }}
                  icon={markerIcon(providerColor(p.userType))}
                  title={`Dr. ${p.firstName} ${p.lastName}`}
                  onClick={() => setSelected(p)}
                />
              ))}

              {/* Entity pins */}
              {visibleEntities.map(e => (
                <Marker
                  key={e.id}
                  position={{ lat: e.latitude, lng: e.longitude }}
                  icon={entityMarkerIcon('#DC2626')}
                  title={e.name}
                  onClick={() => setSelected(e)}
                />
              ))}

              {/* User position */}
              {userPos && (
                <Marker
                  position={userPos}
                  icon={{
                    url: "data:image/svg+xml;base64," + btoa(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10' fill='#9AE1FF' stroke='white' stroke-width='3'/><circle cx='12' cy='12' r='4' fill='white'/></svg>`),
                    scaledSize: new window.google.maps.Size(24, 24),
                    anchor: new window.google.maps.Point(12, 12),
                  }}
                  title="Your location"
                  zIndex={999}
                />
              )}

              {/* Info window */}
              {selected && (
                <InfoWindow
                  position={'latitude' in selected ? { lat: selected.latitude, lng: selected.longitude } : MAURITIUS_CENTER}
                  onCloseClick={() => setSelected(null)}
                >
                  <div className="min-w-[180px] text-sm p-1">
                    {'firstName' in selected ? (
                      <>
                        <p className="font-bold text-gray-900">{selected.firstName} {selected.lastName}</p>
                        <p className="text-xs text-gray-500 capitalize">{selected.userType.toLowerCase().replace('_', ' ')}</p>
                        {selected.specialty?.length > 0 && (
                          <p className="text-xs text-brand-teal mt-0.5">{selected.specialty.slice(0, 2).join(', ')}</p>
                        )}
                        {selected.address && <p className="text-xs text-gray-400 mt-0.5">{selected.address}</p>}
                        {selected.distanceKm > 0 && (
                          <p className="text-xs font-semibold text-brand-navy mt-1">{selected.distanceKm.toFixed(1)} km away</p>
                        )}
                        <Link
                          href={`/profile/${selected.id}`}
                          className="block mt-2 text-xs text-center py-1 px-3 bg-brand-navy text-white rounded-lg"
                        >
                          View Profile →
                        </Link>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-gray-900">{'name' in selected ? selected.name : ''}</p>
                        <p className="text-xs text-gray-500 capitalize">{'type' in selected ? selected.type : ''}</p>
                        {'address' in selected && selected.address && <p className="text-xs text-gray-400 mt-0.5">{selected.address}</p>}
                        {'city' in selected && selected.city && <p className="text-xs text-gray-400">{selected.city}</p>}
                        {selected.distanceKm > 0 && (
                          <p className="text-xs font-semibold text-brand-navy mt-1">{selected.distanceKm.toFixed(1)} km away</p>
                        )}
                      </>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}

          {/* Loading skeleton when map hasn't loaded yet */}
          {!isLoaded && !loadError && apiKey && (
            <div className="absolute inset-0 bg-[#0a2a46] flex items-center justify-center">
              <FaSpinner className="text-brand-sky text-3xl animate-spin" />
            </div>
          )}
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
              </div>
            )}
            {nearestAll.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => {
                  setSelected(item)
                  mapRef.current?.panTo({ lat: item.latitude, lng: item.longitude })
                  mapRef.current?.setZoom(15)
                }}
              >
                {/* Avatar / icon */}
                <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden bg-white/10 flex items-center justify-center">
                  {'firstName' in item && item.profileImage ? (
                    <Image src={item.profileImage} alt="" width={36} height={36} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base">{MODES.find(m => m.value === ('type' in item ? item.type : item.userType))?.emoji ?? '🏥'}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {'firstName' in item ? `${item.firstName} ${item.lastName}` : ('name' in item ? item.name : '')}
                  </p>
                  <p className="text-[10px] text-white/50 truncate capitalize">
                    {'userType' in item ? item.userType.toLowerCase().replace('_', ' ') : ('type' in item ? item.type : '')}
                    {'specialty' in item && item.specialty?.length > 0 ? ` · ${item.specialty[0]}` : ''}
                    {'city' in item && item.city ? ` · ${item.city}` : ''}
                  </p>
                </div>

                {/* Distance */}
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

          {/* Footer CTA */}
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
