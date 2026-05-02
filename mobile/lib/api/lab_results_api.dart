import 'client.dart';

class LabResultsApi {
  /// GET /users/:id/lab-tests — list lab test orders with results.
  static Future<List<Map<String, dynamic>>> list(String userId, {int page = 1, int limit = 20}) async {
    final res = await ApiClient.instance.get(
      '/users/$userId/lab-tests',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// GET /users/:id/lab-tests/:testId — single lab test with results.
  static Future<Map<String, dynamic>?> getById(String userId, String testId) async {
    final res = await ApiClient.instance.get('/users/$userId/lab-tests/$testId');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }
}
