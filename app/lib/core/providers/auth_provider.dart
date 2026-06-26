import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/dio_client.dart';
import '../api/api_exception.dart';
import '../models/user_model.dart';
import '../models/profile_model.dart';
import '../services/storage_service.dart';
import '../services/socket_service.dart';
import '../../config/api_constants.dart';

// ═══════════════════════════════════════════════════════════════════
//  Auth State
// ═══════════════════════════════════════════════════════════════════

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final UserModel? user;
  final ProfileModel? profile;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.profile,
    this.errorMessage,
  });

  AuthState copyWith({
    AuthStatus? status,
    UserModel? user,
    ProfileModel? profile,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      profile: profile ?? this.profile,
      errorMessage: errorMessage,
    );
  }

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading       => status == AuthStatus.loading;
}

// ═══════════════════════════════════════════════════════════════════
//  Auth Notifier
// ═══════════════════════════════════════════════════════════════════

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    api: ref.watch(apiProvider),
    storage: ref.watch(storageServiceProvider),
    socketService: ref.watch(socketServiceProvider),
  );
});

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api;
  final StorageService _storage;
  final SocketService _socketService;

  AuthNotifier({
    required ApiClient api,
    required StorageService storage,
    required SocketService socketService,
  })  : _api = api,
        _storage = storage,
        _socketService = socketService,
        super(const AuthState());

  // ── Check existing token on app start ─────────────────────────
  Future<void> checkAuth() async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final token = await _storage.getAccessToken();
      if (token == null) {
        state = state.copyWith(status: AuthStatus.unauthenticated);
        return;
      }
      // Verify token by fetching current user
      final response = await _api.get<Map<String, dynamic>>(ApiConstants.authMe);
      final dataMap = response['data'] as Map;
      final data = Map<String, dynamic>.from(dataMap);
      final user = UserModel.fromJson(data);
      ProfileModel? profile;
      if (data['profile'] != null) {
        profile = ProfileModel.fromJson(Map<String, dynamic>.from(data['profile'] as Map));
      }
      await _socketService.connect();
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
        profile: profile,
      );
    } on ApiException catch (e) {
      if (e.isUnauthorized) {
        await _storage.clearTokens();
      }
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: e.message,
      );
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: 'Failed to verify session',
      );
    }
  }

  // ── Login ─────────────────────────────────────────────────────
  Future<void> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final data = await _api.post<Map<String, dynamic>>(
        ApiConstants.authLogin,
        data: {'email': email, 'password': password},
      );
      await _handleAuthResponse(data);
    } on ApiException catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.message,
      );
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: 'Login failed. Please try again.',
      );
    }
  }

  // ── Register ──────────────────────────────────────────────────
  Future<void> register({
    required String email,
    required String username,
    required String password,
  }) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final data = await _api.post<Map<String, dynamic>>(
        ApiConstants.authRegister,
        data: {
          'email': email,
          'username': username,
          'password': password,
        },
      );
      await _handleAuthResponse(data);
    } on ApiException catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.message,
      );
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: 'Registration failed. Please try again.',
      );
    }
  }

  // ── Forgot password ───────────────────────────────────────────
  Future<bool> forgotPassword(String email) async {
    try {
      await _api.post<Map<String, dynamic>>(
        ApiConstants.authForgotPassword,
        data: {'email': email},
      );
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(errorMessage: e.message);
      return false;
    }
  }

  // ── Reset password ────────────────────────────────────────────
  Future<bool> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      await _api.post<Map<String, dynamic>>(
        ApiConstants.authResetPassword,
        data: {'token': token, 'password': newPassword},
      );
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(errorMessage: e.message);
      return false;
    }
  }

  // ── Verify email ──────────────────────────────────────────────
  Future<bool> verifyEmail(String code) async {
    try {
      await _api.post<Map<String, dynamic>>(
        ApiConstants.authVerifyEmail,
        data: {'code': code},
      );
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(errorMessage: e.message);
      return false;
    }
  }

  // ── Resend verification ───────────────────────────────────────
  Future<bool> resendVerification() async {
    try {
      await _api.post<Map<String, dynamic>>(
        ApiConstants.authResendVerification,
        data: {},
      );
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(errorMessage: e.message);
      return false;
    }
  }

  // ── Logout ────────────────────────────────────────────────────
  Future<void> logout() async {
    try {
      await _api.post<Map<String, dynamic>>(
        ApiConstants.authLogout,
        data: {},
      );
    } catch (_) {
      // Even if the server call fails, we clear local state
    }
    _socketService.disconnect();
    await _storage.clearTokens();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> _handleAuthResponse(Map<String, dynamic> response) async {
    debugPrint('[AUTH_PROVIDER] _handleAuthResponse: response structure = $response');
    final dataMap = response['data'] is Map ? response['data'] as Map : response;
    final data = Map<String, dynamic>.from(dataMap);
    final accessToken  = data['accessToken'] as String?;

    debugPrint('[AUTH_PROVIDER] accessToken parsed: ${accessToken != null ? "length: ${accessToken.length}" : "null"}');

    if (accessToken != null) {
      await _storage.saveAccessToken(accessToken);
      debugPrint('[AUTH_PROVIDER] Saved accessToken to storage');
    }

    UserModel? user;
    ProfileModel? profile;

    if (data['user'] is Map) {
      user = UserModel.fromJson(Map<String, dynamic>.from(data['user'] as Map));
      await _storage.saveUserId(user.id);
      debugPrint('[AUTH_PROVIDER] Saved userId: ${user.id}');
    }
    if (data['profile'] is Map) {
      profile = ProfileModel.fromJson(Map<String, dynamic>.from(data['profile'] as Map));
    }

    try {
      await _socketService.connect();
      debugPrint('[AUTH_PROVIDER] Socket connected successfully');
    } catch (e) {
      debugPrint('[AUTH_PROVIDER] Socket connection failed: $e');
    }

    state = state.copyWith(
      status: AuthStatus.authenticated,
      user: user,
      profile: profile,
    );
  }
}
