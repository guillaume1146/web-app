import 'client.dart';

class WalletApi {
  /// GET /users/:id/wallet — balance + recent transactions.
  static Future<Map<String, dynamic>?> get(String userId) async {
    final res = await ApiClient.instance.get('/users/$userId/wallet');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }

  /// POST /users/:id/wallet/topup — top up wallet with MCB Juice or card.
  static Future<Map<String, dynamic>> topUp(String userId, {
    required double amount,
    required String method,
    String? phone,
    String? cardNumber,
  }) async {
    final res = await ApiClient.instance.post('/users/$userId/wallet/topup', data: {
      'amount': amount,
      'method': method,
      if (phone != null) 'phone': phone,
      if (cardNumber != null) 'cardNumber': cardNumber,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /users/:id/wallet/reset — reset wallet to trial amount (dev/demo only).
  static Future<Map<String, dynamic>> resetTrial(String userId, {double? amount}) async {
    final res = await ApiClient.instance.post('/users/$userId/wallet/reset', data: {
      if (amount != null) 'amount': amount,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /users/:id/subscription — subscription usage summary.
  static Future<Map<String, dynamic>?> subscription(String userId) async {
    final res = await ApiClient.instance.get('/users/$userId/subscription');
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return null;
  }
}
