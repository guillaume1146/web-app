import 'package:dio/dio.dart';
import 'client.dart';

/// Wraps `/upload/local` to return a usable URL. Server infers content type
/// from the filename, so we don't set it client-side.
class UploadApi {
  /// Upload raw bytes (works on Flutter Web since files come as bytes).
  /// Returns the public URL saved on the server, or null on failure.
  static Future<String?> uploadBytes({
    required List<int> bytes,
    required String filename,
  }) async {
    try {
      final form = FormData.fromMap({
        'file': MultipartFile.fromBytes(bytes, filename: filename),
      });
      final res = await ApiClient.instance.post('/upload/local', data: form);
      final body = res.data as Map?;
      return body?['data']?['url']?.toString() ?? body?['url']?.toString();
    } catch (_) {
      return null;
    }
  }

  /// Attach a document row for the current user (after uploadBytes returned a URL).
  static Future<Map<String, dynamic>?> createDocument({
    required String userId,
    required String name,
    required String type,
    required String url,
    required int size,
  }) async {
    try {
      final res = await ApiClient.instance.post('/users/$userId/documents', data: {
        'name': name,
        'type': type,
        'url': url,
        'size': size,
      });
      final body = res.data as Map?;
      if (body?['success'] == true) {
        return Map<String, dynamic>.from(body!['data'] as Map);
      }
    } catch (_) {}
    return null;
  }
}
