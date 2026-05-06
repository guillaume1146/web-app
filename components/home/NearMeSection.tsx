'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  DirectionsService,
  DirectionsRenderer,
} from '@react-google-maps/api'
import {
  FaMapMarkerAlt, FaCrosshairs, FaSpinner, FaChevronRight,
  FaClinicMedical, FaExclamationTriangle, FaRoute, FaTimes,
} from 'react-icons/fa'
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

type AnyPin = ProviderPin | EntityPin

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
const ENTITY_TYPES   = new Set(['clinic', 'hospital', 'laboratory', 'pharmacy'])

const MAURITIUS_CENTER = { lat: -20.2, lng: 57.5 }

const LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry']

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',              stylers: [{ color: '#0a2744' }] },
  { elementType: 'labels.text.stroke',    stylers: [{ color: '#001E40' }] },
  { elementType: 'labels.text.fill',      stylers: [{ color: '#9AE1FF' }] },
  { featureType: 'water',    elementType: 'geometry',          stylers: [{ color: '#0C3460' }] },
  { featureType: 'road',     elementType: 'geometry',          stylers: [{ color: '#1a4a6b' }] },
  { featureType: 'road',     elementType: 'geometry.stroke',   stylers: [{ color: '#0C2A44' }] },
  { featureType: 'poi',      elementType: 'geometry',          stylers: [{ color: '#0d3a5c' }] },
  { featureType: 'administrative', elementType: 'geometry',   stylers: [{ color: '#2a6090' }] },
  { featureType: 'landscape',      elementType: 'geometry',   stylers: [{ color: '#0d2f4a' }] },
]

// ─── Haversine ───────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Error panel ─────────────────────────────────────────────────────────────

