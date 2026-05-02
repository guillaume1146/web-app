'use client'

import { useState } from 'react'
import { FaStar, FaRegStar, FaTimes } from 'react-icons/fa'

/**
 * Star-rating + comment modal. Calls POST /api/providers/:id/reviews.
 * Auto-opens when a booking transitions to `completed` (caller decides).
 */
export default function ReviewModal({
  providerId,
  providerName,
  onClose,
  onSubmitted,
}: {
  providerId: string
  providerName?: string
  onClose: () => void
  onSubmitted?: () => void
}) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (rating === 0) { setError('Please pick a rating'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/providers/${providerId}/reviews`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      })
      const json = await res.json()
      if (!json?.success) throw new Error(json?.message || 'Failed')
      onSubmitted?.()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally { setBusy(false) }
  }

  const shown = hover || rating
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">How was it?</h2>
            <p className="text-xs text-gray-500">
              {providerName ? `Rate your visit with ${providerName}.` : 'Rate your experience with this provider.'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>

        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-1 focus:outline-none focus:ring-2 focus:ring-amber-300 rounded"
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
            >
              {shown >= n
                ? <FaStar size={36} className="text-amber-500" />
                : <FaRegStar size={36} className="text-gray-300" />}
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your experience (optional)"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0C6780] outline-none resize-none"
        />

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Skip
          </button>
          <button
            onClick={submit}
            disabled={busy || rating === 0}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#0C6780] rounded-lg hover:bg-[#0a5568] disabled:opacity-50"
          >
            {busy ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  )
}
