import { NextRequest, NextResponse } from 'next/server'
import { rateLimitPublic } from '@/lib/rate-limit'
import { z } from 'zod'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.1-8b-instant'

const SYSTEM_PROMPT =
  'You are an AI Medical Support Assistant for MediWyz, a digital health platform in Mauritius. ' +
  'Help with emergency procedures (911 ambulance, 112 hospital), booking guidance, insurance claims, ' +
  'medication info, healthcare navigation. Never provide medical diagnoses. Be helpful and concise. ' +
  'Answer in English, French, or Mauritian Creole based on user\'s language.'

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      })
    )
    .max(20)
    .optional(),
})

interface GroqResponse {
  choices: {
    message: {
      content: string
    }
  }[]
}

/**
 * POST /api/ai/support
 * Public AI support chat endpoint — no auth required, rate limited.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { success: false, message: 'AI service is temporarily unavailable.' },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { message, history = [] } = parsed.data

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...history,
    { role: 'user' as const, content: message },
  ]

  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!groqRes.ok) {
      const errorText = await groqRes.text()
      console.error('Groq API error:', groqRes.status, errorText)
      return NextResponse.json(
        { success: false, message: 'AI service returned an error. Please try again.' },
        { status: 502 }
      )
    }

    const data: GroqResponse = await groqRes.json()
    const response = data.choices?.[0]?.message?.content

    if (!response) {
      return NextResponse.json(
        { success: false, message: 'No response from AI service.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, data: { response } })
  } catch (error) {
    console.error('POST /api/ai/support error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    )
  }
}
