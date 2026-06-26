import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../config/theme.dart';
import '../../../core/api/dio_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/models/profile_model.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/profile_provider.dart';
import '../../../core/widgets/app_avatar.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_snackbar.dart';
import '../../../core/widgets/app_shimmer_list.dart';
import '../../chat/screens/conversations_list_screen.dart';
import '../widgets/stat_card.dart';
import '../widgets/upcoming_session_card.dart';
import '../widgets/activity_feed_item.dart';
import '../widgets/match_suggestion_chip.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final TextEditingController _codeController = TextEditingController();

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  void _joinByCode(BuildContext context) {
    final code = _codeController.text.trim();
    if (code.isEmpty) {
      AppSnackbar.show(context, message: 'Please enter a meeting code', type: SnackbarType.warning);
      return;
    }
    if (code.length < 4) {
      AppSnackbar.show(context, message: 'Meeting code must be at least 4 characters', type: SnackbarType.warning);
      return;
    }
    _codeController.clear();
    context.push('/sessions/$code/call');
  }

  void _generateAndJoin(BuildContext context) {
    final randomCode = (100000 + math.Random().nextInt(900000)).toString();
    AppSnackbar.show(context, message: 'Generated code: $randomCode. Sharing and joining...', type: SnackbarType.success);
    context.push('/sessions/$randomCode/call');
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final profileAsync = ref.watch(myProfileProvider);
    final profile = profileAsync.valueOrNull ?? authState.profile;
    final badgesAsync = ref.watch(myBadgesProvider);
    final definitionsAsync = ref.watch(badgeDefinitionsProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => ref.read(myProfileProvider.notifier).refresh(),
        color: AppTheme.primary,
        child: CustomScrollView(
          slivers: [
            // ── App bar ──────────────────────────────────────
            SliverAppBar(
              floating: true,
              snap: true,
              title: ShaderMask(
                shaderCallback: (bounds) => AppTheme.primaryGradient.createShader(bounds),
                child: Text(
                  'SkillSwap',
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(color: Colors.white),
                ),
              ),
              actions: [
                IconButton(
                  onPressed: () => context.push('/notifications'),
                  icon: const Icon(Icons.notifications_outlined),
                ),
                Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: GestureDetector(
                    onTap: () => context.go('/profile'),
                    child: AppAvatar(
                      imageUrl: profile?.avatarUrl,
                      name: profile?.fullName,
                      radius: 18,
                      glowColor: AppTheme.primary,
                    ),
                  ),
                ),
              ],
            ),

            // ── Content ──────────────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // ── Greeting banner ─────────────────────────
                  _GreetingBanner(name: profile?.fullName)
                      .animate().fadeIn(duration: 400.ms).slideY(begin: 0.1, end: 0),

                  const SizedBox(height: 20),

                  // ── Video Conference Code Hub ────────────────
                  AppCard(
                    glassmorphism: true,
                    glow: AppTheme.neonGlow(AppTheme.primary, spread: 2, blur: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Video Conference Hub',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _codeController,
                                  decoration: InputDecoration(
                                    labelText: 'Meeting Code',
                                    hintText: 'Enter 6-digit code',
                                    counterText: '',
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  keyboardType: TextInputType.number,
                                  maxLength: 6,
                                  style: const TextStyle(color: Colors.white),
                                ),
                              ),
                              const SizedBox(width: 12),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primary,
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                onPressed: () => _joinByCode(context),
                                child: const Text(
                                  'Join Call',
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppTheme.secondary),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: const Icon(Icons.add_to_home_screen_rounded, color: AppTheme.secondary),
                            label: const Text(
                              'Generate New Meeting Code',
                              style: TextStyle(color: AppTheme.secondary, fontWeight: FontWeight.bold),
                            ),
                            onPressed: () => _generateAndJoin(context),
                          ),
                        ],
                      ),
                    ),
                  ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1, end: 0),

                  const SizedBox(height: 20),

                  // ── Stats row ───────────────────────────────
                  AnimationLimiter(
                    child: Row(
                      children: [
                        Expanded(
                          child: AnimationConfiguration.staggeredList(
                            position: 0,
                            duration: const Duration(milliseconds: 400),
                            child: SlideAnimation(
                              verticalOffset: 30,
                              child: FadeInAnimation(
                                child: StatCard(
                                  title: 'Sessions',
                                  value: profile?.totalSessions ?? 0,
                                  icon: Icons.videocam_rounded,
                                  color: AppTheme.primary,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: AnimationConfiguration.staggeredList(
                            position: 1,
                            duration: const Duration(milliseconds: 400),
                            child: SlideAnimation(
                              verticalOffset: 30,
                              child: FadeInAnimation(
                                child: StatCard(
                                  title: 'Hours',
                                  value: (profile?.teachingHours ?? 0).toInt() + (profile?.learningHours ?? 0).toInt(),
                                  icon: Icons.schedule_rounded,
                                  color: AppTheme.secondary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  AnimationLimiter(
                    child: Row(
                      children: [
                        Expanded(
                          child: AnimationConfiguration.staggeredList(
                            position: 2,
                            duration: const Duration(milliseconds: 400),
                            child: SlideAnimation(
                              verticalOffset: 30,
                              child: FadeInAnimation(
                                child: StatCard(
                                  title: 'Reputation',
                                  value: profile?.reputationPoints ?? 100,
                                  icon: Icons.star_rounded,
                                  color: AppTheme.warning,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: AnimationConfiguration.staggeredList(
                            position: 3,
                            duration: const Duration(milliseconds: 400),
                            child: SlideAnimation(
                              verticalOffset: 30,
                              child: FadeInAnimation(
                                child: StatCard(
                                  title: 'Rating',
                                  value: profile?.avgRating ?? 0,
                                  icon: Icons.thumb_up_rounded,
                                  color: AppTheme.success,
                                  isDouble: true,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 28),

                  // ── Recent Live Pool (Online Users) ─────────
                  _SectionHeader(
                    title: 'Recent Live Pool',
                    onSeeAll: () => context.go('/chat'),
                  ).animate(delay: 400.ms).fadeIn(),
                  const SizedBox(height: 12),
                  ref.watch(onlineUsersProvider).when(
                    loading: () => const SizedBox(
                      height: 110,
                      child: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
                    ),
                    error: (e, __) => SizedBox(
                      height: 110,
                      child: Center(
                        child: Text(
                          'Failed to load live users',
                          style: TextStyle(color: AppTheme.textSecondary),
                        ),
                      ),
                    ),
                    data: (users) {
                      final filteredUsers = users.where((u) => u.id != profile?.id).toList();
                      if (filteredUsers.isEmpty) {
                        return SizedBox(
                          height: 110,
                          child: Center(
                            child: Text(
                              'No other learners online right now',
                              style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                            ),
                          ),
                        );
                      }
                      return SizedBox(
                        height: 110,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: filteredUsers.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 16),
                          itemBuilder: (context, index) {
                            final user = filteredUsers[index];
                            return GestureDetector(
                              onTap: () => _openActionSheet(context, ref, user),
                              child: Column(
                                children: [
                                  Stack(
                                    children: [
                                      AppAvatar(
                                        imageUrl: user.avatarUrl,
                                        name: user.fullName,
                                        radius: 28,
                                        glowColor: AppTheme.success,
                                      ),
                                      Positioned(
                                        right: 2,
                                        bottom: 2,
                                        child: Container(
                                          width: 12,
                                          height: 12,
                                          decoration: BoxDecoration(
                                            color: AppTheme.success,
                                            shape: BoxShape.circle,
                                            border: Border.all(color: AppTheme.background, width: 2),
                                            boxShadow: AppTheme.neonGlow(AppTheme.success, spread: 2, blur: 6),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  SizedBox(
                                    width: 70,
                                    child: Text(
                                      user.fullName ?? 'Learner',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      );
                    },
                  ).animate(delay: 500.ms).fadeIn().slideX(begin: 0.1, end: 0),

                  const SizedBox(height: 28),

                  // ── Upcoming sessions ───────────────────────
                  _SectionHeader(
                    title: 'Upcoming Sessions',
                    onSeeAll: () => context.go('/sessions'),
                  ).animate(delay: 600.ms).fadeIn(),
                  const SizedBox(height: 12),
                  const UpcomingSessionCard()
                      .animate(delay: 700.ms).fadeIn().slideY(begin: 0.1, end: 0),

                  const SizedBox(height: 28),

                  // ── My Badges ───────────────────────────────
                  _SectionHeader(
                    title: 'My Badges',
                    onSeeAll: () => context.go('/profile'),
                  ).animate(delay: 750.ms).fadeIn(),
                  const SizedBox(height: 12),
                  definitionsAsync.when(
                    loading: () => const SizedBox(
                      height: 95,
                      child: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
                    ),
                    error: (e, __) => SizedBox(
                      height: 95,
                      child: Center(
                        child: Text(
                          'Failed to load badge definitions',
                          style: TextStyle(color: AppTheme.textSecondary),
                        ),
                      ),
                    ),
                    data: (definitions) {
                      final earnedBadges = badgesAsync.valueOrNull ?? [];
                      final earnedDefinitionIds = earnedBadges
                          .map((b) => b['badge_definitions'] != null ? b['badge_definitions']['id']?.toString() : null)
                          .where((id) => id != null)
                          .toSet();

                      if (definitions.isEmpty) {
                        return SizedBox(
                          height: 95,
                          child: Center(
                            child: Text(
                              'No badges available to unlock.',
                              style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                            ),
                          ),
                        );
                      }

                      return SizedBox(
                        height: 95,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: definitions.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 16),
                          itemBuilder: (context, index) {
                            final definition = definitions[index];
                            final String id = definition['id']?.toString() ?? '';
                            final String name = definition['name'] ?? 'Badge';
                            final String description = definition['description'] ?? '';
                            final String tier = definition['tier'] ?? 'bronze';
                            final bool isEarned = earnedDefinitionIds.contains(id);

                            Color tierColor = Colors.brown;
                            if (tier == 'silver') tierColor = Colors.grey;
                            if (tier == 'gold') tierColor = Colors.amber;
                            if (tier == 'platinum') tierColor = Colors.cyanAccent;

                            return Tooltip(
                              message: isEarned ? '$name: $description (Earned!)' : '$name: $description (Locked)',
                              child: Opacity(
                                opacity: isEarned ? 1.0 : 0.4,
                                child: AppCard(
                                  glassmorphism: true,
                                  glow: isEarned ? AppTheme.neonGlow(tierColor, spread: 2, blur: 6) : null,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                    child: Row(
                                      children: [
                                        Icon(
                                          isEarned ? Icons.military_tech_rounded : Icons.lock_outline_rounded,
                                          color: isEarned ? tierColor : Colors.white30,
                                          size: 28,
                                        ),
                                        const SizedBox(width: 8),
                                        Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              name,
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 13,
                                                color: isEarned ? Colors.white : Colors.white54,
                                              ),
                                            ),
                                            Text(
                                              tier.toUpperCase(),
                                              style: TextStyle(color: isEarned ? tierColor : Colors.white30, fontSize: 10, fontWeight: FontWeight.w600),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      );
                    },
                  ).animate(delay: 800.ms).fadeIn().slideX(begin: 0.1, end: 0),

                  const SizedBox(height: 28),

                  // ── Recent activity ─────────────────────────
                  _SectionHeader(title: 'Recent Activity')
                      .animate(delay: 800.ms).fadeIn(),
                  const SizedBox(height: 12),
                  ...List.generate(3, (i) {
                    return ActivityFeedItem(index: i)
                        .animate(delay: Duration(milliseconds: 900 + i * 100))
                        .fadeIn()
                        .slideX(begin: 0.05, end: 0);
                  }),

                  const SizedBox(height: 80),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openActionSheet(BuildContext context, WidgetRef ref, ProfileModel user) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF131B30),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(top: BorderSide(color: AppTheme.primary, width: 2)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  AppAvatar(
                    imageUrl: user.avatarUrl,
                    name: user.fullName,
                    radius: 30,
                    glowColor: AppTheme.primary,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.fullName ?? 'Learner',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user.bio ?? 'No bio yet',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),
              AppButton(
                text: 'Send Message',
                isGradient: true,
                onPressed: () {
                  Navigator.pop(context);
                  _openChatSheet(context, ref, user);
                },
              ),
              const SizedBox(height: 12),
              AppButton(
                text: 'Instant Meet (Now)',
                onPressed: () {
                  Navigator.pop(context);
                  _scheduleInstantMeet(context, ref, user);
                },
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: const BorderSide(color: AppTheme.secondary),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.pop(context);
                  _scheduleMeetForLater(context, ref, user);
                },
                child: const Text('Schedule Meet for Later', style: TextStyle(color: AppTheme.secondary)),
              ),
            ],
          ),
        );
      },
    );
  }

  void _openChatSheet(BuildContext context, WidgetRef ref, ProfileModel user) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return ChatBottomSheet(otherUser: user);
      },
    );
  }

  Future<void> _scheduleInstantMeet(BuildContext context, WidgetRef ref, ProfileModel user) async {
    try {
      final api = ref.read(apiProvider);
      final response = await api.post<Map<String, dynamic>>('/sessions', data: {
        'participantId': user.id,
        'title': 'Instant Meetup with ${user.fullName ?? "Learner"}',
        'description': 'Direct skill exchange session.',
        'scheduledAt': DateTime.now().toUtc().toIso8601String(),
        'durationMinutes': 60,
        'status': 'confirmed'
      });

      if (!context.mounted) return;
      final session = response['data'];
      final sessionId = session != null ? session['id']?.toString() : null;

      AppSnackbar.show(context, message: 'Instant Meet Started!', type: SnackbarType.success);

      if (sessionId != null) {
        context.push('/sessions/$sessionId/call');
      }
    } on ApiException catch (e) {
      if (!context.mounted) return;
      AppSnackbar.show(context, message: e.message, type: SnackbarType.error);
    }
  }

  Future<void> _scheduleMeetForLater(BuildContext context, WidgetRef ref, ProfileModel user) async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 30)),
    );
    if (date == null) return;

    if (!context.mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (time == null) return;

    final scheduledDateTime = DateTime(date.year, date.month, date.day, time.hour, time.minute);

    try {
      final api = ref.read(apiProvider);
      await api.post<Map<String, dynamic>>('/sessions', data: {
        'participantId': user.id,
        'title': 'Skill Exchange Session',
        'description': 'Scheduled skill exchange meetup.',
        'scheduledAt': scheduledDateTime.toUtc().toIso8601String(),
        'durationMinutes': 60
      });

      if (!context.mounted) return;
      AppSnackbar.show(
        context,
        message: 'Meet scheduled for ${DateFormat('MMM dd, hh:mm a').format(scheduledDateTime)}!',
        type: SnackbarType.success,
      );
    } on ApiException catch (e) {
      if (!context.mounted) return;
      AppSnackbar.show(context, message: e.message, type: SnackbarType.error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Private helpers
// ═══════════════════════════════════════════════════════════════════

class _GreetingBanner extends StatelessWidget {
  final String? name;
  const _GreetingBanner({this.name});

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    return AppCard(
      glassmorphism: true,
      glow: AppTheme.neonGlow(AppTheme.primary, spread: 4, blur: 15),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$_greeting${name != null ? ',' : '!'} 👋',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 4),
                Text(
                  name ?? 'Learner',
                  style: Theme.of(context).textTheme.displayMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'Ready to learn something new today?',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: AppTheme.primaryGradient,
            ),
            child: const Icon(Icons.school_rounded, color: Colors.white, size: 28),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onSeeAll;
  const _SectionHeader({required this.title, this.onSeeAll});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: Theme.of(context).textTheme.headlineMedium),
        if (onSeeAll != null)
          TextButton(
            onPressed: onSeeAll,
            child: const Text('See All'),
          ),
      ],
    );
  }
}
