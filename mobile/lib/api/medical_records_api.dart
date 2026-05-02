import 'client.dart';

class MedicalRecordsApi {
  /// GET /users/:id/medical-records — list medical records.
  static Future<List<Map<String, dynamic>>> list(String userId, {int page = 1, int limit = 20}) async {
    final res = await ApiClient.instance.get(
      '/users/$userId/medical-records',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// GET /users/:id/vital-signs — latest or historical vital signs.
  static Future<List<Map<String, dynamic>>> vitalSigns(String userId, {bool history = false}) async {
    final res = await ApiClient.instance.get(
      '/users/$userId/vital-signs',
      queryParameters: {if (history) 'history': true},
    );
    final data = (res.data as Map?)?['data'];
    if (data is List) return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    if (data is Map) return [Map<String, dynamic>.from(data)];
    return [];
  }
}