function MapErrorPanel({ error, apiKey }: { error: Error | null; apiKey: string }) {
  if (!apiKey) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a2a46] z-10">
        <div className="text-center px-6 max-w-sm">
          <FaMapMarkerAlt className="text-brand-sky text-4xl mx-auto mb-3" />
          <p className="text-white font-semibold text-sm">Google Maps API key not configured</p>
          <p className="text-white/50 text-xs mt-1">
            Add <code className="bg-white/10 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your <code className="bg-white/10 px-1 rounded">.env.local</code>
          </p>
        </div>
      </div>
    )
  }

  const msg = error?.message ?? ''
  let title = 'Map failed to load'
  let detail = msg
  let fix = ''

  if (msg.includes('RefererNotAllowedMapError') || msg.includes('referrer') || msg.includes('Referer')) {
    title = 'Referrer restriction is blocking this domain'
    detail = 'Your API key only allows specific websites. This origin is not in the allowed list.'
    fix = 'referrer'
  } else if (msg.includes('ApiNotActivatedMapError') || msg.includes('not activated') || msg.includes('not enabled')) {
    title = 'Maps JavaScript API not enabled'
    detail = 'The "Maps JavaScript API" service must be enabled for your key.'
    fix = 'api'
  } else if (msg.includes('BillingNotEnabledMapError') || msg.includes('billing') || msg.includes('quota')) {
    title = 'Billing not enabled'
    detail = 'Google Maps Platform requires billing to be enabled even for the free tier.'
    fix = 'billing'
  } else if (msg.includes('InvalidKeyMapError') || msg.includes('invalid') || msg.includes('API key')) {
    title = 'Invalid API key'
    detail = 'The API key may have been deleted, rotated, or is malformed.'
    fix = 'key'
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a2a46] z-10 p-6">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-2 mb-3">
          <FaExclamationTriangle className="text-amber-400 text-lg flex-shrink-0" />
          <p className="text-white font-bold text-sm">{title}</p>
        </div>
        {detail && <p className="text-white/60 text-xs mb-4">{detail}</p>}
        {msg && (
          <pre className="bg-black/30 text-red-300 text-[10px] px-3 py-2 rounded-lg mb-4 overflow-x-auto whitespace-pre-wrap break-all">
            {msg}
          </pre>
        )}
        {fix === 'referrer' && (
          <div className="bg-white/5 rounded-xl p-4 text-xs text-white/70 space-y-1.5">
            <p className="font-semibold text-white text-[11px] mb-2">Fix in Google Cloud Console:</p>
            <p>1. APIs &amp; Services → Credentials → edit your key</p>
            <p>2. Application restrictions → Website restrictions</p>
            <p>3. Add: <code className="bg-black/30 px-1 rounded text-green-300">localhost:3000/*</code> and <code className="bg-black/30 px-1 rounded text-green-300">mediwyz.com/*</code></p>
          </div>
        )}
        {fix === 'api' && (
          <div className="bg-white/5 rounded-xl p-4 text-xs text-white/70 space-y-1.5">
            <p className="font-semibold text-white text-[11px] mb-2">Fix:</p>
            <p>Enable <strong className="text-white">Maps JavaScript API</strong>, <strong className="text-white">Directions API</strong>, and <strong className="text-white">Places API</strong> in the API Library.</p>
          </div>
        )}
        {fix === 'billing' && (
          <div className="bg-white/5 rounded-xl p-4 text-xs text-white/70 space-y-1.5">
            <p>Link a billing account at console.cloud.google.com → Billing. Google gives $200 free credit/month.</p>
          </div>
        )}
        {fix === 'key' && (
          <div className="bg-white/5 rounded-xl p-4 text-xs text-white/70">
            <p>Copy the key from Google Cloud Console → Credentials and update <code className="bg-black/30 px-1 rounded">.env.local</code></p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NearMeSection() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: 'mediwyz-map',
    libraries: LIBRARIES,
  })

  const mapRef = useRef<google.maps.Map | null>(null)

  const [mode, setMode]           = useState<SearchMode>('ALL')
  const [userPos, setUserPos]     = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating]   = useState(false)
  const [locError, setLocError]   = useState<string | null>(null)
  const [providers, setProviders] = useState<ProviderPin[]>([])
  const [entities, setEntities]   = useState<EntityPin[]>([])
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState<AnyPin | null>(null)

  // Directions state
  const [dirTarget, setDirTarget]   = useState<AnyPin | null>(null)         // triggers DirectionsService
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [routeInfo, setRouteInfo]   = useState<{ distance: string; duration: string } | null>(null)

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

  const sortByDistance = useCallback(async () => {
    if (!userPos) { locate(); return }
    setLoading(true)
    setProviders(prev =>
      [...prev]
        .map(p => ({ ...p, distanceKm: haversineKm(userPos.lat, userPos.lng, p.latitude, p.longitude) }))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    )
    setEntities(prev =>
      [...prev]
        .map(e => ({ ...e, distanceKm: haversineKm(userPos.lat, userPos.lng, e.latitude, e.longitude) }))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    )
    setLoading(false)
  }, [userPos, locate])

  // "Find Nearest" — locate then pan to closest visible pin
  const findNearest = useCallback(() => {
    if (!navigator.geolocation) { setLocError('Geolocation not supported'); return }
    setLocating(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPos(p)
        setLocating(false)

        const allVisible = [
          ...providers.map(pr => ({ pin: pr as AnyPin, d: haversineKm(p.lat, p.lng, pr.latitude, pr.longitude) })),
          ...entities.map(en => ({ pin: en as AnyPin, d: haversineKm(p.lat, p.lng, en.latitude, en.longitude) })),
        ]
        if (allVisible.length === 0) return

        const nearest = allVisible.sort((a, b) => a.d - b.d)[0]
        setSelected(nearest.pin)
        mapRef.current?.panTo({ lat: nearest.pin.latitude, lng: nearest.pin.longitude })
        mapRef.current?.setZoom(15)
      },
      () => { setLocating(false); setLocError('Location access denied') },
      { timeout: 8000 },
    )
  }, [providers, entities])

  const clearRoute = useCallback(() => {
    setDirections(null)
    setDirTarget(null)
    setRouteInfo(null)
  }, [])

  const requestRoute = useCallback((pin: AnyPin) => {
    if (!userPos) { locate(); return }
    setDirections(null)
    setRouteInfo(null)
    setDirTarget(pin)
    setSelected(null)
  }, [userPos, locate])

  const onDirectionsCallback = useCallback(
    (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
      if (status === 'OK' && result) {
        setDirections(result)
        const leg = result.routes[0]?.legs[0]
        if (leg) setRouteInfo({ distance: leg.distance?.text ?? '', duration: leg.duration?.text ?? '' })
      }
      // Clear target regardless so the service doesn't fire again
      setDirTarget(null)
    },
    [],
  )

  // Visible pins based on mode
  const visibleProviders = mode === 'ALL' || PROVIDER_TYPES.has(mode)
    ? (mode === 'ALL' ? providers : providers.filter(p => p.userType === mode))
    : []
  const visibleEntities = mode === 'ALL' || ENTITY_TYPES.has(mode)
    ? (mode === 'ALL' ? entities : entities.filter(e => e.type === mode))
    : []

  // Sidebar list (sorted by distance when user location is known)
  const nearestAll = [...visibleProviders, ...visibleEntities]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 8)

  const providerColor = (type: string) => MODES.find(m => m.value === type)?.color ?? '#0C6780'

  function svgUrl(svg: string) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }

  function markerIcon(color: string, size = 32) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2.5"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>`
    return {
      url: svgUrl(svg),
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size / 2, size / 2),
    }
  }

  function entityMarkerIcon(color: string) {
    // Use a cross/plus shape instead of emoji (emoji breaks btoa on non-Latin1)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <rect x="4" y="4" width="28" height="28" rx="6" fill="${color}" stroke="white" stroke-width="2.5"/>
      <rect x="15" y="9" width="6" height="18" rx="2" fill="white"/>
      <rect x="9" y="15" width="18" height="6" rx="2" fill="white"/>
    </svg>`
    return {
      url: svgUrl(svg),
      scaledSize: new window.google.maps.Size(36, 36),
      anchor: new window.google.maps.Point(18, 18),
    }
  }

  const onMapLoad = useCallback((map: google.maps.Map) => { mapRef.current = map }, [])

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
              Discover providers &amp; clinics near you — tap a pin for directions
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={findNearest}
              disabled={locating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-sky text-brand-navy text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-colors"
            >
              {locating ? <FaSpinner className="animate-spin" /> : <FaMapMarkerAlt />}
              Find Nearest
            </button>
            <button
              onClick={locate}
              disabled={locating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-teal text-white text-sm font-semibold hover:bg-[#0a5568] disabled:opacity-60 transition-colors"
            >
              {locating ? <FaSpinner className="animate-spin" /> : <FaCrosshairs />}
              {userPos ? 'Update' : 'My Location'}
            </button>
          </div>
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
              onClick={sortByDistance}
              disabled={loading}
              className="ml-auto px-4 py-1.5 rounded-full text-xs font-bold bg-brand-sky text-brand-navy transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {loading && <FaSpinner className="animate-spin inline mr-1" />}
              Sort by distance
            </button>
          )}
        </div>
      </div>

      {/* Route info banner */}
      {routeInfo && (
        <div className="mx-6 sm:mx-10 lg:mx-16 mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-teal/20 border border-brand-teal/40">
          <FaRoute className="text-brand-sky flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-white">Route calculated</p>
            <p className="text-xs text-white/70">{routeInfo.distance} · {routeInfo.duration} by car</p>
          </div>
          <button onClick={clearRoute} className="text-white/50 hover:text-white transition-colors p-1">
            <FaTimes className="text-xs" />
          </button>
        </div>
      )}

      {/* Map + sidebar */}
      <div className="flex flex-col lg:flex-row" style={{ minHeight: 420 }}>

        {/* ── Map ──────────────────────────────────────────────────── */}
        <div className="flex-1 relative" style={{ minHeight: 340 }}>

          {(!apiKey || loadError) && (
            <MapErrorPanel error={loadError ?? null} apiKey={apiKey} />
          )}

          {!isLoaded && !loadError && apiKey && (
            <div className="absolute inset-0 bg-[#0a2a46] flex items-center justify-center z-10">
              <FaSpinner className="text-brand-sky text-3xl animate-spin" />
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
                  onClick={() => setSelected(p)}
                />
              ))}

              {/* Entity pins */}
              {visibleEntities.map(e => (
                <Marker
                  key={e.id}
                  position={{ lat: e.latitude, lng: e.longitude }}
                  icon={entityMarkerIcon('#DC2626')}
                  onClick={() => setSelected(e)}
                />
              ))}

              {/* User location pin */}
              {userPos && (
                <Marker
                  position={userPos}
                  icon={{
                    url: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#9AE1FF" stroke="white" stroke-width="3"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`),
                    scaledSize: new window.google.maps.Size(24, 24),
                    anchor: new window.google.maps.Point(12, 12),
                  }}
                  zIndex={999}
                />
              )}

              {/* InfoWindow */}
              {selected && (
                <InfoWindow
                  position={{ lat: selected.latitude, lng: selected.longitude }}
                  onCloseClick={() => setSelected(null)}
                >
                  <div className="min-w-[190px] text-sm p-1">
                    {'firstName' in selected ? (
                      <>
                        <p className="font-bold text-gray-900">{selected.firstName} {selected.lastName}</p>
                        <p className="text-xs text-gray-500 capitalize">{selected.userType.toLowerCase().replace(/_/g, ' ')}</p>
                        {selected.specialty?.length > 0 && (
                          <p className="text-xs text-[#0C6780] mt-0.5">{selected.specialty.slice(0, 2).join(', ')}</p>
                        )}
                        {selected.address && <p className="text-xs text-gray-400 mt-0.5">{selected.address}</p>}
                        {selected.distanceKm > 0 && (
                          <p className="text-xs font-semibold text-[#001E40] mt-1">{selected.distanceKm.toFixed(1)} km away</p>
                        )}
                        <div className="flex gap-1.5 mt-2">
                          <Link href={`/profile/${selected.id}`} className="flex-1 text-xs text-center py-1 px-2 bg-[#001E40] text-white rounded-lg">
                            Profile →
                          </Link>
                          {userPos && (
                            <button
                              onClick={() => requestRoute(selected)}
                              className="flex-1 text-xs py-1 px-2 bg-[#0C6780] text-white rounded-lg flex items-center justify-center gap-1"
                            >
                              <FaRoute className="text-[9px]" /> Directions
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-gray-900">{'name' in selected ? selected.name : ''}</p>
                        <p className="text-xs text-gray-500 capitalize">{'type' in selected ? selected.type : ''}</p>
                        {'address' in selected && selected.address && <p className="text-xs text-gray-400 mt-0.5">{selected.address}</p>}
                        {'city' in selected && selected.city && <p className="text-xs text-gray-400">{selected.city}</p>}
                        {'phone' in selected && selected.phone && <p className="text-xs text-gray-400">{selected.phone}</p>}
                        {selected.distanceKm > 0 && (
                          <p className="text-xs font-semibold text-[#001E40] mt-1">{selected.distanceKm.toFixed(1)} km away</p>
                        )}
                        {userPos && (
                          <button
                            onClick={() => requestRoute(selected)}
                            className="mt-2 w-full text-xs py-1 px-2 bg-[#0C6780] text-white rounded-lg flex items-center justify-center gap-1"
                          >
                            <FaRoute className="text-[9px]" /> Get Directions
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </InfoWindow>
              )}

              {/* Directions request — fires once when dirTarget is set */}
              {dirTarget && userPos && (
                <DirectionsService
                  options={{
                    origin: userPos,
                    destination: { lat: dirTarget.latitude, lng: dirTarget.longitude },
                    travelMode: google.maps.TravelMode.DRIVING,
                  }}
                  callback={onDirectionsCallback}
                />
              )}

              {/* Route overlay */}
              {directions && (
                <DirectionsRenderer
                  options={{
                    directions,
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: '#9AE1FF',
                      strokeOpacity: 0.85,
                      strokeWeight: 5,
                    },
                  }}
                />
              )}
            </GoogleMap>
          )}
        </div>

        {/* ── Nearest results sidebar ──────────────────────────────── */}
        <div className="lg:w-72 xl:w-80 bg-[#001830] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col">
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-sm font-bold text-white">
              {userPos ? 'Nearest to you' : 'All nearby'}&nbsp;
              <span className="text-white/40 font-normal">({nearestAll.length})</span>
            </p>
            {!userPos && <p className="text-xs text-white/50 mt-0.5">Enable location to sort by distance</p>}
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

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {userPos && item.distanceKm > 0 && (
                    <span className="text-[10px] text-brand-sky font-semibold">
                      {item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)} m` : `${item.distanceKm.toFixed(1)} km`}
                    </span>
                  )}
                  {userPos && (
                    <button
                      onClick={(e) => { e.stopPropagation(); requestRoute(item) }}
                      className="text-[9px] text-white/40 hover:text-brand-sky transition-colors flex items-center gap-0.5"
                      title="Get directions"
                    >
                      <FaRoute className="text-[8px]" /> Route
                    </button>
                  )}
                </div>

                <FaChevronRight className="text-white/20 text-[10px] flex-shrink-0 ml-0.5" />
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-white/10">
            <Link href="/search/providers" className="block w-full text-center text-xs font-semibold text-brand-sky hover:text-white transition-colors">
              Browse all providers →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
