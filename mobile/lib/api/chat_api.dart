import 'client.dart';

class ChatApi {
  /// GET /conversations — list current user's conversations.
  static Future<List<Map<String, dynamic>>> conversations() async {
    final res = await ApiClient.instance.get('/conversations');
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// GET /conversations/:id/messages — full message history.
  static Future<List<Map<String, dynamic>>> messages(String conversationId) async {
    final res = await ApiClient.instance.get('/conversations/$conversationId/messages');
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// POST /conversations/:id/messages — send a message (HTTP fallback when socket is offline).
  static Future<Map<String, dynamic>?> sendMessage(String conversationId, String content) async {
    final res = await ApiClient.instance.post(
      '/conversations/$conversationId/messages',
      data: {'content': content},
    );
    final body = res.data as Map?;
    if (body?['success'] == true) {
      return Map<String, dynamic>.from(body!['data'] as Map);
    }
    return null;
  }
}
