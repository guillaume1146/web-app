import 'client.dart';

class HealthShopApi {
  /// GET /search/health-shop — browse all providers' inventory.
  static Future<Map<String, dynamic>> browse({
    String? q,
    String? category,
    String? providerType,
    bool? requiresPrescription,
    int page = 1,
    int limit = 20,
  }) async {
    final res = await ApiClient.instance.get('/search/health-shop', queryParameters: {
      if (q != null && q.isNotEmpty) 'q': q,
      if (category != null) 'category': category,
      if (providerType != null) 'providerType': providerType,
      if (requiresPrescription != null) 'requiresPrescription': requiresPrescription,
      'page': page,
      'limit': limit,
    });
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return {'items': [], 'total': 0};
  }

  /// GET /inventory — current provider's own inventory items.
  static Future<List<Map<String, dynamic>>> myInventory() async {
    final res = await ApiClient.instance.get('/inventory');
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// POST /inventory — add an inventory item (provider only).
  static Future<Map<String, dynamic>> addItem(Map<String, dynamic> data) async {
    final res = await ApiClient.instance.post('/inventory', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// PATCH /inventory/:id — update an inventory item.
  static Future<Map<String, dynamic>> updateItem(String id, Map<String, dynamic> data) async {
    final res = await ApiClient.instance.patch('/inventory/$id', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// DELETE /inventory/:id — remove an inventory item.
  static Future<Map<String, dynamic>> deleteItem(String id) async {
    final res = await ApiClient.instance.delete('/inventory/$id');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /inventory/orders — place an order for health shop items.
  static Future<Map<String, dynamic>> placeOrder(List<Map<String, dynamic>> items, {String? deliveryAddress}) async {
    final res = await ApiClient.instance.post('/inventory/orders', data: {
      'items': items,
      if (deliveryAddress != null) 'deliveryAddress': deliveryAddress,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /inventory/orders — list patient's orders.
  static Future<List<Map<String, dynamic>>> myOrders() async {
    final res = await ApiClient.instance.get('/inventory/orders');
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// PATCH /inventory/orders/:id — update order status (provider: accept/reject/complete).
  static Future<Map<String, dynamic>> updateOrderStatus(String id, String status) async {
    final res = await ApiClient.instance.patch('/inventory/orders/$id', data: {'status': status});
    return Map<String, dynamic>.from(res.data as Map);
  }
}
