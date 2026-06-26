import 'app_config.dart';

/// Every backend endpoint used by the app, grouped by domain.
/// All paths are relative to [AppConfig.baseUrl].
class ApiConstants {
  static const String baseUrl = AppConfig.baseUrl;

  // ── Timeouts ─────────────────────────────────────────────────────
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout     = Duration(seconds: 30);

  // ── Auth ─────────────────────────────────────────────────────────
  static const String authRegister          = '/auth/register';
  static const String authLogin             = '/auth/login';
  static const String authRefreshToken      = '/auth/refresh-token';
  static const String authLogout            = '/auth/logout';
  static const String authForgotPassword    = '/auth/forgot-password';
  static const String authResetPassword     = '/auth/reset-password';
  static const String authVerifyEmail       = '/auth/verify-email';
  static const String authResendVerification= '/auth/resend-verification';
  static const String authMfaSetup          = '/auth/mfa/setup';
  static const String authMfaVerify         = '/auth/mfa/verify';
  static const String authMe               = '/auth/me';

  // ── Profile ──────────────────────────────────────────────────────
  static const String profileMe             = '/profile/me';
  static const String profileAvatar         = '/profile/avatar';
  static const String profileCover          = '/profile/cover';
  static const String profileEducation      = '/profile/education';
  static const String profileExperience     = '/profile/experience';
  static const String profileAvailability   = '/profile/availability';
  static String profileUser(String userId)  => '/profile/$userId';
  static String profileStats(String userId) => '/profile/$userId/stats';
  static String profileFollow(String userId)=> '/profile/$userId/follow';
  static String profileFollowers(String userId) => '/profile/$userId/followers';
  static String profileFollowing(String userId) => '/profile/$userId/following';

  // ── Skills ───────────────────────────────────────────────────────
  static const String skillCategories       = '/skills/categories';
  static const String skillAll              = '/skills/all';
  static const String skillSearch           = '/skills/search';
  static const String skillOffered          = '/skills/offered';
  static const String skillWanted           = '/skills/wanted';
  static String skillOfferedRemove(String id) => '/skills/offered/$id';
  static String skillWantedRemove(String id)  => '/skills/wanted/$id';

  // ── Matching ─────────────────────────────────────────────────────
  static const String matching              = '/matching';
  static const String matchingSuggestions   = '/matching/suggestions';
  static const String matchingNearbyLearners= '/matching/nearby-learners';
  static const String matchingNearbyTeachers= '/matching/nearby-teachers';
  static const String matchingRun           = '/matching/run';
  static String matchDetail(String id)      => '/matching/$id';
  static String matchAccept(String id)      => '/matching/$id/accept';
  static String matchReject(String id)      => '/matching/$id/reject';
  static String matchBlock(String id)       => '/matching/$id/block';
  static String matchRequest(String userId) => '/matching/request/$userId';

  // ── Chat ─────────────────────────────────────────────────────────
  static const String chatConversations     = '/chat/conversations';
  static String chatMessages(String id)     => '/chat/conversations/$id/messages';
  static String chatRead(String id)         => '/chat/conversations/$id/read';
  static String chatReaction(String msgId)  => '/chat/messages/$msgId/reaction';

  // ── Sessions ─────────────────────────────────────────────────────
  static const String sessions              = '/sessions';
  static String sessionDetail(String id)    => '/sessions/$id';
  static String sessionConfirm(String id)   => '/sessions/$id/confirm';
  static String sessionCancel(String id)    => '/sessions/$id/cancel';
  static String sessionJoin(String id)      => '/sessions/$id/join';
  static String sessionComplete(String id)  => '/sessions/$id/complete';
  static String sessionNotes(String id)     => '/sessions/$id/notes';
  static String sessionAttendance(String id)=> '/sessions/$id/attendance';

  // ── Video / Agora ────────────────────────────────────────────────
  static const String videoTokenRtc         = '/video/token/rtc';
  static const String videoTokenRtm         = '/video/token/rtm';
  static const String videoTokenScreenShare = '/video/token/screenshare';

  // ── Whiteboard ───────────────────────────────────────────────────
  static String whiteboard(String sessionId)=> '/whiteboard/$sessionId';

  // ── Reviews ──────────────────────────────────────────────────────
  static const String reviews               = '/reviews';
  static String reviewsForUser(String userId) => '/reviews/user/$userId';
  static String reviewRespond(String id)    => '/reviews/$id/respond';

  // ── Notifications ────────────────────────────────────────────────
  static const String notifications         = '/notifications';
  static String notificationRead(String id) => '/notifications/$id/read';
  static const String notificationsReadAll  = '/notifications/read-all';
  static const String notificationPrefs     = '/notifications/preferences';

  // ── Badges ───────────────────────────────────────────────────────
  static const String badgesAll             = '/badges/all';
  static const String badgesMine            = '/badges/my';

  // ── Leaderboard ──────────────────────────────────────────────────
  static const String leaderboard           = '/leaderboard';
  static const String leaderboardActivity   = '/leaderboard/activity';
  static String leaderboardRank(String userId) => '/leaderboard/rank/$userId';

  // ── Feed ─────────────────────────────────────────────────────────
  static const String feed                  = '/feed';
  static const String feedMine              = '/feed/mine';

  // ── AI ───────────────────────────────────────────────────────────
  static const String aiAsk                 = '/ai/ask';
  static const String aiSummarize           = '/ai/summarize';

  // ── Schedule ─────────────────────────────────────────────────────
  static const String scheduleAvailability  = '/schedule/availability';

  // ── Analytics ────────────────────────────────────────────────────
  static const String analyticsDashboard    = '/analytics/dashboard';
  static const String analyticsSkills       = '/analytics/skills';

  // ── Settings ─────────────────────────────────────────────────────
  static const String settings              = '/settings';

  // ── Location ─────────────────────────────────────────────────────
  static const String location              = '/location';

  // ── Account Deletion ─────────────────────────────────────────────
  static const String deleteAccount         = '/delete/account';
}
