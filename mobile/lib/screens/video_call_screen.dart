import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';
import '../theme/mediwyz_theme.dart';

/// Real WebRTC video call for both web (via flutter_webrtc 0.12 + updated JS
/// interop) and native. Mirrors the web app's VideoConsultation flow:
///   1. POST /webrtc/session  — DB record
///   2. socket.emit('join-room')  — signaling room
///   3. SDP offer/answer + ICE exchange over `signal` events
class VideoCallScreen extends ConsumerStatefulWidget {
  final String roomId;
  const VideoCallScreen({super.key, required this.roomId});

  @override
  ConsumerState<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends ConsumerState<VideoCallScreen> {
  final _localRenderer = RTCVideoRenderer();
  final _remoteRenderer = RTCVideoRenderer();
  MediaStream? _localStream;
  RTCPeerConnection? _peer;
  String? _sessionId;
  String _status = 'Starting…';
  bool _muted = false;
  bool _videoOff = false;

  static const Map<String, dynamic> _iceConfig = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
    ],
  };

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await _localRenderer.initialize();
    await _remoteRenderer.initialize();

    final user = ref.read(authProvider).user;
    if (user == null) {
      setState(() => _status = 'Not authenticated');
      return;
    }

    try {
      // 1) DB session
      final res = await ApiClient.instance.post('/webrtc/session', data: {
        'roomId': widget.roomId,
        'userId': user['id'],
        'userName': '${user['firstName']} ${user['lastName']}',
        'userType': user['userType'],
      });
      final session = (res.data as Map?)?['data']?['session'] as Map?;
      _sessionId = session?['id']?.toString();

      // 2) Local media
      _localStream = await navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': {'facingMode': 'user'},
      });
      _localRenderer.srcObject = _localStream;

      // 3) Peer connection
      _peer = await createPeerConnection(_iceConfig);
      _localStream!.getTracks().forEach((t) => _peer!.addTrack(t, _localStream!));
      _peer!.onTrack = (event) {
        if (event.streams.isNotEmpty) {
          _remoteRenderer.srcObject = event.streams[0];
          if (mounted) setState(() => _status = 'Connected');
        }
      };
      _peer!.onIceCandidate = (cand) {
        SocketService.current?.emit('signal', {
          'roomId': widget.roomId,
          'data': {'type': 'ice', 'candidate': cand.toMap()},
        });
      };

      // 4) Socket signaling
      final socket = SocketService.connect(userId: user['id'].toString());
      socket.emit('join-room', {
        'roomId': widget.roomId,
        'userId': user['id'],
        'userType': user['userType'],
        'userName': '${user['firstName']} ${user['lastName']}',
        if (_sessionId != null) 'sessionId': _sessionId,
      });

      socket.on('user-joined', (_) async {
        final offer = await _peer!.createOffer();
        await _peer!.setLocalDescription(offer);
        socket.emit('signal', {
          'roomId': widget.roomId,
          'data': {'type': 'offer', 'sdp': offer.sdp, 'sdpType': offer.type},
        });
      });

      socket.on('signal', (raw) async {
        if (raw is! Map || _peer == null) return;
        final data = raw['data'] as Map?;
        if (data == null) return;
        final type = data['type'];
        if (type == 'offer') {
          await _peer!.setRemoteDescription(
            RTCSessionDescription(data['sdp']?.toString(), data['sdpType']?.toString() ?? 'offer'),
          );
          final answer = await _peer!.createAnswer();
          await _peer!.setLocalDescription(answer);
          socket.emit('signal', {
            'roomId': widget.roomId,
            'data': {'type': 'answer', 'sdp': answer.sdp, 'sdpType': answer.type},
          });
        } else if (type == 'answer') {
          await _peer!.setRemoteDescription(
            RTCSessionDescription(data['sdp']?.toString(), data['sdpType']?.toString() ?? 'answer'),
          );
        } else if (type == 'ice') {
          final c = data['candidate'] as Map?;
          if (c != null) {
            await _peer!.addCandidate(RTCIceCandidate(
              c['candidate']?.toString(),
              c['sdpMid']?.toString(),
              c['sdpMLineIndex'] is int ? c['sdpMLineIndex'] as int : null,
            ));
          }
        }
      });

      socket.on('join-error', (raw) {
        if (mounted) setState(() => _status = 'Join error: ${raw is Map ? raw['reason'] : raw}');
      });

      if (mounted) setState(() => _status = 'Waiting for the other participant…');
    } catch (e) {
      if (mounted) setState(() => _status = 'Failed: $e');
    }
  }

  void _toggleMute() {
    final track = _localStream?.getAudioTracks().firstOrNull;
    if (track == null) return;
    track.enabled = !track.enabled;
    setState(() => _muted = !track.enabled);
  }

  void _toggleVideo() {
    final track = _localStream?.getVideoTracks().firstOrNull;
    if (track == null) return;
    track.enabled = !track.enabled;
    setState(() => _videoOff = !track.enabled);
  }

  Future<void> _hangUp() async {
    SocketService.current?.emit('leave-room', {'roomId': widget.roomId});
    if (_sessionId != null) {
      try {
        await ApiClient.instance.delete('/webrtc/session', queryParameters: {'sessionId': _sessionId});
      } catch (_) {}
    }
    if (mounted) Navigator.of(context).pop();
  }

  @override
  void dispose() {
    _localStream?.getTracks().forEach((t) => t.stop());
    _peer?.close();
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MediWyzColors.navy,
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(child: RTCVideoView(_remoteRenderer, mirror: false)),
            Positioned(
              top: 16, right: 16,
              width: 110, height: 150,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: RTCVideoView(_localRenderer, mirror: true),
              ),
            ),
            Positioned(
              top: 16, left: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(20)),
                child: Text(_status, style: const TextStyle(color: Colors.white, fontSize: 12)),
              ),
            ),
            Positioned(
              left: 0, right: 0, bottom: 24,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _CircleBtn(icon: _muted ? Icons.mic_off : Icons.mic, onTap: _toggleMute, bg: Colors.white24),
                  const SizedBox(width: 16),
                  _CircleBtn(icon: Icons.call_end, onTap: _hangUp, bg: Colors.red),
                  const SizedBox(width: 16),
                  _CircleBtn(icon: _videoOff ? Icons.videocam_off : Icons.videocam, onTap: _toggleVideo, bg: Colors.white24),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CircleBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color bg;
  const _CircleBtn({required this.icon, required this.onTap, required this.bg});
  @override
  Widget build(BuildContext context) => Material(
        color: bg,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Icon(icon, color: Colors.white, size: 26),
          ),
        ),
      );
}

extension<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
