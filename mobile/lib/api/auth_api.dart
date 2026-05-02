import 'client.dart';

class AuthApi {
  /// POST /auth/login — sets mediwyz_token cookie on success.
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await ApiClient.instance.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /auth/me — current user from cookie.
  static Future<Map<String, dynamic>?> me() async {
    final res = await ApiClient.instance.get('/auth/me');
    if (res.statusCode == 200 && res.data is Map) {
      final data = Map<String, dynamic>.from(res.data as Map);
      if (data['success'] == true) return Map<String, dynamic>.from(data['user'] as Map);
    }
    return null;
  }

  /// POST /auth/logout — clears cookie.
  static Future<void> logout() async {
    await ApiClient.instance.post('/auth/logout');
  }

  /// POST /auth/register
  static Future<Map<String, dynamic>> register(Map<String, dynamic> data) async {
    final res = await ApiClient.instance.post('/auth/register', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /auth/forgot-password/question — step 1: fetch security question.
  /// Enumeration-safe — always returns a question, even for unknown emails.
  static Future<Map<String, dynamic>> forgotPasswordQuestion(String email) async {
    final res = await ApiClient.instance.post('/auth/forgot-password/question', data: {'email': email});
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /auth/forgot-password/verify — step 2: verify answer, get reset token.
  static Future<Map<String, dynamic>> forgotPasswordVerify(String email, String answer) async {
    final res = await ApiClient.instance.post('/auth/forgot-password/verify', data: {'email': email, 'answer': answer});
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /auth/reset-password — step 3: use verified token.
  static Future<Map<String, dynamic>> resetPassword(String token, String password) async {
    final res = await ApiClient.instance.post('/auth/reset-password', data: {'token': token, 'password': password});
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /auth/security-question — set/change security Q+A (authenticated).
  static Future<Map<String, dynamic>> setSecurityQuestion(String question, String answer) async {
    final res = await ApiClient.instance.post('/auth/security-question', data: {'question': question, 'answer': answer});
    return Map<String, dynamic>.from(res.data as Map);
  }
}
