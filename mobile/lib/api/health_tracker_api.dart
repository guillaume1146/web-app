import 'client.dart';

class HealthTrackerApi {
  /// GET /health-streak — current + longest streak.
  static Future<Map<String, dynamic>?> streak() async {
    final res = await ApiClient.instance.get('/health-streak');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// POST /health-streak/check-in — idempotent daily check-in.
  static Future<Map<String, dynamic>> checkIn() async {
    final res = await ApiClient.instance.post('/health-streak/check-in');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /ai/health-tracker — tracker profile (goals, targets, metrics).
  static Future<Map<String, dynamic>?> profile() async {
    final res = await ApiClient.instance.get('/ai/health-tracker');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// PATCH /ai/health-tracker — update tracker profile.
  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    final res = await ApiClient.instance.patch('/ai/health-tracker', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /ai/health-tracker/meals — log a meal.
  static Future<Map<String, dynamic>> logMeal(Map<String, dynamic> data) async {
    final res = await ApiClient.instance.post('/ai/health-tracker/meals', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /ai/health-tracker/meals — today's meals.
  static Future<List<Map<String, dynamic>>> todaysMeals() async {
    final res = await ApiClient.instance.get('/ai/health-tracker/meals');
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// POST /ai/food-scan — scan food image for calories/macros.
  /// [imageBase64] is a base64-encoded image string.
  static Future<Map<String, dynamic>> scanFood(String imageBase64) async {
    final res = await ApiClient.instance.post('/ai/food-scan', data: {'image': imageBase64});
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /ai/health-tracker/insights — AI-generated health insights.
  static Future<List<Map<String, dynamic>>> insights() async {
    final res = await ApiClient.instance.get('/ai/health-tracker/insights');
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }
}
