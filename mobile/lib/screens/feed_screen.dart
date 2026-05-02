import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import '../api/client.dart';
import '../api/upload_api.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/skeleton.dart';

/// Feed — mirrors the web PostFeed. Posts from providers, patients, companies.
class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});
  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  List<Map<String, dynamic>> _posts = [];
  bool _loading = true;
  final _newPostController = TextEditingController();
  bool _posting = false;
  String? _pendingImageUrl;
  bool _uploadingImage = false;
  String _category = 'all';

  // Keys must match web values (components/posts/PostFeed.tsx CATEGORY_TABS)
  static const _categories = <String, String>{
    'all': 'All',
    'health_tips': 'Tips',
    'article': 'Articles',
    'news': 'News',
    'wellness': 'Wellness',
    'case_study': 'Case Study',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/posts', queryParameters: {
        'limit': 30,
        if (_category != 'all') 'category': _category,
      });
      final body = res.data as Map?;
      // Backend may return { data: { posts: [], total } } OR { data: [...] }
      final raw = body?['data'];
      List list = [];
      if (raw is Map) {
        list = (raw['posts'] as List?) ?? [];
      } else if (raw is List) {
        list = raw;
      }
      setState(() {
        _posts = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _createPost() async {
    final content = _newPostController.text.trim();
    if (content.isEmpty && _pendingImageUrl == null) return;
    setState(() => _posting = true);
    try {
      final res = await ApiClient.instance.post('/posts', data: {
        'content': content,
        if (_pendingImageUrl != null) 'imageUrl': _pendingImageUrl,
        if (_category != 'all') 'category': _category,
      });
      if ((res.data as Map?)?['success'] == true) {
        _newPostController.clear();
        setState(() => _pendingImageUrl = null);
        await _load();
      }
    } catch (_) {}
    finally { if (mounted) setState(() => _posting = false); }
  }

  Future<void> _pickImage() async {
    setState(() => _uploadingImage = true);
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        withData: true,
      );
      if (result == null || result.files.isEmpty) return;
      final file = result.files.first;
      if (file.bytes == null) return;
      final url = await UploadApi.uploadBytes(bytes: file.bytes!, filename: file.name);
      if (url != null && mounted) setState(() => _pendingImageUrl = url);
    } catch (_) {}
    finally { if (mounted) setState(() => _uploadingImage = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Feed', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => Navigator.of(context).pushNamed('/notifications'),
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _loading
          ? const SkeletonList(lineCount: 6)
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  // Category tabs
                  SizedBox(
                    height: 36,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _categories.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 6),
                      itemBuilder: (_, i) {
                        final entry = _categories.entries.elementAt(i);
                        final selected = _category == entry.key;
                        return ChoiceChip(
                          label: Text(entry.value, style: TextStyle(color: selected ? Colors.white : MediWyzColors.navy, fontSize: 12)),
                          selected: selected,
                          onSelected: (_) {
                            setState(() => _category = entry.key);
                            _load();
                          },
                          selectedColor: MediWyzColors.teal,
                          backgroundColor: MediWyzColors.sky.withValues(alpha: 0.2),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 10),
                  // New post card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        children: [
                          TextField(
                            controller: _newPostController,
                            maxLines: 3,
                            minLines: 1,
                            decoration: const InputDecoration(
                              hintText: 'Share a health tip or question...',
                              border: InputBorder.none,
                            ),
                          ),
                          if (_pendingImageUrl != null) ...[
                            const SizedBox(height: 8),
                            Stack(children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(_pendingImageUrl!, height: 140, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox.shrink()),
                              ),
                              Positioned(
                                top: 4, right: 4,
                                child: CircleAvatar(
                                  radius: 14,
                                  backgroundColor: Colors.black54,
                                  child: IconButton(
                                    iconSize: 16,
                                    padding: EdgeInsets.zero,
                                    icon: const Icon(Icons.close, color: Colors.white),
                                    onPressed: () => setState(() => _pendingImageUrl = null),
                                  ),
                                ),
                              ),
                            ]),
                          ],
                          Row(children: [
                            IconButton(
                              icon: _uploadingImage
                                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                  : const Icon(Icons.image_outlined, color: MediWyzColors.teal),
                              tooltip: 'Add image',
                              onPressed: (_uploadingImage || _posting) ? null : _pickImage,
                            ),
                            const Spacer(),
                            FilledButton.icon(
                              onPressed: _posting ? null : _createPost,
                              style: FilledButton.styleFrom(backgroundColor: MediWyzColors.teal),
                              icon: _posting
                                  ? const SizedBox(height: 14, width: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Icon(Icons.send, size: 16),
                              label: const Text('Post'),
                            ),
                          ]),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (_posts.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(40),
                      child: Center(
                        child: Text('No posts yet — be the first!', style: TextStyle(color: Colors.black54)),
                      ),
                    )
                  else
                    ..._posts.map(_PostCard.new),
                ],
              ),
            ),
      bottomNavigationBar: const MediWyzBottomNav(currentIndex: 0),
    );
  }

  @override
  void dispose() {
    _newPostController.dispose();
    super.dispose();
  }
}

