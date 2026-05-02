import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/auth_api.dart';

/// Current user state — Riverpod-managed.
class AuthState {
  final Map<String, dynamic>? user;
  final bool loading;
  final String? error;

  const AuthState({this.user, this.loading = false, this.error});

  AuthState copyWith({Map<String, dynamic>? user, bool? loading, String? error}) =>
      AuthState(
        user: user ?? this.user,
        loading: loading ?? this.loading,
        error: error,
      );

  bool get isAuthenticated => user != null;
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState(loading: true)) {
    refresh();
  }

  Future<void> refresh() async {
    state = state.copyWith(loading: true, error: null);
    try {
      final user = await AuthApi.me();
      state = AuthState(user: user, loading: false);
    } catch (e) {
      state = AuthState(loading: false, error: e.toString());
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final res = await AuthApi.login(email, password);
      if (res['success'] == true) {
        state = AuthState(user: Map<String, dynamic>.from(res['user'] as Map), loading: false);
        return true;
      }
      state = state.copyWith(loading: false, error: res['message']?.toString() ?? 'Login failed');
      return false;
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    await AuthApi.logout();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());
