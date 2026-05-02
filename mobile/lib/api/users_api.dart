import 'client.dart';

class UsersApi {
  /// GET /users/:id — generic user profile.
  static Future<Map<String, dynamic>?> getProfile(String userId) async {
    final res = await ApiClient.instance.get('/users/$userId');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// PATCH /users/:id — update user profile fields.
  static Future<Map<String, dynamic>> updateProfile(String userId, Map<String, dynamic> data) async {
    final res = await ApiClient.instance.patch('/users/$userId', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /roles — all provider roles from DB (dynamic roles principle).
  static Future<List<Map<String, dynamic>>> roles() async {
    final res = await ApiClient.instance.get('/roles');
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// GET /services/catalog — unified service catalog grouped by provider type.
  static Future<List<Map<String, dynamic>>> serviceCatalog({String? providerType}) async {
    final res = await ApiClient.instance.get(
      '/services/catalog',
      queryParameters: {if (providerType != null) 'providerType': providerType},
    );
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// GET /users/:id/prescriptions — prescriptions (any user type).
  static Future<List<Map<String, dynamic>>> prescriptions(String userId, {int page = 1}) async {
    final res = await ApiClient.instance.get(
      '/users/$userId/prescriptions',
      queryParameters: {'page': page},
    );
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }
}
