import 'client.dart';

class SubscriptionsApi {
  /// GET /subscriptions — list all plans (filter by type/country).
  static Future<List<Map<String, dynamic>>> plans({String? type, String? countryCode}) async {
    final res = await ApiClient.instance.get('/subscriptions', queryParameters: {
      if (type != null) 'type': type,
      if (countryCode != null) 'countryCode': countryCode,
    });
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// GET /subscriptions/:id — single plan with linked services.
  static Future<Map<String, dynamic>?> getPlan(String id) async {
    final res = await ApiClient.instance.get('/subscriptions/$id');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// POST /users/:id/subscription — subscribe, cancel, or change plan.
  static Future<Map<String, dynamic>> updateSubscription(String userId, Map<String, dynamic> data) async {
    final res = await ApiClient.instance.post('/users/$userId/subscription', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /regions/:id — region with currency data.
  static Future<Map<String, dynamic>?> region(String regionId) async {
    final res = await ApiClient.instance.get('/regions/$regionId');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }
}
