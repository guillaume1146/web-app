import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:flutter/foundation.dart';
import '../config.dart';

/// Singleton Socket.IO connection — used by chat, notifications, WebRTC signaling.
/// Mirrors the web app's hooks/useSocket.ts contract.
class SocketService {
  static io.Socket? _socket;

  static io.Socket connect({required String userId}) {
    if (_socket?.connected == true) return _socket!;

    _socket = io.io(
      AppConfig.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableForceNew()
          .setExtraHeaders({'withCredentials': 'true'})
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('[socket] connected: ${_socket!.id}');
      // Join the user's notification room (NotificationsGateway: 'chat:join').
      _socket!.emit('chat:join', {'userId': userId});
    });

    _socket!.onDisconnect((_) => debugPrint('[socket] disconnected'));
    _socket!.onConnectError((e) => debugPrint('[socket] connect error: $e'));

    return _socket!;
  }

  static io.Socket? get current => _socket;

  static void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }
}
