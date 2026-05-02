import 'client.dart';

class AiApi {
  /// GET /ai/chat — list all AI chat sessions for the current user.
  static Future<List<Map<String, dynamic>>> sessions() async {
    final res = await ApiClient.instance.get('/ai/chat');
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// POST /ai/chat — send a message (creates session if [sessionId] is null).
  static Future<Map<String, dynamic>> sendMessage(String message, {String? sessionId}) async {
    final res = await ApiClient.instance.post('/ai/chat', data: {
      'message': message,
      if (sessionId != null) 'sessionId': sessionId,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /ai/chat/:id — reopen a previous session with full history.
  static Future<Map<String, dynamic>?> getSession(String sessionId) async {
    final res = await ApiClient.instance.get('/ai/chat/$sessionId');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// DELETE /ai/chat/:id — delete a session.
  static Future<Map<String, dynamic>> deleteSession(String sessionId) async {
    final res = await ApiClient.instance.delete('/ai/chat/$sessionId');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /health-streak — current streak + longest streak.
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
}
