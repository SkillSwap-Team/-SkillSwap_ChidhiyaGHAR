import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/dio_client.dart';
import '../api/api_exception.dart';
import '../models/profile_model.dart';
import '../models/learning_session_model.dart';
import '../../config/api_constants.dart';

final activityLeaderboardProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiProvider);
  try {
    final response = await api.get<Map<String, dynamic>>(ApiConstants.leaderboardActivity, queryParameters: {'limit': 50});
    final data = response['data'] as List? ?? [];
    return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  } catch (e) {
    return [];
  }
});

// ═══════════════════════════════════════════════════════════════════
//  My Profile provider
// ═══════════════════════════════════════════════════════════════════

final myProfileProvider =
    AsyncNotifierProvider<MyProfileNotifier, ProfileModel?>(
  MyProfileNotifier.new,
);

class MyProfileNotifier extends AsyncNotifier<ProfileModel?> {
  @override
  Future<ProfileModel?> build() async {
    return _fetchMyProfile();
  }

  Future<ProfileModel?> _fetchMyProfile() async {
    try {
      final api = ref.read(apiProvider);
      final data = await api.get<Map<String, dynamic>>(ApiConstants.profileMe);
      if (data['profile'] != null) {
        return ProfileModel.fromJson(data['profile'] as Map<String, dynamic>);
      }
      return ProfileModel.fromJson(data);
    } on ApiException {
      return null;
    }
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = AsyncData(await _fetchMyProfile());
  }

  Future<bool> updateProfile(Map<String, dynamic> updates) async {
    try {
      final api = ref.read(apiProvider);
      final data = await api.put<Map<String, dynamic>>(
        ApiConstants.profileMe,
        data: updates,
      );
      final updated = data['profile'] != null
          ? ProfileModel.fromJson(data['profile'] as Map<String, dynamic>)
          : ProfileModel.fromJson(data);
      state = AsyncData(updated);
      return true;
    } on ApiException {
      return false;
    }
  }

  Future<String?> uploadAvatar(String filePath) async {
    try {
      final api = ref.read(apiProvider);
      final formData = FormData.fromMap({
        'avatar': await MultipartFile.fromFile(filePath),
      });
      final data = await api.uploadFile<Map<String, dynamic>>(
        ApiConstants.profileAvatar,
        formData,
      );
      // Refresh profile to get new avatar URL
      await refresh();
      return data['avatarUrl'] as String?;
    } on ApiException {
      return null;
    }
  }

  Future<String?> uploadCover(String filePath) async {
    try {
      final api = ref.read(apiProvider);
      final formData = FormData.fromMap({
        'cover': await MultipartFile.fromFile(filePath),
      });
      final data = await api.uploadFile<Map<String, dynamic>>(
        ApiConstants.profileCover,
        formData,
      );
      await refresh();
      return data['coverUrl'] as String?;
    } on ApiException {
      return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Other user profile (by userId)
// ═══════════════════════════════════════════════════════════════════

final userProfileProvider = FutureProvider.family<ProfileModel?, String>(
  (ref, userId) async {
    try {
      final api = ref.read(apiProvider);
      final data = await api.get<Map<String, dynamic>>(
        ApiConstants.profileUser(userId),
      );
      if (data['profile'] != null) {
        return ProfileModel.fromJson(data['profile'] as Map<String, dynamic>);
      }
      return ProfileModel.fromJson(data);
    } on ApiException {
      return null;
    }
  },
);

// ═══════════════════════════════════════════════════════════════════
//  Online users provider
// ═══════════════════════════════════════════════════════════════════

final onlineUsersProvider = FutureProvider<List<ProfileModel>>((ref) async {
  final api = ref.watch(apiProvider);
  try {
    final response = await api.get<Map<String, dynamic>>('/profile/online-users');
    final data = response['data'] as List?;
    if (data == null) return [];
    return data.map((item) => ProfileModel.fromJson(Map<String, dynamic>.from(item as Map))).toList();
  } catch (e) {
    return [];
  }
});

final myBadgesProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiProvider);
  try {
    final response = await api.get<Map<String, dynamic>>('/badges/my');
    return response['data'] as List? ?? [];
  } catch (e) {
    return [];
  }
});

final upcomingSessionsProvider = FutureProvider<List<LearningSessionModel>>((ref) async {
  final api = ref.watch(apiProvider);
  try {
    final response = await api.get<Map<String, dynamic>>('/sessions');
    final data = response['data'] as List?;
    if (data == null) return [];

    final sessions = <LearningSessionModel>[];
    for (final item in data) {
      try {
        final s = LearningSessionModel.fromJson(Map<String, dynamic>.from(item as Map));
        sessions.add(s);
      } catch (parseErr) {
        // ignore malformed individual records
      }
    }
    final now = DateTime.now();
    return sessions.where((s) =>
      (s.status == 'confirmed' || s.status == 'pending') &&
      s.scheduledAt.add(Duration(minutes: s.durationMinutes)).isAfter(now)
    ).toList();
  } catch (e) {
    return [];
  }
});

final mySessionsProvider = FutureProvider<List<LearningSessionModel>>((ref) async {
  final api = ref.watch(apiProvider);
  try {
    final response = await api.get<Map<String, dynamic>>('/sessions');
    final rawData = response['data'];
    if (rawData == null) return [];

    final data = rawData as List;
    final sessions = <LearningSessionModel>[];
    for (final item in data) {
      try {
        final map = Map<String, dynamic>.from(item as Map);
        sessions.add(LearningSessionModel.fromJson(map));
      } catch (parseErr, st) {
        // Log parse failure but continue loading remaining sessions
        // ignore: avoid_print
        print('[mySessionsProvider] Failed to parse session: $parseErr');
        print('[mySessionsProvider] Stack: $st');
      }
    }
    return sessions;
  } catch (e, st) {
    // ignore: avoid_print
    print('[mySessionsProvider] Error fetching sessions: $e');
    print('[mySessionsProvider] Stack: $st');
    return [];
  }
});

final badgeDefinitionsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiProvider);
  try {
    final response = await api.get<Map<String, dynamic>>('/badges/definitions');
    return response['data'] as List? ?? [];
  } catch (e) {
    return [];
  }
});
