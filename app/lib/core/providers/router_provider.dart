import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme.dart';
import 'auth_provider.dart';

// ── Feature screen imports ──────────────────────────────────────
import '../../features/auth/screens/splash_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/auth/screens/forgot_password_screen.dart';
import '../../features/auth/screens/email_verification_screen.dart';
import '../../features/auth/screens/reset_password_screen.dart';
import '../../features/auth/screens/mfa_setup_screen.dart';
import '../../features/onboarding/screens/onboarding_screen.dart';
import '../../features/onboarding/screens/skill_setup_wizard.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/matching/screens/matching_screen.dart';
import '../../features/chat/screens/conversations_list_screen.dart';
import '../../features/sessions/screens/sessions_list_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/skills/screens/skills_browse_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/badges/screens/badges_screen.dart';
import '../../features/leaderboard/screens/leaderboard_screen.dart';
import '../../features/ai_assistant/screens/ai_assistant_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/reviews/screens/reviews_screen.dart';
import '../../features/video_call/screens/video_call_screen.dart';
import '../../features/whiteboard/screens/whiteboard_screen.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    debugLogDiagnostics: true,
    routes: [
      // ── Auth routes (no bottom nav) ──────────────────────────
      GoRoute(
        path: '/splash',
        pageBuilder: (context, state) => _fadeTransition(state, const SplashScreen()),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => _fadeTransition(state, const LoginScreen()),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (context, state) => _fadeTransition(state, const RegisterScreen()),
      ),
      GoRoute(
        path: '/forgot-password',
        pageBuilder: (context, state) => _fadeTransition(state, const ForgotPasswordScreen()),
      ),
      GoRoute(
        path: '/email-verification',
        pageBuilder: (context, state) => _fadeTransition(state, const EmailVerificationScreen()),
      ),
      GoRoute(
        path: '/reset-password',
        pageBuilder: (context, state) {
          final token = state.uri.queryParameters['token'] ?? '';
          return _fadeTransition(state, ResetPasswordScreen(token: token));
        },
      ),
      GoRoute(
        path: '/mfa-setup',
        pageBuilder: (context, state) => _fadeTransition(state, const MfaSetupScreen()),
      ),

      // ── Onboarding ──────────────────────────────────────────
      GoRoute(
        path: '/onboarding',
        pageBuilder: (context, state) => _fadeTransition(state, const OnboardingScreen()),
      ),
      GoRoute(
        path: '/skill-setup',
        pageBuilder: (context, state) => _fadeTransition(state, const SkillSetupWizard()),
      ),

      // ── Standalone routes (no bottom nav) ────────────────────
      GoRoute(
        path: '/skills',
        pageBuilder: (context, state) => _fadeTransition(state, const SkillsBrowseScreen()),
      ),
      GoRoute(
        path: '/notifications',
        pageBuilder: (context, state) => _fadeTransition(state, const NotificationsScreen()),
      ),
      GoRoute(
        path: '/badges',
        pageBuilder: (context, state) => _fadeTransition(state, const BadgesScreen()),
      ),
      GoRoute(
        path: '/leaderboard',
        pageBuilder: (context, state) => _fadeTransition(state, const LeaderboardScreen()),
      ),
      GoRoute(
        path: '/ai-assistant',
        pageBuilder: (context, state) => _fadeTransition(state, const AIAssistantScreen()),
      ),
      GoRoute(
        path: '/settings',
        pageBuilder: (context, state) => _fadeTransition(state, const SettingsScreen()),
      ),
      GoRoute(
        path: '/reviews/:userId',
        pageBuilder: (context, state) {
          final userId = state.pathParameters['userId']!;
          return _fadeTransition(state, ReviewsScreen(userId: userId));
        },
      ),
      GoRoute(
        path: '/sessions/:id/call',
        pageBuilder: (context, state) {
          final id = state.pathParameters['id']!;
          return _fadeTransition(state, VideoCallScreen(sessionId: id));
        },
      ),
      GoRoute(
        path: '/sessions/:id/whiteboard',
        pageBuilder: (context, state) {
          final id = state.pathParameters['id']!;
          return _fadeTransition(state, WhiteboardScreen(sessionId: id));
        },
      ),

      // ── Main app shell (with bottom nav) ─────────────────────
      ShellRoute(
        builder: (context, state, child) => ScaffoldWithNav(child: child),
        routes: [
          GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
          GoRoute(path: '/matching', builder: (context, state) => const MatchingScreen()),
          GoRoute(path: '/chat', builder: (context, state) => const ConversationsListScreen()),
          GoRoute(path: '/sessions', builder: (context, state) => const SessionsListScreen()),
          GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
        ],
      ),
    ],
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Page transition helper — fade + slide up
// ═══════════════════════════════════════════════════════════════════

CustomTransitionPage<void> _fadeTransition(GoRouterState state, Widget child) {
  return CustomTransitionPage(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 300),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return FadeTransition(
        opacity: CurveTween(curve: Curves.easeInOut).animate(animation),
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.03),
            end: Offset.zero,
          ).animate(CurveTween(curve: Curves.easeOut).animate(animation)),
          child: child,
        ),
      );
    },
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Bottom Navigation Shell
// ═══════════════════════════════════════════════════════════════════

class ScaffoldWithNav extends StatelessWidget {
  final Widget child;
  const ScaffoldWithNav({super.key, required this.child});

  static const _tabs = [
    ('/home',     Icons.home_rounded,          'Home'),
    ('/matching', Icons.people_alt_rounded,    'Match'),
    ('/chat',     Icons.chat_bubble_rounded,   'Chat'),
    ('/sessions', Icons.calendar_today_rounded,'Sessions'),
    ('/profile',  Icons.person_rounded,        'Profile'),
  ];

  int _currentIndex(String location) {
    for (int i = 0; i < _tabs.length; i++) {
      if (location.startsWith(_tabs[i].$1)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final index = _currentIndex(location);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: isDark ? AppTheme.surface : Colors.white,
          border: Border(
            top: BorderSide(
              color: isDark ? AppTheme.border : const Color(0xFFE2E8F0),
              width: 1,
            ),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: index,
          onTap: (i) => context.go(_tabs[i].$1),
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedItemColor: AppTheme.primary,
          unselectedItemColor: isDark ? AppTheme.textTertiary : const Color(0xFF94A3B8),
          selectedFontSize: 12,
          unselectedFontSize: 11,
          items: _tabs.map((t) => BottomNavigationBarItem(
            icon: Icon(t.$2),
            activeIcon: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(t.$2, color: AppTheme.primary),
            ),
            label: t.$3,
          )).toList(),
        ),
      ),
    );
  }
}
