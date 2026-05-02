import 'client.dart';

class InsuranceApi {
  /// GET /corporate/insurance-companies — public search of insurance companies.
  static Future<List<Map<String, dynamic>>> companies({String? q}) async {
    final res = await ApiClient.instance.get(
      '/corporate/insurance-companies',
      queryParameters: {if (q != null) 'q': q},
    );
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// POST /corporate/insurance/:id/join — member joins + first-month debit.
  static Future<Map<String, dynamic>> join(String companyId) async {
    final res = await ApiClient.instance.post('/corporate/insurance/$companyId/join');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /corporate/insurance/:id/contribute — pay this month's contribution.
  static Future<Map<String, dynamic>> contribute(String companyId) async {
    final res = await ApiClient.instance.post('/corporate/insurance/$companyId/contribute');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /corporate/insurance/members — owner view of member payment status.
  static Future<List<Map<String, dynamic>>> members() async {
    final res = await ApiClient.instance.get('/corporate/insurance/members');
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// GET /corporate/insurance/claims?as=owner|member — claims list.
  static Future<List<Map<String, dynamic>>> claims({String as = 'member'}) async {
    final res = await ApiClient.instance.get(
      '/corporate/insurance/claims',
      queryParameters: {'as': as},
    );
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// POST /corporate/insurance/claims — submit a new claim.
  static Future<Map<String, dynamic>> submitClaim(Map<String, dynamic> data) async {
    final res = await ApiClient.instance.post('/corporate/insurance/claims', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /corporate/insurance/claims/:id/approve — owner approves claim.
  static Future<Map<String, dynamic>> approveClaim(String claimId) async {
    final res = await ApiClient.instance.post('/corporate/insurance/claims/$claimId/approve');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /corporate/insurance/claims/:id/deny — owner denies claim.
  static Future<Map<String, dynamic>> denyClaim(String claimId, {String? note}) async {
    final res = await ApiClient.instance.post(
      '/corporate/insurance/claims/$claimId/deny',
      data: {if (note != null) 'note': note},
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /corporate/analytics — owner analytics (members + claims + revenue).
  static Future<Map<String, dynamic>?> analytics() async {
    final res = await ApiClient.instance.get('/corporate/analytics');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }
}
