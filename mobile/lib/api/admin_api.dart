import 'client.dart';

class AdminApi {
  /// GET /admin/users — list all users (super admin + regional admin).
  static Future<Map<String, dynamic>> users({String? role, int page = 1, int limit = 20}) async {
    final res = await ApiClient.instance.get('/admin/users', queryParameters: {
      if (role != null) 'role': role,
      'page': page,
      'limit': limit,
    });
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return {'users': [], 'total': 0};
  }

  /// PATCH /admin/users/:id — update user status or role.
  static Future<Map<String, dynamic>> updateUser(String userId, Map<String, dynamic> data) async {
    final res = await ApiClient.instance.patch('/admin/users/$userId', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /admin/stats — platform-wide statistics.
  static Future<Map<String, dynamic>?> stats() async {
    final res = await ApiClient.instance.get('/admin/stats');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// GET /config — platform config (commission rates, wallet trial amount).
  static Future<Map<String, dynamic>?> config() async {
    final res = await ApiClient.instance.get('/config');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// PATCH /config — update platform config (admin only).
  static Future<Map<String, dynamic>> updateConfig(Map<String, dynamic> data) async {
    final res = await ApiClient.instance.patch('/config', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /cms — content management (hero, stats, testimonials).
  static Future<Map<String, dynamic>?> cmsContent() async {
    final res = await ApiClient.instance.get('/cms');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// PATCH /cms — update CMS content.
  static Future<Map<String, dynamic>> updateCms(Map<String, dynamic> data) async {
    final res = await ApiClient.instance.patch('/cms', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }
}
