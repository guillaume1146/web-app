import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthTrackerService } from './health-tracker.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('Health Tracker')
@Controller('ai/health-tracker')
export class HealthTrackerController {
  constructor(private healthTrackerService: HealthTrackerService) {}

  // ── GET /ai/health-tracker/profile — get or auto-create profile ───────────
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload) {
    try {
      const profile = await this.healthTrackerService.getOrCreateProfile(user.sub);
      return { success: true, data: profile };
    } catch (error) {
      console.error('GET /ai/health-tracker/profile error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── PUT /ai/health-tracker/profile — update profile + recalculate TDEE ────
  @Put('profile')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() body: {
      heightCm?: number; weightKg?: number; age?: number; gender?: string;
      activityLevel?: string; weightGoal?: string; targetCalories?: number;
      targetWaterMl?: number; targetExerciseMin?: number; targetSleepMin?: number;
      dietaryPreferences?: string[]; allergenSettings?: string[];
    },
  ) {
    try {
      const updated = await this.healthTrackerService.updateProfile(user.sub, body);
      return { success: true, data: updated };
    } catch (error) {
      console.error('PUT /ai/health-tracker/profile error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── POST /ai/health-tracker/food — create food entry ──────────────────────
  @Post('food')
  async createFoodEntry(
    @CurrentUser() user: JwtPayload,
    @Body() body: {
      name: string; mealType: string; calories: number;
      protein?: number; carbs?: number; fat?: number; fiber?: number;
      date?: string; quantity?: number; unit?: string;
    },
  ) {
    try {
      if (!body.name || !body.mealType || body.calories == null) {
        return { success: false, message: 'name, mealType, and calories are required' };
      }
      const entry = await this.healthTrackerService.createFoodEntry(user.sub, body);
      return { success: true, data: entry };
    } catch (error) {
      console.error('POST /ai/health-tracker/food error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /ai/health-tracker/food — food entries for date ───────────────────
  @Get('food')
  async getFoodEntries(@CurrentUser() user: JwtPayload, @Query('date') dateStr?: string) {
    try {
      const data = await this.healthTrackerService.getFoodEntries(user.sub, dateStr);
      return { success: true, data };
    } catch (error) {
      console.error('GET /ai/health-tracker/food error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── POST /ai/health-tracker/exercise — create exercise entry ──────────────
  @Post('exercise')
  async createExerciseEntry(
    @CurrentUser() user: JwtPayload,
    @Body() body: {
      exerciseType: string; durationMin: number; caloriesBurned: number;
      intensity?: string; notes?: string; date?: string;
    },
  ) {
    try {
      if (!body.exerciseType || body.durationMin == null || body.caloriesBurned == null) {
        return { success: false, message: 'exerciseType, durationMin, and caloriesBurned are required' };
      }
      const entry = await this.healthTrackerService.createExerciseEntry(user.sub, body);
      return { success: true, data: entry };
    } catch (error) {
      console.error('POST /ai/health-tracker/exercise error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /ai/health-tracker/exercise — exercise entries for date ───────────
  @Get('exercise')
  async getExerciseEntries(@CurrentUser() user: JwtPayload, @Query('date') dateStr?: string) {
    try {
      const data = await this.healthTrackerService.getExerciseEntries(user.sub, dateStr);
      return { success: true, data };
    } catch (error) {
      console.error('GET /ai/health-tracker/exercise error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── POST /ai/health-tracker/water — create water entry ────────────────────
  @Post('water')
  async createWaterEntry(
    @CurrentUser() user: JwtPayload,
    @Body() body: { amountMl: number; date?: string },
  ) {
    try {
      if (body.amountMl == null) {
        return { success: false, message: 'amountMl is required' };
      }
      const entry = await this.healthTrackerService.createWaterEntry(user.sub, body);
      return { success: true, data: entry };
    } catch (error) {
      console.error('POST /ai/health-tracker/water error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /ai/health-tracker/water — water entries for date ─────────────────
  @Get('water')
  async getWaterEntries(@CurrentUser() user: JwtPayload, @Query('date') dateStr?: string) {
    try {
      const data = await this.healthTrackerService.getWaterEntries(user.sub, dateStr);
      return { success: true, data };
    } catch (error) {
      console.error('GET /ai/health-tracker/water error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── POST /ai/health-tracker/sleep — upsert sleep entry for date ───────────
  @Post('sleep')
  async upsertSleepEntry(
    @CurrentUser() user: JwtPayload,
    @Body() body: {
      durationMin: number; quality?: string;
      sleepStart?: string; sleepEnd?: string; date?: string; notes?: string;
    },
  ) {
    try {
      if (body.durationMin == null) {
        return { success: false, message: 'durationMin is required' };
      }
      const entry = await this.healthTrackerService.upsertSleepEntry(user.sub, body);
      return { success: true, data: entry };
    } catch (error) {
      console.error('POST /ai/health-tracker/sleep error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /ai/health-tracker/sleep — sleep entry for date ───────────────────
  @Get('sleep')
  async getSleepEntry(@CurrentUser() user: JwtPayload, @Query('date') dateStr?: string) {
    try {
      const data = await this.healthTrackerService.getSleepEntry(user.sub, dateStr);
      return { success: true, data };
    } catch (error) {
      console.error('GET /ai/health-tracker/sleep error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /ai/health-tracker/dashboard — daily aggregation ──────────────────
  @Get('dashboard')
  async getDashboard(@CurrentUser() user: JwtPayload, @Query('date') dateStr?: string) {
    try {
      const data = await this.healthTrackerService.getDashboard(user.sub, dateStr);
      return { success: true, data };
    } catch (error) {
      console.error('GET /ai/health-tracker/dashboard error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── DELETE /ai/health-tracker/food/:id ────────────────────────────────────
  @Delete('food/:id')
  async deleteFoodEntry(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    try {
      const result = await this.healthTrackerService.deleteFoodEntry(id, user.sub);
      if (!result) return { success: false, message: 'Entry not found' };
      return { success: true, message: 'Food entry deleted' };
    } catch (error) {
      console.error('DELETE /ai/health-tracker/food error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── DELETE /ai/health-tracker/exercise/:id ────────────────────────────────
  @Delete('exercise/:id')
  async deleteExerciseEntry(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    try {
      const result = await this.healthTrackerService.deleteExerciseEntry(id, user.sub);
      if (!result) return { success: false, message: 'Entry not found' };
      return { success: true, message: 'Exercise entry deleted' };
    } catch (error) {
      console.error('DELETE /ai/health-tracker/exercise error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── DELETE /ai/health-tracker/sleep/:id ───────────────────────────────────
  @Delete('sleep/:id')
  async deleteSleepEntry(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    try {
      const result = await this.healthTrackerService.deleteSleepEntry(id, user.sub);
      if (!result) return { success: false, message: 'Entry not found' };
      return { success: true, message: 'Sleep entry deleted' };
    } catch (error) {
      console.error('DELETE /ai/health-tracker/sleep error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── POST /ai/health-tracker/food-scan — Groq-vision dish recognition ───
  @Post('food-scan')
  async foodScan(
    @Body() body: { imageBase64?: string; imageUrl?: string },
    @CurrentUser() _user: JwtPayload,
  ) {
    try {
      const data = await this.healthTrackerService.scanFood({
        imageBase64: body?.imageBase64,
        imageUrl: body?.imageUrl,
      });
      return { success: true, data };
    } catch (error) {
      console.error('POST /ai/health-tracker/food-scan error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /ai/health-tracker/food-db — food database search ────────────────
  @Get('food-db')
  async foodDatabase(@Query('q') q?: string, @Query('category') category?: string, @Query('limit') limit?: string) {
    try {
      const data = this.healthTrackerService.searchFoodDatabase(q, category, limit);
      return { success: true, data };
    } catch (error) {
      console.error('GET /ai/health-tracker/food-db error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /ai/health-tracker/meal-plan — get meal plan for week ─────────────
  @Get('meal-plan')
  async getMealPlan(@CurrentUser() user: JwtPayload, @Query('weekStart') weekStart?: string) {
    try {
      const data = await this.healthTrackerService.getMealPlan(user.sub, weekStart);
      return { success: true, data };
    } catch (error) {
      console.error('GET /ai/health-tracker/meal-plan error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── POST /ai/health-tracker/meal-plan/generate — AI meal plan generation ──
  @Post('meal-plan/generate')
  async generateMealPlan(@CurrentUser() user: JwtPayload, @Body() body: { weekStart?: string; preferences?: string[] }) {
    try {
      const data = await this.healthTrackerService.generateMealPlan(user.sub, body);
      return { success: true, data };
    } catch (error) {
      console.error('POST /ai/health-tracker/meal-plan/generate error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── POST /ai/health-tracker/meal-plan/add-to-diary — add to food diary ────
  @Post('meal-plan/add-to-diary')
  async addMealPlanToDiary(@CurrentUser() user: JwtPayload, @Body() body: { name: string; mealType: string; calories: number; protein?: number; carbs?: number; fat?: number; date?: string }) {
    try {
      const entry = await this.healthTrackerService.addMealPlanToDiary(user.sub, body);
      return { success: true, data: entry };
    } catch (error) {
      console.error('POST /ai/health-tracker/meal-plan/add-to-diary error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /ai/health-tracker/progress — progress over period ────────────────
  @Get('progress')
  async getProgress(@CurrentUser() user: JwtPayload, @Query('period') period?: string) {
    try {
      const data = await this.healthTrackerService.getProgress(user.sub, period);
      return { success: true, data };
    } catch (error) {
      console.error('GET /ai/health-tracker/progress error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }
}
