import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:go_router/go_router.dart';
import '../theme/mediwyz_theme.dart';

/// Pre-join lobby. Shows a local camera preview + mic/camera toggles + a
/// "Join now" button. Reassuring copy on the right: who you'll meet and
/// what to expect. Tap "Join" → go_router to `/video/:roomId` which runs
/// the real peer connection.
class VideoWaitingRoomScreen extends StatefulWidget {
  final String roomId;
  final String? providerName;
  final String? serviceName;
  const VideoWaitingRoomScreen({
    super.key,
    required this.roomId,
    this.providerName,
    this.serviceName,
  });

  @override
  State<VideoWaitingRoomScreen> createState() => _VideoWaitingRoomScreenState();
}

class _VideoWaitingRoomScreenState extends State<VideoWaitingRoomScreen> {
  final _renderer = RTCVideoRenderer();
  MediaStream? _stream;
  bool _cameraOn = true;
  bool _micOn = true;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await _renderer.initialize();
    try {
      _stream = await navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': {'facingMode': 'user'},
      });
      _renderer.srcObject = _stream;
    } catch (e) {
      _error = 'Unable to access camera or microphone. Check app permissions.';
    }
    if (mounted) setState(() => _loading = false);
  }

  void _toggleCamera() {
    final track = _stream?.getVideoTracks().firstOrNull;
    if (track == null) return;
    track.enabled = !_cameraOn;
    setState(() => _cameraOn = !_cameraOn);
  }

  void _toggleMic() {
    final track = _stream?.getAudioTracks().firstOrNull;
    if (track == null) return;
    track.enabled = !_micOn;
    setState(() => _micOn = !_micOn);
  }

  Future<void> _join() async {
    // Release preview stream — the real call page re-acquires.
    for (final t in _stream?.getTracks() ?? const []) {
      t.stop();
    }
    await _stream?.dispose();
    _renderer.srcObject = null;
    if (mounted) context.go('/video/${widget.roomId}');
  }

  @override
  void dispose() {
    _stream?.getTracks().forEach((t) => t.stop());
    _stream?.dispose();
    _renderer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Get ready'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Stack(
                alignment: Alignment.center,
                children: [
                  if (_loading)
                    const CircularProgressIndicator(color: Colors.white)
                  else if (_error != null)
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(_error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white70)),
                    )
                  else if (_cameraOn)
                    Positioned.fill(child: RTCVideoView(_renderer, mirror: true, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover))
                  else
                    const Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.videocam_off, size: 64, color: Colors.white54),
                        SizedBox(height: 12),
                        Text('Camera off', style: TextStyle(color: Colors.white70)),
                      ]),
                    ),

                  // Overlay copy bottom-left
                  Positioned(
                    left: 16, right: 16, bottom: 16,
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            widget.providerName != null
                                ? 'You\'re meeting ${widget.providerName}'
                                : 'You\'re almost in the consultation',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          if (widget.serviceName != null) ...[
                            const SizedBox(height: 2),
                            Text(widget.serviceName!, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                          ],
                          const SizedBox(height: 8),
                          const Text(
                            'Test your camera and mic. The call stays private — only your provider sees this.',
                            style: TextStyle(color: Colors.white60, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Controls
            Container(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              color: Colors.black,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _CircleToggle(
                    icon: _micOn ? Icons.mic : Icons.mic_off,
                    active: _micOn,
                    onTap: _toggleMic,
                  ),
                  _CircleToggle(
                    icon: _cameraOn ? Icons.videocam : Icons.videocam_off,
                    active: _cameraOn,
                    onTap: _toggleCamera,
                  ),
                  FilledButton.icon(
                    onPressed: _loading || _error != null ? null : _join,
                    style: FilledButton.styleFrom(
                      backgroundColor: MediWyzColors.teal,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                    ),
                    icon: const Icon(Icons.call, color: Colors.white),
                    label: const Text('Join now', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CircleToggle extends StatelessWidget {
  final IconData icon;
  final bool active;
  final VoidCallback onTap;
  const _CircleToggle({required this.icon, required this.active, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? Colors.white10 : Colors.red.shade700,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Icon(icon, color: Colors.white, size: 22),
        ),
      ),
    );
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