class _PostCard extends StatefulWidget {
  final Map<String, dynamic> post;
  const _PostCard(this.post);
  @override
  State<_PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<_PostCard> {
  late bool _liked;
  late int _likeCount;
  late int _commentCount;
  bool _showComments = false;
  bool _loadingComments = false;
  List<Map<String, dynamic>> _comments = [];
  final _commentInput = TextEditingController();
  bool _postingComment = false;

  @override
  void initState() {
    super.initState();
    _liked = widget.post['liked'] == true;
    _likeCount = (widget.post['likeCount'] as int?) ?? 0;
    _commentCount = (widget.post['commentCount'] as int?) ?? 0;
  }

  Future<void> _toggleLike() async {
    // Optimistic update.
    setState(() {
      _liked = !_liked;
      _likeCount += _liked ? 1 : -1;
    });
    try {
      await ApiClient.instance.post('/posts/${widget.post['id']}/like');
    } catch (_) {
      // Revert on failure.
      if (mounted) {
        setState(() {
          _liked = !_liked;
          _likeCount += _liked ? 1 : -1;
        });
      }
    }
  }

  Future<void> _loadComments() async {
    setState(() => _loadingComments = true);
    try {
      final res = await ApiClient.instance.get('/posts/${widget.post['id']}/comments');
      final data = (res.data as Map?)?['data'] as List?;
      _comments = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
    } catch (_) { _comments = []; }
    if (mounted) setState(() => _loadingComments = false);
  }

  Future<void> _toggleComments() async {
    final willShow = !_showComments;
    setState(() => _showComments = willShow);
    if (willShow && _comments.isEmpty) {
      await _loadComments();
    }
  }

  Future<void> _postComment() async {
    final text = _commentInput.text.trim();
    if (text.isEmpty || _postingComment) return;
    setState(() => _postingComment = true);
    try {
      final res = await ApiClient.instance.post(
        '/posts/${widget.post['id']}/comments',
        data: {'content': text},
      );
      if ((res.data as Map?)?['success'] == true) {
        _commentInput.clear();
        final newComment = Map<String, dynamic>.from((res.data as Map)['data'] as Map);
        setState(() {
          _comments.add(newComment);
          _commentCount++;
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _postingComment = false);
  }

  @override
  void dispose() {
    _commentInput.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final post = widget.post;
    final author = post['author'] is Map ? Map<String, dynamic>.from(post['author'] as Map) : <String, dynamic>{};
    final company = post['company'] is Map ? Map<String, dynamic>.from(post['company'] as Map) : null;
    final authorName = company?['companyName']?.toString()
        ?? '${author['firstName'] ?? ''} ${author['lastName'] ?? ''}'.trim();
    final authorRole = author['userType']?.toString().replaceAll('_', ' ').toLowerCase();
    final content = post['content']?.toString() ?? '';
    final createdAt = post['createdAt']?.toString() ?? '';
    final when = createdAt.isEmpty ? '' : _timeAgo(DateTime.tryParse(createdAt) ?? DateTime.now());

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              CircleAvatar(
                backgroundImage: author['profileImage'] != null
                    ? NetworkImage(author['profileImage'].toString()) : null,
                backgroundColor: MediWyzColors.sky,
                child: author['profileImage'] == null
                    ? const Icon(Icons.person, color: MediWyzColors.navy) : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(authorName.isEmpty ? 'Unknown' : authorName,
                      style: const TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
                    Row(children: [
                      if (authorRole != null && authorRole.isNotEmpty)
                        Text(authorRole, style: const TextStyle(fontSize: 11, color: Colors.black54)),
                      if (when.isNotEmpty) ...[
                        const Text(' · ', style: TextStyle(fontSize: 11, color: Colors.black45)),
                        Text(when, style: const TextStyle(fontSize: 11, color: Colors.black54)),
                      ],
                    ]),
                  ],
                ),
              ),
            ]),
            const SizedBox(height: 10),
            Text(content, style: const TextStyle(fontSize: 14, height: 1.4)),
            if (post['imageUrl'] != null) ...[
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(
                  post['imageUrl'].toString(),
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            ],
            const SizedBox(height: 10),
            Row(children: [
              InkWell(
                onTap: _toggleLike,
                borderRadius: BorderRadius.circular(4),
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: Row(children: [
                    Icon(
                      _liked ? Icons.favorite : Icons.favorite_border,
                      size: 18, color: _liked ? Colors.red : Colors.grey.shade600,
                    ),
                    const SizedBox(width: 4),
                    Text('$_likeCount', style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
                  ]),
                ),
              ),
              const SizedBox(width: 10),
              InkWell(
                onTap: _toggleComments,
                borderRadius: BorderRadius.circular(4),
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: Row(children: [
                    Icon(
                      _showComments ? Icons.chat_bubble : Icons.chat_bubble_outline,
                      size: 18, color: _showComments ? MediWyzColors.teal : Colors.grey.shade600,
                    ),
                    const SizedBox(width: 4),
                    Text('$_commentCount', style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
                  ]),
                ),
              ),
            ]),
            if (_showComments) ...[
              const Divider(height: 20),
              if (_loadingComments)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 10),
                  child: Center(child: SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))),
                )
              else if (_comments.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 10),
                  child: Text('Be the first to comment', textAlign: TextAlign.center, style: TextStyle(color: Colors.black54, fontSize: 12)),
                )
              else
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: _comments.map(_commentRow).toList(),
                ),
              Row(children: [
                Expanded(
                  child: TextField(
                    controller: _commentInput,
                    minLines: 1, maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'Write a comment…',
                      isDense: true,
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                    onSubmitted: (_) => _postComment(),
                  ),
                ),
                const SizedBox(width: 6),
                IconButton(
                  icon: _postingComment
                      ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.send, color: MediWyzColors.teal),
                  onPressed: _postingComment ? null : _postComment,
                ),
              ]),
            ],
          ],
        ),
      ),
    );
  }

  Widget _commentRow(Map<String, dynamic> c) {
    final author = c['author'] is Map ? c['author'] as Map : (c['user'] is Map ? c['user'] as Map : {});
    final name = '${author['firstName'] ?? ''} ${author['lastName'] ?? ''}'.trim();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const CircleAvatar(radius: 12, backgroundColor: MediWyzColors.sky, child: Icon(Icons.person, size: 14, color: MediWyzColors.navy)),
        const SizedBox(width: 8),
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(10)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name.isEmpty ? 'User' : name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                const SizedBox(height: 2),
                Text(c['content']?.toString() ?? '', style: const TextStyle(fontSize: 13)),
              ],
            ),
          ),
        ),
      ]),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return '${(diff.inDays / 7).floor()}w';
  }
}
