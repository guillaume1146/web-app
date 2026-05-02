import 'client.dart';

/// Loads provider roles from the backend.
/// **Dynamic-roles principle**: never hardcode role names — always fetch.
class RolesApi {
  static Future<List<Map<String, dynamic>>> list({bool searchEnabled = false}) async {
    final res = await ApiClient.instance.get(
      '/roles',
      queryParameters: searchEnabled ? {'searchEnabled': 'true'} : null,
    );
    final body = res.data as Map?;
    final data = body?['data'] as List?;
    if (data == null) return [];
    return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// POST /roles/request — public endpoint that creates a pending
  /// ProviderRole (isActive: false) for regional-admin review. Lets a
  /// new signup propose a role that doesn't exist yet — web parity with
  /// the "I don't see my role" modal on the signup page.
  static Future<Map<String, dynamic>> request({
    required String label,
    String? description,
  }) async {
    final res = await ApiClient.instance.post('/roles/request', data: {
      'label': label,
      if (description != null && description.isNotEmpty) 'description': description,
    });
    final body = res.data as Map?;
    if (res.statusCode == 201 && body?['success'] == true && body?['data'] is Map) {
      return Map<String, dynamic>.from(body!['data'] as Map);
    }
    throw Exception(body?['message']?.toString() ?? 'Role request failed');
  }
}
