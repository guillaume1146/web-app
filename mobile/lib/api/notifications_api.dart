import 'client.dart';

class NotificationsApi {
  /// GET /users/:id/notifications — list notifications for a user.
  static Future<List<Map<String, dynamic>>> list(String userId, {int page = 1, int limit = 30}) async {
    final res = await ApiClient.instance.get(
      '/users/$userId/notifications',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// PATCH /users/:id/notifications — mark notifications as read.
  /// Pass [ids] to mark specific ones, or leave null to mark all.
  static Future<Map<String, dynamic>> markRead(String userId, {List<String>? ids}) async {
    final res = await ApiClient.instance.patch(
      '/users/$userId/notifications',
      data: {if (ids != null) 'ids': ids},
    );
    return Map<String, dynamic>.from(res.data as Map);
  }
}
