import prisma from '@/lib/db'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.1-8b-instant'

interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GroqResponse {
  id: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface PatientContext {
  firstName: string
  lastName: string
  bloodType: string
  allergies: string[]
  chronicConditions: string[]
  healthScore: number
  recentDiagnoses: string[]
  activeMedications: string[]
}

interface InsightRecord {
  date: Date
  category: string
  summary: string
}

// ─── Patient Context ─────────────────────────────────────────────────────────

async function getPatientContext(userId: string): Promise<PatientContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      patientProfile: {
        select: {
          bloodType: true,
          allergies: true,
          chronicConditions: true,
          healthScore: true,
          medicalRecords: {
            where: {
              date: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
            },
            select: { diagnosis: true },
            orderBy: { date: 'desc' },
            take: 10,
          },
          prescriptions: {
            where: { isActive: true },
            select: {
              medicines: {
                select: {
                  medicine: { select: { name: true } },
                  dosage: true,
                  frequency: true,
                },
              },
            },
            take: 10,
          },
        },
      },
    },
  })

  if (!user || !user.patientProfile) return null

  const profile = user.patientProfile
  const recentDiagnoses = profile.medicalRecords
    .map(r => r.diagnosis)
    .filter((d): d is string => !!d)

  const activeMedications = profile.prescriptions.flatMap(p =>
    p.medicines.map(m => `${m.medicine.name} (${m.dosage}, ${m.frequency})`)
  )

  return {
    firstName: user.firstName,
    lastName: user.lastName,
    bloodType: profile.bloodType,
    allergies: profile.allergies,
    chronicConditions: profile.chronicConditions,
    healthScore: profile.healthScore,
    recentDiagnoses,
    activeMedications,
  }
}

// ─── Dietary Insight Storage & Retrieval ─────────────────────────────────────

/**
 * Retrieve the patient's recent dietary/health insights from the database.
 * Returns a summarized text block to inject into the system prompt.
 * Covers the last 14 days to allow weekly pattern analysis.
 */
export async function getRecentInsights(userId: string, days: number = 14): Promise<string> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const insights = await prisma.aiPatientInsight.findMany({
    where: {
      userId,
      date: { gte: since },
    },
    orderBy: { date: 'desc' },
    select: {
      date: true,
      category: true,
      summary: true,
    },
  })

  if (insights.length === 0) return ''

  // Group by date for readability
  const grouped: Record<string, InsightRecord[]> = {}
  for (const ins of insights) {
    const dateKey = ins.date.toISOString().split('T')[0]
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(ins)
  }

  const lines: string[] = ['PATIENT RECENT HISTORY (last ' + days + ' days):']
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  for (const dateKey of sortedDates) {
    const dayName = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    lines.push(`\n${dayName} (${dateKey}):`)
    for (const ins of grouped[dateKey]) {
      lines.push(`  - [${ins.category}] ${ins.summary}`)
    }
  }

  return lines.join('\n')
}

/**
 * Use the LLM to extract structured dietary/health insights from the user's message.
 * This is the "tool call" — we ask the model to parse the user's natural language
 * into structured records we can store.
 */
export async function extractAndStoreInsights(
  userId: string,
  userMessage: string,
  assistantResponse: string,
  apiKey: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  const extractionPrompt = `You are a data extraction tool. Today is ${dayOfWeek}, ${today}.

Analyze the following conversation exchange and extract any health/dietary/exercise/symptom information the patient mentioned. Output ONLY a valid JSON array (no markdown, no explanation). Each item must have:
- "date": the ISO date (YYYY-MM-DD) the information refers to. If the patient says "today", use "${today}". If they say "yesterday", compute it. If they say a weekday name like "Monday", resolve it to the most recent past occurrence (or today if it matches). If unclear, use "${today}".
- "category": one of "food", "exercise", "symptom", "medication", "sleep", "water", "mood"
- "summary": a concise one-line summary of what was reported (max 150 chars)

If NO health/dietary/exercise information is present (e.g. the user is just asking a general question or greeting), return an empty array: []

USER MESSAGE: ${userMessage}

ASSISTANT RESPONSE: ${assistantResponse}

JSON ARRAY:`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: extractionPrompt }],
        temperature: 0.1,
        max_tokens: 512,
      }),
    })

    if (!response.ok) return

    const data: GroqResponse = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim()
    if (!raw) return

    // Parse the JSON array from the response
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return

    const parsed: { date: string; category: string; summary: string }[] = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed) || parsed.length === 0) return

    const validCategories = ['food', 'exercise', 'symptom', 'medication', 'sleep', 'water', 'mood']

    const insightsToCreate = parsed
      .filter(item =>
        item.date && item.category && item.summary &&
        validCategories.includes(item.category) &&
        item.summary.length <= 300
      )
      .map(item => ({
        userId,
        date: new Date(item.date + 'T12:00:00Z'),
        category: item.category,
        summary: item.summary.substring(0, 300),
      }))

    if (insightsToCreate.length > 0) {
      await prisma.aiPatientInsight.createMany({ data: insightsToCreate })
    }
  } catch {
    // Silent — insight extraction failure should never break the chat
  }
}

