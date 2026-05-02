import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthTrackerService {
  private readonly logger = new Logger(HealthTrackerService.name);
  constructor(private prisma: PrismaService) {}

  // ── Profile ──────────────────────────────────────────────────────────────────

  async getOrCreateProfile(userId: string) {
    let profile = await this.prisma.healthTrackerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.healthTrackerProfile.create({
        data: {
          userId,
          targetCalories: 2000,
          weightKg: 70,
          heightCm: 170,
          age: 30,
          gender: 'male',
          activityLevel: 'moderately_active',
          weightGoal: 'maintain',
          targetWaterMl: 2000,
          targetExerciseMin: 30,
          targetSleepMin: 480,
        },
      });
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    body: {
      heightCm?: number; weightKg?: number; age?: number; gender?: string;
      activityLevel?: string; weightGoal?: string; targetCalories?: number;
      targetWaterMl?: number; targetExerciseMin?: number; targetSleepMin?: number;
      dietaryPreferences?: string[]; allergenSettings?: string[];
    },
  ) {
    // Ensure profile exists
    let profile = await this.prisma.healthTrackerProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await this.prisma.healthTrackerProfile.create({
        data: { userId, targetCalories: 2000, weightKg: 70, heightCm: 170, age: 30, gender: 'male' },
      });
    }

    // Calculate TDEE if we have enough data
    const weight = body.weightKg ?? profile.weightKg;
    const height = body.heightCm ?? profile.heightCm;
    const age = body.age ?? profile.age;
    const gender = body.gender ?? profile.gender;
    const activity = body.activityLevel ?? profile.activityLevel;

    let tdeeCalories: number | undefined;
    if (weight && height && age && gender) {
      // Mifflin-St Jeor: 10*weight + 6.25*height - 5*age + (male ? 5 : -161)
      const bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161);
      const multipliers: Record<string, number> = {
        sedentary: 1.2,
        lightly_active: 1.375,
        moderately_active: 1.55,
        very_active: 1.725,
        extra_active: 1.9,
      };
      const multiplier = multipliers[activity || 'moderately_active'] || 1.55;
      tdeeCalories = Math.round(bmr * multiplier);
    }

    const updateData: any = {};
    if (body.heightCm != null) updateData.heightCm = body.heightCm;
    if (body.weightKg != null) updateData.weightKg = body.weightKg;
    if (body.age != null) updateData.age = body.age;
    if (body.gender != null) updateData.gender = body.gender;
    if (body.activityLevel != null) updateData.activityLevel = body.activityLevel;
    if (body.weightGoal != null) updateData.weightGoal = body.weightGoal;
    if (body.targetCalories != null) updateData.targetCalories = body.targetCalories;
    if (body.targetWaterMl != null) updateData.targetWaterMl = body.targetWaterMl;
    if (body.targetExerciseMin != null) updateData.targetExerciseMin = body.targetExerciseMin;
    if (body.targetSleepMin != null) updateData.targetSleepMin = body.targetSleepMin;
    if (body.dietaryPreferences) updateData.dietaryPreferences = body.dietaryPreferences;
    if (body.allergenSettings) updateData.allergenSettings = body.allergenSettings;
    if (tdeeCalories != null) updateData.tdeeCalories = tdeeCalories;

    return this.prisma.healthTrackerProfile.update({
      where: { userId },
      data: updateData,
    });
  }

  // ── Food entries ─────────────────────────────────────────────────────────────

  async createFoodEntry(
    userId: string,
    body: {
      name: string; mealType: string; calories: number;
      protein?: number; carbs?: number; fat?: number; fiber?: number;
      date?: string; quantity?: number; unit?: string;
    },
  ) {
    const entryDate = body.date ? new Date(body.date) : new Date();
    return this.prisma.foodEntry.create({
      data: {
        userId,
        date: entryDate,
        time: new Date(),
        mealType: body.mealType as any,
        name: body.name,
        calories: body.calories,
        protein: body.protein || 0,
        carbs: body.carbs || 0,
        fat: body.fat || 0,
        fiber: body.fiber || 0,
        quantity: body.quantity || 1,
        unit: body.unit || 'serving',
      },
    });
  }

  async getFoodEntries(userId: string, dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(date.toISOString().split('T')[0] + 'T00:00:00Z');
    const endOfDay = new Date(date.toISOString().split('T')[0] + 'T23:59:59Z');

    const entries = await this.prisma.foodEntry.findMany({
      where: { userId, date: { gte: startOfDay, lte: endOfDay } },
      orderBy: { time: 'asc' },
    });

    // Group by mealType
    const grouped: Record<string, typeof entries> = {};
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalFiber = 0;
    for (const e of entries) {
      const key = e.mealType;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
      totalCalories += e.calories;
      totalProtein += e.protein;
      totalCarbs += e.carbs;
      totalFat += e.fat;
      totalFiber += e.fiber;
    }

    return {
      entries,
      grouped,
      totalCalories, totalProtein, totalCarbs, totalFat, totalFiber,
      totals: { calories: totalCalories, protein: totalProtein, carbs: totalCarbs, fat: totalFat, fiber: totalFiber },
    };
  }

  async deleteFoodEntry(id: string, userId: string) {
    const entry = await this.prisma.foodEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== userId) return null;
    await this.prisma.foodEntry.delete({ where: { id } });
    return true;
  }

  // ── Exercise entries ─────────────────────────────────────────────────────────

  async createExerciseEntry(
    userId: string,
    body: {
      exerciseType: string; durationMin: number; caloriesBurned: number;
      intensity?: string; notes?: string; date?: string;
    },
  ) {
    const entryDate = body.date ? new Date(body.date) : new Date();
    return this.prisma.exerciseEntry.create({
      data: {
        userId,
        date: entryDate,
        exerciseType: body.exerciseType,
        durationMin: body.durationMin,
        caloriesBurned: body.caloriesBurned,
        intensity: (body.intensity as any) || 'moderate',
        notes: body.notes || null,
      },
    });
  }

  async getExerciseEntries(userId: string, dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(date.toISOString().split('T')[0] + 'T00:00:00Z');
    const endOfDay = new Date(date.toISOString().split('T')[0] + 'T23:59:59Z');

    const entries = await this.prisma.exerciseEntry.findMany({
      where: { userId, date: { gte: startOfDay, lte: endOfDay } },
      orderBy: { createdAt: 'asc' },
    });

    let totalDuration = 0, totalCalories = 0;
    for (const e of entries) {
      totalDuration += e.durationMin;
      totalCalories += e.caloriesBurned;
    }

    return {
      entries,
      totalMinutes: totalDuration,
      totalCaloriesBurned: totalCalories,
      totals: { durationMin: totalDuration, caloriesBurned: totalCalories },
    };
  }

  async deleteExerciseEntry(id: string, userId: string) {
    const entry = await this.prisma.exerciseEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== userId) return null;
    await this.prisma.exerciseEntry.delete({ where: { id } });
    return true;
  }

  // ── Water entries ────────────────────────────────────────────────────────────

  async createWaterEntry(userId: string, body: { amountMl: number; date?: string }) {
    const entryDate = body.date ? new Date(body.date) : new Date();
    return this.prisma.waterEntry.create({
      data: { userId, date: entryDate, amountMl: body.amountMl },
    });
  }

  async getWaterEntries(userId: string, dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(date.toISOString().split('T')[0] + 'T00:00:00Z');
    const endOfDay = new Date(date.toISOString().split('T')[0] + 'T23:59:59Z');

    const entries = await this.prisma.waterEntry.findMany({
      where: { userId, date: { gte: startOfDay, lte: endOfDay } },
      orderBy: { createdAt: 'asc' },
    });

    const totalMl = entries.reduce((sum, e) => sum + e.amountMl, 0);

    return { entries, totalMl };
  }

  // ── Sleep entries ────────────────────────────────────────────────────────────

  async upsertSleepEntry(
    userId: string,
    body: {
      durationMin: number; quality?: string;
      sleepStart?: string; sleepEnd?: string; date?: string; notes?: string;
    },
  ) {
    const entryDate = body.date ? new Date(body.date) : new Date();
    const dateOnly = new Date(entryDate.toISOString().split('T')[0] + 'T00:00:00Z');

    return this.prisma.sleepEntry.upsert({
      where: { userId_date: { userId, date: dateOnly } },
      update: {
        durationMin: body.durationMin,
        quality: (body.quality as any) || 'fair',
        sleepStart: body.sleepStart ? new Date(body.sleepStart) : undefined,
        sleepEnd: body.sleepEnd ? new Date(body.sleepEnd) : undefined,
        notes: body.notes,
      },
      create: {
        userId,
        date: dateOnly,
        durationMin: body.durationMin,
        quality: (body.quality as any) || 'fair',
        sleepStart: body.sleepStart ? new Date(body.sleepStart) : null,
        sleepEnd: body.sleepEnd ? new Date(body.sleepEnd) : null,
        notes: body.notes || null,
      },
    });
  }

  async getSleepEntry(userId: string, dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(date.toISOString().split('T')[0] + 'T00:00:00Z');
    const endOfDay = new Date(date.toISOString().split('T')[0] + 'T23:59:59Z');

    const entry = await this.prisma.sleepEntry.findFirst({
      where: { userId, date: { gte: startOfDay, lte: endOfDay } },
    });

    const profile = await this.prisma.healthTrackerProfile.findUnique({
      where: { userId },
      select: { targetSleepMin: true },
    });

    return { entry, targetSleepMin: profile?.targetSleepMin || 480 };
  }

  async deleteSleepEntry(id: string, userId: string) {
    const entry = await this.prisma.sleepEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== userId) return null;
    await this.prisma.sleepEntry.delete({ where: { id } });
    return true;
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────

  async getDashboard(userId: string, dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(date.toISOString().split('T')[0] + 'T00:00:00Z');
    const endOfDay = new Date(date.toISOString().split('T')[0] + 'T23:59:59Z');
    const dateFilter = { gte: startOfDay, lte: endOfDay };

    const [foodEntries, exerciseEntries, waterEntries, sleepEntry, profile] = await Promise.all([
      this.prisma.foodEntry.findMany({ where: { userId, date: dateFilter } }),
      this.prisma.exerciseEntry.findMany({ where: { userId, date: dateFilter } }),
      this.prisma.waterEntry.findMany({ where: { userId, date: dateFilter } }),
      this.prisma.sleepEntry.findFirst({ where: { userId, date: dateFilter } }),
      this.prisma.healthTrackerProfile.findUnique({ where: { userId } }),
    ]);

    const foodTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    for (const f of foodEntries) {
      foodTotals.calories += f.calories;
      foodTotals.protein += f.protein;
      foodTotals.carbs += f.carbs;
      foodTotals.fat += f.fat;
      foodTotals.fiber += f.fiber;
    }

    const exerciseTotals = { durationMin: 0, caloriesBurned: 0 };
    for (const e of exerciseEntries) {
      exerciseTotals.durationMin += e.durationMin;
      exerciseTotals.caloriesBurned += e.caloriesBurned;
    }

    const waterTotalMl = waterEntries.reduce((sum, w) => sum + w.amountMl, 0);

    return {
      date: startOfDay.toISOString().split('T')[0],
      caloriesConsumed: foodTotals.calories,
      caloriesBurned: exerciseTotals.caloriesBurned,
      caloriesRemaining: Math.max(0, (profile?.targetCalories || 2000) - foodTotals.calories + exerciseTotals.caloriesBurned),
      waterConsumedMl: waterTotalMl,
      exerciseMinutes: exerciseTotals.durationMin,
      sleepDurationMin: sleepEntry?.durationMin || 0,
      sleepQuality: sleepEntry?.quality || null,
      food: foodTotals,
      exercise: exerciseTotals,
      water: { totalMl: waterTotalMl },
      sleep: sleepEntry ? { durationMin: sleepEntry.durationMin, quality: sleepEntry.quality } : null,
      targets: profile ? {
        calories: profile.targetCalories || profile.tdeeCalories || 2000,
        waterMl: profile.targetWaterMl,
        exerciseMin: profile.targetExerciseMin,
        sleepMin: profile.targetSleepMin,
      } : { calories: 2000, waterMl: 2000, exerciseMin: 30, sleepMin: 480 },
    };
  }

  // ── Meal plan ────────────────────────────────────────────────────────────────

  async getMealPlan(userId: string, weekStart?: string) {
    const startDate = weekStart ? new Date(weekStart) : new Date();
    const profile = await this.prisma.healthTrackerProfile.findUnique({
      where: { userId },
      select: { targetCalories: true, dietaryPreferences: true },
    });
    return { weekStart: startDate.toISOString().split('T')[0], days: [], targetCalories: profile?.targetCalories || 2000 };
  }

  async generateMealPlan(userId: string, body: { weekStart?: string; preferences?: string[] }) {
    const profile = await this.prisma.healthTrackerProfile.findUnique({ where: { userId } });
    const targetCal = profile?.targetCalories || 2000;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const mealPlan = days.map(day => ({
      day,
      meals: {
        breakfast: { name: 'Oatmeal with berries', calories: Math.round(targetCal * 0.25), protein: 12, carbs: 45, fat: 8 },
        lunch: { name: 'Grilled chicken salad', calories: Math.round(targetCal * 0.35), protein: 35, carbs: 25, fat: 15 },
        dinner: { name: 'Salmon with vegetables', calories: Math.round(targetCal * 0.30), protein: 30, carbs: 20, fat: 12 },
        snack: { name: 'Greek yogurt with nuts', calories: Math.round(targetCal * 0.10), protein: 15, carbs: 10, fat: 8 },
      },
      totalCalories: targetCal,
    }));

    return { weekStart: body.weekStart || new Date().toISOString().split('T')[0], days: mealPlan, targetCalories: targetCal };
  }

  async addMealPlanToDiary(
    userId: string,
    body: { name: string; mealType: string; calories: number; protein?: number; carbs?: number; fat?: number; date?: string },
  ) {
    const entryDate = body.date ? new Date(body.date) : new Date();
    return this.prisma.foodEntry.create({
      data: {
        userId, date: entryDate, time: new Date(),
        mealType: body.mealType as any, name: body.name,
        calories: body.calories, protein: body.protein || 0,
        carbs: body.carbs || 0, fat: body.fat || 0, fiber: 0,
        quantity: 1, unit: 'serving',
      },
    });
  }

  // ── Progress ─────────────────────────────────────────────────────────────────

  async getProgress(userId: string, period?: string) {
    const now = new Date();
    let startDate: Date;
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // week
    }

    const [foodEntries, exerciseEntries, waterEntries, sleepEntries] = await Promise.all([
      this.prisma.foodEntry.findMany({ where: { userId, date: { gte: startDate } }, orderBy: { date: 'asc' } }),
      this.prisma.exerciseEntry.findMany({ where: { userId, date: { gte: startDate } }, orderBy: { date: 'asc' } }),
      this.prisma.waterEntry.findMany({ where: { userId, date: { gte: startDate } }, orderBy: { date: 'asc' } }),
      this.prisma.sleepEntry.findMany({ where: { userId, date: { gte: startDate } }, orderBy: { date: 'asc' } }),
    ]);

    // Aggregate by date
    const dailyData: Record<string, { calories: number; exercise: number; water: number; sleep: number }> = {};
    for (const f of foodEntries) {
      const key = f.date.toISOString().split('T')[0];
      if (!dailyData[key]) dailyData[key] = { calories: 0, exercise: 0, water: 0, sleep: 0 };
      dailyData[key].calories += f.calories;
    }
    for (const e of exerciseEntries) {
      const key = e.date.toISOString().split('T')[0];
      if (!dailyData[key]) dailyData[key] = { calories: 0, exercise: 0, water: 0, sleep: 0 };
      dailyData[key].exercise += e.durationMin;
    }
    for (const w of waterEntries) {
      const key = w.date.toISOString().split('T')[0];
      if (!dailyData[key]) dailyData[key] = { calories: 0, exercise: 0, water: 0, sleep: 0 };
      dailyData[key].water += w.amountMl;
    }
    for (const s of sleepEntries) {
      const key = s.date.toISOString().split('T')[0];
      if (!dailyData[key]) dailyData[key] = { calories: 0, exercise: 0, water: 0, sleep: 0 };
      dailyData[key].sleep = s.durationMin;
    }

    const dataPoints = Object.entries(dailyData).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date));

    // Aggregated calorie-burn per day for the frontend Progress tab
    const burnedByDate: Record<string, number> = {};
    for (const e of exerciseEntries) {
      const key = e.date.toISOString().split('T')[0];
      burnedByDate[key] = (burnedByDate[key] || 0) + (e.caloriesBurned || 0);
    }

    // `days` + `averages` + `totals` shape expected by ProgressTab.tsx
    const days = dataPoints.map(p => ({
      date: p.date,
      caloriesConsumed: p.calories,
      caloriesBurned: burnedByDate[p.date] || 0,
      waterMl: p.water,
      exerciseMinutes: p.exercise,
    }));
    const sum = (arr: number[]) => arr.reduce((s, n) => s + n, 0);
    const avg = (arr: number[]) => arr.length ? Math.round(sum(arr) / arr.length) : 0;
    const averages = {
      calories: avg(days.map(d => d.caloriesConsumed)),
      burned: avg(days.map(d => d.caloriesBurned)),
      water: avg(days.map(d => d.waterMl)),
      exercise: avg(days.map(d => d.exerciseMinutes)),
    };
    const totals = {
      calories: sum(days.map(d => d.caloriesConsumed)),
      burned: sum(days.map(d => d.caloriesBurned)),
      water: sum(days.map(d => d.waterMl)),
      exercise: sum(days.map(d => d.exerciseMinutes)),
    };

    return {
      period: period || 'week',
      startDate: startDate.toISOString().split('T')[0],
      dataPoints,  // legacy shape
      days,        // new shape for ProgressTab
      averages,
      totals,
    };
  }

  // ── Food database (mock) ─────────────────────────────────────────────────────

  searchFoodDatabase(q?: string, category?: string, limit?: string) {
    const take = Math.min(parseInt(limit || '20'), 50);
    const foods = [
      { name: 'Chicken Breast (grilled)', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, category: 'protein' },
      { name: 'Rice (white, cooked)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, category: 'grain' },
      { name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, category: 'fruit' },
      { name: 'Egg (boiled)', calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, category: 'protein' },
      { name: 'Broccoli (steamed)', calories: 55, protein: 3.7, carbs: 11, fat: 0.6, fiber: 5.1, category: 'vegetable' },
      { name: 'Salmon (baked)', calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, category: 'protein' },
      { name: 'Sweet Potato (baked)', calories: 103, protein: 2.3, carbs: 24, fat: 0.1, fiber: 3.8, category: 'vegetable' },
      { name: 'Oatmeal (cooked)', calories: 71, protein: 2.5, carbs: 12, fat: 1.5, fiber: 2, category: 'grain' },
      { name: 'Greek Yogurt (plain)', calories: 59, protein: 10, carbs: 3.6, fat: 0.7, fiber: 0, category: 'dairy' },
      { name: 'Almonds (raw)', calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, category: 'nuts' },
      { name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, category: 'fruit' },
      { name: 'Lentils (cooked)', calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, category: 'legume' },
      { name: 'Avocado', calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, category: 'fruit' },
      { name: 'Brown Rice (cooked)', calories: 123, protein: 2.7, carbs: 26, fat: 1, fiber: 1.8, category: 'grain' },
      { name: 'Spinach (raw)', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, category: 'vegetable' },
    ];

    let filtered = foods;
    if (q) filtered = filtered.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
    if (category) filtered = filtered.filter(f => f.category === category);

    return filtered.slice(0, take);
  }

  // ── Food scan (Groq vision — base64 image → dish names + macros) ─────
  //
  // Accepts EITHER a raw base64 image (`imageBase64`) OR a URL
  // (`imageUrl`) so the caller can choose the cheapest path. Returns a
  // short list of detected dishes with estimated macros + confidence.
  // Same defensive fallback as the receipt OCR service: if Groq fails,
  // we return an empty list rather than crashing the diary UI.

  async scanFood(input: { imageBase64?: string; imageUrl?: string }) {
    if (!input?.imageBase64 && !input?.imageUrl) {
      return {
        foods: [],
        confidence: 'low' as const,
        message: 'No image provided.',
      };
    }

    const apiKey = process.env.GROQ_API_KEY;
    const visionModel = process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview';
    if (!apiKey) {
      return {
        foods: [],
        confidence: 'low' as const,
        message: 'AI is not configured on this server — add the item manually.',
      };
    }

    const imageUrl = input.imageUrl
      ?? `data:image/jpeg;base64,${input.imageBase64!.replace(/^data:image\/[a-z]+;base64,/i, '')}`;

    const prompt = `You are a nutrition expert identifying foods in a photo. Return ONLY a JSON object of shape:
{ "foods": [ { "name": string, "category": "fruit"|"vegetable"|"grain"|"protein"|"dairy"|"nuts"|"legume"|"beverage"|"snack"|"other",
              "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number,
              "servingSize": string, "confidence": "low"|"medium"|"high" } ],
  "overallConfidence": "low"|"medium"|"high",
  "message": string }
Rules:
- Per-item macros are PER SERVING shown in the photo (not per 100g).
- 1-5 items max. Identify only what you can actually see — don't guess.
- If the image is NOT food or is blurry, return empty foods[] + confidence "low".
- Numbers only for macros, integers or 1 decimal place.`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: visionModel,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          }],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });
      if (!res.ok) {
        this.logger.warn(`food-scan Groq ${res.status}: ${await res.text().catch(() => '')}`);
        return { foods: [], confidence: 'low' as const, message: 'Vision service unavailable — add the item manually.' };
      }
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content ?? '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Non-JSON response from vision model');
      const parsed = JSON.parse(match[0]);
      const foods = Array.isArray(parsed.foods) ? parsed.foods.slice(0, 5).map((f: any) => ({
        name: String(f?.name ?? '').slice(0, 80),
        category: typeof f?.category === 'string' ? f.category : 'other',
        calories: Math.max(0, Math.round(Number(f?.calories ?? 0))),
        protein: Math.max(0, Number(f?.protein ?? 0)),
        carbs: Math.max(0, Number(f?.carbs ?? 0)),
        fat: Math.max(0, Number(f?.fat ?? 0)),
        fiber: Math.max(0, Number(f?.fiber ?? 0)),
        servingSize: typeof f?.servingSize === 'string' ? f.servingSize.slice(0, 40) : '1 serving',
        confidence: ['high', 'medium', 'low'].includes(f?.confidence) ? f.confidence : 'low',
      })).filter((f: any) => f.name && f.calories >= 0) : [];
      return {
        foods,
        confidence: ['high', 'medium', 'low'].includes(parsed?.overallConfidence) ? parsed.overallConfidence : 'low',
        message: typeof parsed?.message === 'string' ? parsed.message.slice(0, 200) : 'Review and adjust before adding.',
      };
    } catch (e) {
      this.logger.warn(`food-scan parse failed: ${(e as Error).message}`);
      return { foods: [], confidence: 'low' as const, message: 'Could not read that image — add the item manually.' };
    }
  }
}
