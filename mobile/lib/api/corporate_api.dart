import 'client.dart';

class CorporateApi {
  /// GET /corporate/capability — check if current user has corporate-admin capability.
  static Future<bool> hasCapability() async {
    final res = await ApiClient.instance.get('/corporate/capability');
    final body = res.data as Map?;
    return body?['data']?['hasCapability'] == true;
  }

  /// GET /corporate/analytics — owner analytics (members + claims + revenue).
  static Future<Map<String, dynamic>?> analytics() async {
    final res = await ApiClient.instance.get('/corporate/analytics');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// GET /corporate/enroll — preview enrollment cost for employees.
  static Future<Map<String, dynamic>?> previewEnrollment(String planId) async {
    final res = await ApiClient.instance.get('/corporate/enroll', queryParameters: {'planId': planId});
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// POST /corporate/enroll — enroll employees in a plan.
  static Future<Map<String, dynamic>> enrollEmployees(String planId, List<String> employeeIds) async {
    final res = await ApiClient.instance.post('/corporate/enroll', data: {
      'planId': planId,
      'employeeIds': employeeIds,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /corporate/companies/:id/transfer — transfer company ownership.
  static Future<Map<String, dynamic>> transferOwnership(String companyId, String newOwnerEmail) async {
    final res = await ApiClient.instance.post(
      '/corporate/companies/$companyId/transfer',
      data: {'email': newOwnerEmail},
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// DELETE /corporate/companies/:id — delete company (members soft-removed).
  static Future<Map<String, dynamic>> deleteCompany(String companyId) async {
    final res = await ApiClient.instance.delete('/corporate/companies/$companyId');
    return Map<String, dynamic>.from(res.data as Map);
  }
}
