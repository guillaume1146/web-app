import 'client.dart';

/// Workflow-library + cloning API — mirrors the web library page.
class WorkflowApi {
  /// GET /workflow/library/browse — active templates across every source
  /// (system defaults, regional-admin authored, provider-authored) with
  /// creator + linked service denormalised for card rendering.
  static Future<List<Map<String, dynamic>>> browseLibrary({
    String? providerType,
    String? serviceMode,
    String? search,
    String? source,
    String? containsStatus,
  }) async {
    final query = <String, String>{};
    if (providerType != null && providerType.isNotEmpty) query['providerType'] = providerType;
    if (serviceMode != null && serviceMode.isNotEmpty) query['serviceMode'] = serviceMode;
    if (search != null && search.isNotEmpty) query['search'] = search;
    if (source != null && source.isNotEmpty) query['source'] = source;
    if (containsStatus != null && containsStatus.isNotEmpty) query['containsStatus'] = containsStatus;

    final res = await ApiClient.instance.get('/workflow/library/browse', queryParameters: query);
    if (res.statusCode == 200 && res.data is Map) {
      final data = (res.data as Map)['data'];
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    }
    return [];
  }

  /// POST /workflow/templates/:id/clone — fork a library template into my
  /// workspace. Returns the new template row.
  static Future<Map<String, dynamic>?> cloneTemplate(String id, {String? name, String? providerType, String? serviceMode}) async {
    final res = await ApiClient.instance.post('/workflow/templates/$id/clone', data: {
      if (name != null) 'name': name,
      if (providerType != null) 'providerType': providerType,
      if (serviceMode != null) 'serviceMode': serviceMode,
    });
    if (res.statusCode == 201 && res.data is Map) {
      final ok = (res.data as Map)['success'] == true;
      if (ok) return Map<String, dynamic>.from((res.data as Map)['data'] as Map);
    }
    return null;
  }
}
