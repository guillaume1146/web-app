import 'client.dart';

class ConnectionsApi {
  /// GET /connections — current user's connections (accepted, pending).
  static Future<List<Map<String, dynamic>>> list({String? status}) async {
    final res = await ApiClient.instance.get(
      '/connections',
      queryParameters: {if (status != null) 'status': status},
    );
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// POST /connections/:id/request — send a connection request.
  static Future<Map<String, dynamic>> sendRequest(String targetUserId) async {
    final res = await ApiClient.instance.post('/connections/$targetUserId/request');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /connections/:id/accept — accept a pending request.
  static Future<Map<String, dynamic>> accept(String connectionId) async {
    final res = await ApiClient.instance.post('/connections/$connectionId/accept');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /connections/:id/reject — reject a pending request.
  static Future<Map<String, dynamic>> reject(String connectionId) async {
    final res = await ApiClient.instance.post('/connections/$connectionId/reject');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// DELETE /connections/:id — remove a connection.
  static Future<Map<String, dynamic>> remove(String connectionId) async {
    final res = await ApiClient.instance.delete('/connections/$connectionId');
    return Map<String, dynamic>.from(res.data as Map);
  }
}
