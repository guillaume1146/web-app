import 'client.dart';

class ProvidersApi {
  /// GET /search/providers — search providers with optional filters.
  static Future<List<Map<String, dynamic>>> search({
    String? query,
    String? type,
    String? region,
    String? specialty,
    int page = 1,
    int limit = 20,
  }) async {
    final res = await ApiClient.instance.get('/search/providers', queryParameters: {
      if (query != null && query.isNotEmpty) 'q': query,
      if (type != null) 'type': type,
      if (region != null) 'region': region,
      if (specialty != null) 'specialty': specialty,
      'page': page,
      'limit': limit,
    });
    final data = (res.data as Map?)?['data'];
    if (data is List) return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    if (data is Map && data['providers'] is List) {
      return (data['providers'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  /// GET /providers/:id — provider profile (any type).
  static Future<Map<String, dynamic>?> getById(String id) async {
    final res = await ApiClient.instance.get('/providers/$id');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// GET /providers/:id/services — provider's service list with prices.
  static Future<List<Map<String, dynamic>>> services(String id) async {
    final res = await ApiClient.instance.get('/providers/$id/services');
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// GET /providers/:id/reviews — reviews for a provider.
  static Future<List<Map<String, dynamic>>> reviews(String id) async {
    final res = await ApiClient.instance.get('/providers/$id/reviews');
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// POST /providers/:id/reviews — submit a review.
  static Future<Map<String, dynamic>> submitReview(String id, int rating, String comment) async {
    final res = await ApiClient.instance.post('/providers/$id/reviews', data: {
      'rating': rating,
      'comment': comment,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /providers/:id/schedule — availability slots.
  static Future<List<Map<String, dynamic>>> schedule(String id, {String? date}) async {
    final res = await ApiClient.instance.get(
      '/providers/$id/schedule',
      queryParameters: {if (date != null) 'date': date},
    );
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// GET /favorites — saved providers for the current user.
  static Future<List<Map<String, dynamic>>> favorites() async {
    final res = await ApiClient.instance.get('/favorites');
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// POST /favorites/:id/toggle — save or unsave a provider.
  static Future<Map<String, dynamic>> toggleFavorite(String providerId) async {
    final res = await ApiClient.instance.post('/favorites/$providerId/toggle');
    return Map<String, dynamic>.from(res.data as Map);
  }
}