// ─── Health Tracker Context ─────────────────────────────────────────────────

/**
 * Get today's health tracker data to inject into the AI coach context.
 */
export async function getTrackerContext(userId: string): Promise<string> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  try {
    const [foodEntries, exerciseEntries, waterEntries, sleepEntry, profile] = await Promise.all([
      prisma.foodEntry.aggregate({
        where: { userId, date: { gte: today, lt: tomorrow } },
        _sum: { calories: true, protein: true, carbs: true, fat: true },
      }),
      prisma.exerciseEntry.aggregate({
        where: { userId, date: { gte: today, lt: tomorrow } },
        _sum: { caloriesBurned: true, durationMin: true },
      }),
      prisma.waterEntry.aggregate({
        where: { userId, date: { gte: today, lt: tomorrow } },
        _sum: { amountMl: true },
      }),
      prisma.sleepEntry.findFirst({
        where: { userId, date: { gte: today, lt: tomorrow } },
        select: { durationMin: true, quality: true },
      }),
      prisma.healthTrackerProfile.findUnique({
        where: { userId },
        select: { targetCalories: true, targetWaterMl: true, targetExerciseMin: true, targetSleepMin: true, weightGoal: true, dietaryPreferences: true },
      }),
    ])

    const caloriesConsumed = foodEntries._sum.calories || 0
    const caloriesBurned = exerciseEntries._sum.caloriesBurned || 0
    const waterMl = waterEntries._sum.amountMl || 0
    const exerciseMin = exerciseEntries._sum.durationMin || 0
    const targetCal = profile?.targetCalories || 2000
    const targetWater = profile?.targetWaterMl || 2000
    const targetExercise = profile?.targetExerciseMin || 30
    const targetSleep = profile?.targetSleepMin || 480
    const sleepMin = sleepEntry?.durationMin || 0
    const sleepQuality = sleepEntry?.quality || 'not logged'
    const sleepHours = Math.floor(sleepMin / 60)
    const sleepMins = sleepMin % 60

    const lines = [
      `\nTODAY'S HEALTH TRACKER DATA:`,
      `- Calories consumed: ${caloriesConsumed} / ${targetCal} cal (${Math.round(caloriesConsumed/targetCal*100)}%)`,
      `- Calories burned: ${caloriesBurned} cal`,
      `- Net calories: ${caloriesConsumed - caloriesBurned} cal`,
      `- Water intake: ${waterMl}ml / ${targetWater}ml (${Math.round(waterMl/targetWater*100)}%)`,
      `- Exercise: ${exerciseMin} / ${targetExercise} min`,
      `- Sleep: ${sleepMin > 0 ? `${sleepHours}h ${sleepMins}m` : 'not logged'} / ${Math.floor(targetSleep/60)}h target (quality: ${sleepQuality})`,
      `- Weight goal: ${profile?.weightGoal || 'maintain'}`,
    ]

    if (profile?.dietaryPreferences && profile.dietaryPreferences.length > 0) {
      lines.push(`- Dietary preferences: ${profile.dietaryPreferences.join(', ')}`)
    }

    return lines.join('\n')
  } catch {
    return '' // Silent failure — tracker data is optional
  }
}

// ─── System Prompt Builder ───────────────────────────────────────────────────

