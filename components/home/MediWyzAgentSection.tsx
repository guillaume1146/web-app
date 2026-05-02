'use client'

import { useState } from 'react'
import { FaRobot, FaPaperPlane, FaSpinner } from 'react-icons/fa'

/**
 * MediWyz Agent — landing-page AI chat replacing the old static FAQ.
 *
 * Posts to the existing `/api/ai/chat` endpoint with a short "landing-page
 * agent" system hint. Public (no auth required) so anonymous visitors can
 * ask "How do I book a doctor?", "Do you accept my insurance?", etc.
 *
 * Intentionally lightweight: no history persistence, no streaming — a
 * clean starter that the user can grow into a full-featured chat later.
 */
interface Turn {
  role: 'user' | 'agent'
  text: string
}

const SUGGESTED = [
  'How do I book a doctor?',
  'What is the Health Shop?',
  'Do you deliver to my area?',
  'Can I use my health insurance?',
]

export default function MediWyzAgentSection() {
  const [turns, setTurns] = useState<Turn[]>([
    { role: 'agent', text: "Hi 👋 I'm the MediWyz Agent. Ask me anything about booking providers, health products, insurance, or how the platform works." },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  async function ask(text: string) {
    const clean = text.trim()
    if (!clean || sending) return
    setInput('')
    setTurns(prev => [...prev, { role: 'user', text: clean }])
    setSending(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: clean,
          context: 'public-landing-page',
          system: "You are the MediWyz Agent. Answer visitor questions about booking healthcare providers, the Health Shop, insurance coverage, and how MediWyz works in Mauritius. Keep replies under 3 short sentences. If asked about personal medical advice, redirect them to book a provider.",
        }),
      })
      const json = await res.json()
      const reply = json?.data?.message ?? json?.message ?? "Sorry, I couldn't process that. Try booking a provider for personalised advice."
      setTurns(prev => [...prev, { role: 'agent', text: String(reply) }])
    } catch {
      setTurns(prev => [...prev, { role: 'agent', text: "I'm having trouble right now. Please try again in a moment." }])
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="py-10 bg-gradient-to-br from-brand-navy to-brand-teal">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-6 text-white">
          <div className="inline-flex items-center gap-2 text-sm font-semibold bg-white/20 rounded-full px-3 py-1 mb-3">
            <FaRobot /> MediWyz Agent
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold">Have a question? Just ask.</h2>
          <p className="text-sm sm:text-base text-white/80 mt-1">
            Instant answers about our services, providers, and how to get started.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Conversation */}
          <div className="p-4 sm:p-5 space-y-3 max-h-[50vh] overflow-y-auto">
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    t.role === 'user'
                      ? 'bg-brand-navy text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}
                >
                  {t.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-2xl rounded-bl-sm text-sm inline-flex items-center gap-2">
                  <FaSpinner className="animate-spin" /> Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Suggested chips (first turn only) */}
          {turns.length === 1 && (
            <div className="px-4 sm:px-5 pb-3 flex flex-wrap gap-2">
              {SUGGESTED.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-brand-teal/10 text-brand-navy hover:bg-brand-teal/20 border border-brand-teal/20 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={e => { e.preventDefault(); ask(input) }}
            className="border-t border-gray-100 p-3 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask the MediWyz Agent..."
              className="flex-1 px-3 py-2 text-sm bg-gray-50 rounded-lg focus:ring-2 focus:ring-brand-teal focus:bg-white outline-none"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="w-10 h-10 rounded-lg bg-brand-navy hover:bg-brand-teal text-white flex items-center justify-center disabled:opacity-40 transition"
            >
              <FaPaperPlane className="text-xs" />
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
