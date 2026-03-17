import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

/**
 * POST /api/ai/generate-features
 * Uses LLM to generate professional feature text for a subscription plan
 * based on its configured quotas, discounts, and services.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { planName, planType, price, currency, quotas, discounts, services, targetAudience } = body as {
      planName: string
      planType: string
      price: number
      currency: string
      quotas: Record<string, number>
      discounts: Record<string, number>
      services: string[]
      targetAudience?: string
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'AI service not configured' }, { status: 503 })
    }

    // Build context for the LLM
    const quotaLines = Object.entries(quotas || {})
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `${k}: ${v === -1 ? 'unlimited' : v} per month`)
      .join(', ')

    const discountLines = Object.entries(discounts || {})
      .filter(([k, v]) => v > 0 && !k.startsWith('volume_'))
      .map(([k, v]) => `${v}% ${k} discount`)
      .join(', ')

    const volumeLines = Object.entries(discounts || {})
      .filter(([k, v]) => k.startsWith('volume_') && v > 0)
      .map(([k, v]) => `${k.replace('volume_', '')}+ employees: ${v}% off`)
      .join(', ')

    const serviceList = (services || []).join(', ')

    const prompt = `Generate a concise list of subscription plan features for a digital health platform called MediWyz.

Plan: "${planName}" (${planType})
Price: ${currency} ${price}${planType === 'corporate' ? '/employee/month' : '/month'}
${targetAudience ? `Target: ${targetAudience}` : ''}
${quotaLines ? `Included consultations: ${quotaLines}` : ''}
${discountLines ? `Discounts: ${discountLines}` : ''}
${volumeLines ? `Volume discounts: ${volumeLines}` : ''}
${serviceList ? `Services included: ${serviceList}` : ''}

Rules:
- Return ONLY a JSON array of strings, each string is one feature line
- Keep each feature short (under 60 characters)
- Start with the most valuable features
- Use clear, customer-facing language (not technical)
- Include consultation quotas, discounts, and key benefits
- For corporate plans, mention employee-specific benefits
- 8-12 features maximum
- Do NOT include the price in the features
- Example format: ["2 GP consultations/month", "20% specialist discount", "Priority booking"]`

    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ success: false, message: 'AI service error' }, { status: 502 })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content?.trim() || '[]'

    // Extract JSON array from response (handle markdown code blocks)
    let features: string[] = []
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        features = JSON.parse(jsonMatch[0])
      }
    } catch {
      // If parsing fails, split by newlines and clean up
      features = content
        .split('\n')
        .map((line: string) => line.replace(/^[-*•]\s*/, '').replace(/^"\s*/, '').replace(/"\s*,?\s*$/, '').trim())
        .filter((line: string) => line.length > 0 && line.length < 100)
    }

    return NextResponse.json({ success: true, data: features })
  } catch (error) {
    console.error('POST /api/ai/generate-features error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