function buildSystemPrompt(context: PatientContext, insightsSummary: string, trackerContext: string = ''): string {
  const conditionDietaryNotes: string[] = []

  for (const condition of context.chronicConditions) {
    const lower = condition.toLowerCase()
    if (lower.includes('diabetes') || lower.includes('diabetic')) {
      conditionDietaryNotes.push(
        'Patient has diabetes: recommend low glycemic index foods, limit added sugars, emphasize fiber-rich vegetables, whole grains, and lean proteins. Monitor carbohydrate intake.'
      )
    }
    if (lower.includes('hypertension') || lower.includes('high blood pressure')) {
      conditionDietaryNotes.push(
        'Patient has hypertension: recommend DASH diet principles, limit sodium to under 2300mg/day, increase potassium-rich foods (bananas, sweet potatoes, spinach), limit alcohol and caffeine.'
      )
    }
    if (lower.includes('cholesterol') || lower.includes('hyperlipidemia')) {
      conditionDietaryNotes.push(
        'Patient has high cholesterol: recommend heart-healthy fats (olive oil, nuts, fish), limit saturated fats and trans fats, increase soluble fiber intake (oats, beans, lentils).'
      )
    }
    if (lower.includes('asthma')) {
      conditionDietaryNotes.push(
        'Patient has asthma: recommend anti-inflammatory foods rich in omega-3 fatty acids, fruits and vegetables high in antioxidants. Avoid sulfites found in some preserved foods.'
      )
    }
    if (lower.includes('anemia')) {
      conditionDietaryNotes.push(
        'Patient has anemia: recommend iron-rich foods (red meat, spinach, lentils), pair with vitamin C for absorption, avoid tea/coffee with meals.'
      )
    }
    if (lower.includes('kidney') || lower.includes('renal')) {
      conditionDietaryNotes.push(
        'Patient has kidney concerns: may need to limit potassium, phosphorus, and sodium. Monitor protein intake. Recommend consulting a renal dietitian.'
      )
    }
    if (lower.includes('obesity') || lower.includes('overweight')) {
      conditionDietaryNotes.push(
        'Patient is managing weight: recommend portion control, calorie-aware eating, emphasis on whole foods, regular physical activity, and gradual sustainable changes.'
      )
    }
  }

  const allergyNote = context.allergies.length > 0
    ? `CRITICAL - Patient allergies: ${context.allergies.join(', ')}. NEVER recommend foods or supplements containing these allergens.`
    : 'No known food allergies.'

  const medicationNote = context.activeMedications.length > 0
    ? `Active medications: ${context.activeMedications.join('; ')}. Be aware of potential food-drug interactions.`
    : 'No active medications recorded.'

  const diagnosisNote = context.recentDiagnoses.length > 0
    ? `Recent diagnoses (past year): ${context.recentDiagnoses.join(', ')}.`
    : ''

  return `You are a helpful, knowledgeable AI Health Assistant for the MediWyz digital health platform in Mauritius. Your name is MediWyz AI Assistant.
Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

PATIENT PROFILE:
- Name: ${context.firstName} ${context.lastName}
- Blood Type: ${context.bloodType}
- Health Score: ${context.healthScore}/100
- ${allergyNote}
- Chronic Conditions: ${context.chronicConditions.length > 0 ? context.chronicConditions.join(', ') : 'None recorded'}
- ${medicationNote}
${diagnosisNote ? `- ${diagnosisNote}` : ''}

${conditionDietaryNotes.length > 0 ? 'CONDITION-SPECIFIC DIETARY GUIDANCE:\n' + conditionDietaryNotes.join('\n') : ''}

${insightsSummary}
${trackerContext}

YOUR ROLE AND GUIDELINES:
1. Provide personalized wellness, diet, nutrition, and exercise recommendations based on the patient's health profile and recent history above.
2. Consider the patient's allergies, chronic conditions, and medications when making any food or supplement suggestions.
3. Tailor recommendations to Mauritian cuisine and locally available foods when relevant.
4. Always be supportive, encouraging, and non-judgmental.
5. Use clear, simple language that is easy to understand.
6. When discussing nutrition, provide specific food suggestions with approximate nutritional information when possible.
7. For exercise recommendations, consider the patient's health conditions and suggest safe, appropriate activities.
8. ACTIVELY TRACK the patient's dietary patterns from their recent history. If you notice gaps (e.g. low fruit intake, insufficient water, missing food groups), proactively suggest improvements. Reference specific days from their history when giving advice.
9. When the patient tells you what they ate or did, acknowledge it and note how it fits into their overall nutritional balance for the day/week.
10. Factor SLEEP quality and duration into your wellness recommendations. Poor or insufficient sleep affects metabolism, appetite hormones, recovery, and overall health. If sleep data shows issues, suggest sleep hygiene improvements.

IMPORTANT SAFETY RULES:
- ALWAYS remind the patient to consult their doctor or healthcare provider before making significant changes to their diet, exercise routine, or medication.
- NEVER provide specific medical diagnoses or suggest changing, stopping, or starting medications.
- NEVER claim to replace professional medical advice.
- If the patient describes symptoms that could be serious or urgent, strongly advise them to contact their healthcare provider or emergency services immediately.
- You are a wellness and nutrition assistant, NOT a substitute for medical care.

Keep responses concise but thorough. Use markdown formatting for lists and emphasis when helpful.`
}

