import 'client.dart';

/// GET /referral-partners/me — every authenticated user auto-provisions
/// a referral code on first hit. Returns flat stats + a list of recent
/// conversions (unused here).
class ReferralApi {
  static Future<Map<String, dynamic>?> me() async {
    final res = await ApiClient.instance.get('/referral-partners/me');
    if (res.statusCode == 200 && res.data is Map) {
      final body = Map<String, dynamic>.from(res.data as Map);
      if (body['success'] == true && body['data'] is Map) {
        final data = Map<String, dynamic>.from(body['data'] as Map);
        // API returns either a flat shape or { stats: {...} }. Normalise.
        if (data['stats'] is Map) return Map<String, dynamic>.from(data['stats'] as Map);
        return data;
      }
    }
    return null;
  }
}
