import 'client.dart';

class FeedApi {
  /// GET /posts — social feed with optional category filter.
  static Future<Map<String, dynamic>> posts({String? category, int page = 1, int limit = 20}) async {
    final res = await ApiClient.instance.get('/posts', queryParameters: {
      if (category != null && category != 'all') 'category': category,
      'page': page,
      'limit': limit,
    });
    final body = res.data as Map?;
    if (body?['success'] == true) return Map<String, dynamic>.from(body!['data'] as Map);
    return {'posts': [], 'total': 0};
  }

  /// POST /posts — create a new post.
  static Future<Map<String, dynamic>> createPost({
    required String content,
    String? category,
    String? imageUrl,
  }) async {
    final res = await ApiClient.instance.post('/posts', data: {
      'content': content,
      if (category != null) 'category': category,
      if (imageUrl != null) 'imageUrl': imageUrl,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// POST /posts/:id/like — toggle like on a post.
  static Future<Map<String, dynamic>> toggleLike(String postId) async {
    final res = await ApiClient.instance.post('/posts/$postId/like');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /posts/:id/comments — load comments for a post.
  static Future<List<Map<String, dynamic>>> comments(String postId) async {
    final res = await ApiClient.instance.get('/posts/$postId/comments');
    final data = (res.data as Map?)?['data'] as List?;
    return data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
  }

  /// POST /posts/:id/comments — add a comment.
  static Future<Map<String, dynamic>> addComment(String postId, String content) async {
    final res = await ApiClient.instance.post('/posts/$postId/comments', data: {'content': content});
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// DELETE /posts/:id — delete own post.
  static Future<Map<String, dynamic>> deletePost(String postId) async {
    final res = await ApiClient.instance.delete('/posts/$postId');
    return Map<String, dynamic>.from(res.data as Map);
  }
}
