import 'client.dart';

class BookingsApi {
  /// POST /bookings — create a new booking for any provider type.
  static Future<Map<String, dynamic>> create(Map<String, dynamic> data) async {
    final res = await ApiClient.instance.post('/bookings', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /bookings/unified — all bookings for the current user.
  /// [role] = 'patient' | 'provider'
  static Future<List<Map<String, dynamic>>> unified({String role = 'patient'}) async {
    final res = await ApiClient.instance.get('/bookings/unified', queryParameters: {'role': role});
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// GET /bookings/unified/:id — single booking with workflow state.
  static Future<Map<String, dynamic>?> getById(String id) async {
    final res = await ApiClient.instance.get('/bookings/unified/$id');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// POST /bookings/reschedule — change scheduledDate/time.
  static Future<Map<String, dynamic>> reschedule(String bookingId, String scheduledDate, String scheduledTime) async {
    final res = await ApiClient.instance.post('/bookings/reschedule', data: {
      'bookingId': bookingId,
      'scheduledDate': scheduledDate,
      'scheduledTime': scheduledTime,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /workflow/transition — advance a booking to the next status.
  static Future<Map<String, dynamic>> transition(String instanceId, String action, {Map<String, dynamic>? input}) async {
    final res = await ApiClient.instance.post('/workflow/transition', data: {
      'instanceId': instanceId,
      'action': action,
      if (input != null) 'input': input,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /workflow/instances/:id — workflow instance with timeline.
  static Future<Map<String, dynamic>?> workflowInstance(String instanceId) async {
    final res = await ApiClient.instance.get('/workflow/instances/$instanceId');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }
}