// ─── Main Chat Function ──────────────────────────────────────────────────────

/**
 * Send a message to the AI assistant and get a response.
 * Flow: fetch insights → build context → call LLM → save messages → extract & store new insights
 */
export async function chatWithAssistant(
  userId: string,
  message: string,
  sessionId?: string
): Promise<{
  response: string
  sessionId: string
  title: string
}> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set')
  }

  // Get patient context for personalized responses (null for non-patient users)
  const patientContext = await getPatientContext(userId)

  // Get user basic info as fallback for non-patients
  const userInfo = patientContext ? null : await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, userType: true },
  })

  // Tool call #1: Retrieve recent dietary/health insights from DB
  const insightsSummary = patientContext ? await getRecentInsights(userId, 14) : ''

  // Get today's health tracker data for personalized context
  const trackerContext = patientContext ? await getTrackerContext(userId) : ''

  // Create or retrieve session
  let session: { id: string; title: string }
  if (sessionId) {
    const existing = await prisma.aiChatSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true, title: true },
    })
    if (!existing) {
      throw new Error('Chat session not found')
    }
    session = existing
  } else {
    session = await prisma.aiChatSession.create({
      data: { userId, title: 'New Chat' },
      select: { id: true, title: true },
    })
  }

  // Fetch previous messages for context (last 20)
  const previousMessages = await prisma.aiChatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
    select: { role: true, content: true },
  })

  // Build the message array with patient context + dietary history
  const systemPrompt = patientContext
    ? buildSystemPrompt(patientContext, insightsSummary, trackerContext)
    : `You are MediWyz AI Health Assistant. You are speaking with ${userInfo?.firstName || 'a healthcare professional'} (${userInfo?.userType || 'user'}). Provide helpful, professional health information. Always recommend consulting a qualified healthcare provider for medical decisions. Keep responses concise and use markdown formatting.`
  const groqMessages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    ...previousMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  // Call Groq API for the main response
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 0.9,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Groq API error:', response.status, errorBody)
    throw new Error(`AI service error (${response.status}): ${response.statusText}`)
  }

  const data: GroqResponse = await response.json()
  const assistantMessage = data.choices?.[0]?.message?.content

  if (!assistantMessage) {
    throw new Error('No response from AI service')
  }

  // Save both messages to the database
  await prisma.aiChatMessage.createMany({
    data: [
      { sessionId: session.id, role: 'user', content: message },
      { sessionId: session.id, role: 'assistant', content: assistantMessage },
    ],
  })

  // Tool call #2: Extract and store dietary/health insights from this exchange
  // This runs async — we don't block the response on it
  extractAndStoreInsights(userId, message, assistantMessage, apiKey).catch(() => {
    // Silent failure — extraction is best-effort
  })

  // Auto-generate session title from the first user message
  let title = session.title
  if (session.title === 'New Chat' && previousMessages.length === 0) {
    title = message.length > 50 ? message.substring(0, 50) + '...' : message
    await prisma.aiChatSession.update({
      where: { id: session.id },
      data: { title },
    })
  }

  // Update session timestamp
  await prisma.aiChatSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() },
  })

  return {
    response: assistantMessage,
    sessionId: session.id,
    title,
  }
}

// ─── Session Management ──────────────────────────────────────────────────────

export async function listChatSessions(userId: string) {
  return prisma.aiChatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  })
}

export async function getSessionMessages(userId: string, sessionId: string) {
  const session = await prisma.aiChatSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      id: true,
      title: true,
      createdAt: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  })

  if (!session) return null
  return session
}

export async function deleteChatSession(userId: string, sessionId: string) {
  const session = await prisma.aiChatSession.findFirst({
    where: { id: sessionId, userId },
  })

  if (!session) return false

  await prisma.aiChatSession.delete({
    where: { id: session.id },
  })

  return true
}

/**
 * Get insight history for a patient (used by the insights API endpoint).
 */
export async function getPatientInsights(userId: string, days: number = 14) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  return prisma.aiPatientInsight.findMany({
    where: {
      userId,
      date: { gte: since },
    },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      date: true,
      category: true,
      summary: true,
      createdAt: true,
    },
  })
}
