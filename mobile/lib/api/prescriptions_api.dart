import 'client.dart';

class PrescriptionsApi {
  /// GET /users/:id/prescriptions — list prescriptions for a user.
  static Future<List<Map<String, dynamic>>> list(String userId, {int page = 1, int limit = 20}) async {
    final res = await ApiClient.instance.get(
      '/users/$userId/prescriptions',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// GET /users/:userId/prescriptions/:id — single prescription detail.
  static Future<Map<String, dynamic>?> getById(String userId, String prescriptionId) async {
    final res = await ApiClient.instance.get('/users/$userId/prescriptions/$prescriptionId');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// GET /users/:userId/prescriptions/:id/pdf — print-ready HTML URL.
  /// Returns the full URL to open in a browser/WebView for PDF saving.
  static String pdfUrl(String userId, String prescriptionId) {
    final base = ApiClient.instance.options.baseUrl;
    return '$base/users/$userId/prescriptions/$prescriptionId/pdf';
  }
}
