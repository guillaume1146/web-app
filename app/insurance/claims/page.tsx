'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaPlus, FaFileAlt, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaCamera, FaMagic, FaSpinner } from 'react-icons/fa'

interface Claim {
  id: string
  amount: number
  currency: string
  description: string
  status: 'pending' | 'approved' | 'denied' | 'paid'
  receiptUrl?: string | null
  reviewerNote?: string | null
  createdAt: string
  company?: { id: string; companyName: string }
  member?: { firstName: string; lastName: string; email: string }
}

/**
 * Member-side claim submission + claim history. Owners see their
 * company's claims at /insurance/claims?as=owner (same page, different data).
 */
export default function InsuranceClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [asOwner, setAsOwner] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Member form state
  const [companyProfileId, setCompanyProfileId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [myCompanies, setMyCompanies] = useState<{ id: string; companyName: string }[]>([])
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrResult, setOcrResult] = useState<null | {
    confidence: 'low' | 'medium' | 'high'
    merchant: string | null
    date: string | null
    category: string | null
  }>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/corporate/insurance/claims${asOwner ? '?as=owner' : ''}`,
        { credentials: 'include' },
      )
      const json = await res.json()
      setClaims(Array.isArray(json?.data) ? json.data : [])
    } catch { setClaims([]) }
    finally { setLoading(false) }
  }

  const loadMyCompanies = async () => {
    // Only populate when opening the form — companies user is a member of.
    try {
      const res = await fetch('/api/corporate/insurance-companies', { credentials: 'include' })
      const json = await res.json()
      setMyCompanies(Array.isArray(json?.data) ? json.data : [])
    } catch { /* */ }
  }

  useEffect(() => { load() }, [asOwner])

  /**
   * Upload a receipt image, then ask the backend's Groq-backed OCR to
   * extract fields. Auto-populates amount + description + receiptUrl so
   * the member just reviews before submitting.
   */
  const handleReceiptUpload = async (file: File) => {
    setOcrBusy(true); setError(null); setOcrResult(null)
    try {
      // Step 1: upload to get a URL the OCR service can read.
      const form = new FormData()
      form.append('file', file)
      form.append('type', 'receipt')
      form.append('name', file.name)
      const upRes = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' })
      const upJson = await upRes.json()
      if (!upJson.success) throw new Error(upJson.message || 'Upload failed')
      const absoluteUrl = `${window.location.origin}${upJson.data.url}`
      setReceiptUrl(absoluteUrl)

      // Step 2: run OCR.
      const ocrRes = await fetch('/api/corporate/insurance/claims/ocr', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: absoluteUrl }),
      })
      const ocrJson = await ocrRes.json()
      if (!ocrJson.success) throw new Error(ocrJson.message || 'OCR failed')
      const { merchant, date, category, totalAmount, confidence, items } = ocrJson.data

      // Step 3: auto-fill what we got.
      if (typeof totalAmount === 'number') setAmount(String(totalAmount))
      const lines = [
        merchant && `${merchant}${date ? ` · ${date}` : ''}`,
        category && `Category: ${category}`,
        Array.isArray(items) && items.length > 0
          ? items.slice(0, 5).map((i: { description: string; amount: number }) => `• ${i.description}`).join('\n')
          : null,
      ].filter(Boolean).join('\n')
      if (lines) setDescription(lines)
      setOcrResult({ confidence, merchant, date, category })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Receipt scan failed')
    } finally { setOcrBusy(false) }
  }

  const submit = async () => {
    if (!companyProfileId || !description.trim() || !amount) {
      setError('Please fill in all required fields')
      return
    }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/corporate/insurance/claims', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyProfileId,
          description: description.trim(),
          amount: parseFloat(amount),
          receiptUrl: receiptUrl.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!json?.success) throw new Error(json?.message || 'Failed')
      setShowForm(false)
      setCompanyProfileId(''); setDescription(''); setAmount(''); setReceiptUrl('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally { setBusy(false) }
  }

  const review = async (claimId: string, action: 'approve' | 'deny', note?: string) => {
    try {
      const res = await fetch(`/api/corporate/insurance/claims/${claimId}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerNote: note }),
      })
      const json = await res.json()
      if (!json?.success) throw new Error(json?.message)
      await load()
    } catch {
      alert('Failed — please try again')
    }
  }

  const statusBadge = (s: Claim['status']) => {
    const map = {
      pending:  { color: 'bg-amber-100 text-amber-700',  icon: FaHourglassHalf, label: 'Pending' },
      approved: { color: 'bg-blue-100 text-blue-700',    icon: FaCheckCircle,   label: 'Approved' },
      denied:   { color: 'bg-red-100 text-red-700',      icon: FaTimesCircle,   label: 'Declined' },
      paid:     { color: 'bg-green-100 text-green-700',  icon: FaCheckCircle,   label: 'Paid' },
    }[s]
    const Icon = map.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${map.color}`}>
        <Icon className="text-[10px]" /> {map.label}
      </span>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600"><FaArrowLeft /></Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FaFileAlt className="text-[#0C6780]" /> Insurance claims
        </h1>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-gray-100 p-1 text-sm">
          <button
            onClick={() => setAsOwner(false)}
            className={`px-3 py-1.5 rounded-md ${!asOwner ? 'bg-white shadow font-medium' : 'text-gray-600'}`}
          >My claims</button>
          <button
            onClick={() => setAsOwner(true)}
            className={`px-3 py-1.5 rounded-md ${asOwner ? 'bg-white shadow font-medium' : 'text-gray-600'}`}
          >As owner</button>
        </div>
        {!asOwner && (
          <button
            onClick={() => { setShowForm(true); loadMyCompanies() }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0C6780] text-white rounded-lg text-xs font-semibold hover:bg-[#0a5568]"
          >
            <FaPlus className="text-[10px]" /> File a claim
          </button>
        )}
      </div>

      {showForm && !asOwner && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">New claim</h2>

          {/* ─── OCR receipt scanner ─────────────────────────────── */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-start gap-3">
            <FaMagic className="text-indigo-600 text-lg mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-900 mb-1">Scan your receipt</p>
              <p className="text-[11px] text-indigo-800 leading-snug">
                Snap a photo or upload an image — we&apos;ll auto-fill the amount, category, and description. Review before submitting.
              </p>
              <input
                ref={fileInputRef}
                type="file" accept="image/*" capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleReceiptUpload(e.target.files[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={ocrBusy}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold bg-white hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 disabled:opacity-50"
              >
                {ocrBusy ? <FaSpinner className="animate-spin" /> : <FaCamera />}
                {ocrBusy ? 'Scanning…' : 'Upload receipt'}
              </button>
              {ocrResult && (
                <div className="mt-2 text-[11px] text-indigo-900">
                  <span className={`inline-block px-1.5 py-0.5 rounded-full mr-2 font-medium ${
                    ocrResult.confidence === 'high' ? 'bg-emerald-100 text-emerald-700'
                      : ocrResult.confidence === 'medium' ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>{ocrResult.confidence} confidence</span>
                  {ocrResult.merchant && <span>{ocrResult.merchant}</span>}
                  {ocrResult.date && <span> · {ocrResult.date}</span>}
                  {ocrResult.category && <span> · {ocrResult.category}</span>}
                  <span className="block text-[10px] text-indigo-700 mt-0.5">Please review every field before submitting.</span>
                </div>
              )}
            </div>
          </div>

          <select
            value={companyProfileId} onChange={e => setCompanyProfileId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">Pick an insurance company…</option>
            {myCompanies.map(c => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
          <textarea
            rows={3}
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Describe the service / incident you're claiming for"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number" inputMode="decimal"
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Amount"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <input
              type="url"
              value={receiptUrl} onChange={e => setReceiptUrl(e.target.value)}
              placeholder="Receipt URL (auto-filled by scan)"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={submit} disabled={busy} className="px-4 py-2 bg-[#0C6780] text-white text-sm font-semibold rounded-lg hover:bg-[#0a5568] disabled:opacity-50">
              {busy ? 'Submitting…' : 'Submit claim'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
      ) : claims.length === 0 ? (
        <div className="py-16 text-center">
          <FaFileAlt className="mx-auto text-4xl text-gray-300 mb-2" />
          <p className="text-gray-500">{asOwner ? 'No claims filed against your company yet.' : 'No claims yet.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">
                    MUR {c.amount.toLocaleString()} · {asOwner
                      ? `${c.member?.firstName ?? ''} ${c.member?.lastName ?? ''}`.trim() || 'Member'
                      : c.company?.companyName ?? 'Company'}
                  </p>
                  <p className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                {statusBadge(c.status)}
              </div>
              <p className="text-sm text-gray-700">{c.description}</p>
              {c.receiptUrl && (
                <a href={c.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0C6780] underline">
                  View receipt
                </a>
              )}
              {c.reviewerNote && (
                <p className="text-xs text-gray-500 italic">Reviewer note: {c.reviewerNote}</p>
              )}
              {asOwner && c.status === 'pending' && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => review(c.id, 'approve')}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700"
                  >Approve & pay</button>
                  <button
                    onClick={() => {
                      const note = prompt('Reason for declining (optional)') || undefined
                      review(c.id, 'deny', note)
                    }}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
                  >Decline</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
