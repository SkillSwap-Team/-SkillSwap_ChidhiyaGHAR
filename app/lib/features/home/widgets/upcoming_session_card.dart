import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../config/theme.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_avatar.dart';
import '../../../core/providers/profile_provider.dart';

/// Upcoming session card with partner avatar and join actions.
class UpcomingSessionCard extends ConsumerWidget {
  const UpcomingSessionCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionsAsync = ref.watch(upcomingSessionsProvider);

    return sessionsAsync.when(
      loading: () => const AppCard(
        glassmorphism: true,
        child: SizedBox(
          height: 80,
          child: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        ),
      ),
      error: (e, __) => const AppCard(
        glassmorphism: true,
        child: SizedBox(
          height: 80,
          child: Center(child: Text('Error loading sessions', style: TextStyle(color: Colors.white70))),
        ),
      ),
      data: (sessions) {
        if (sessions.isEmpty) {
          return AppCard(
            glassmorphism: true,
            child: Row(
              children: [
                const AppAvatar(
                  radius: 24,
                  name: 'Session Partner',
                  glowColor: AppTheme.secondary,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'No upcoming sessions',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Schedule a session with a match to get started',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => context.go('/chat'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                    ),
                    child: const Text(
                      'Browse',
                      style: TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        // Get the earliest upcoming session
        final session = sessions.first;
        final localTime = session.scheduledAt.toLocal();
        final timeStr = DateFormat('MMM dd, hh:mm a').format(localTime);

        return AppCard(
          glassmorphism: true,
          glow: AppTheme.neonGlow(AppTheme.secondary, spread: 2, blur: 8),
          child: Row(
            children: [
              AppAvatar(
                radius: 24,
                name: session.title,
                glowColor: AppTheme.secondary,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      session.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      timeStr,
                      style: const TextStyle(color: AppTheme.secondary, fontWeight: FontWeight.w500, fontSize: 13),
                    ),
                    if (session.description != null && session.description!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        session.description!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () {
                  context.push('/sessions/${session.id}/call');
                },
                child: const Text(
                  'Join Call',
                  style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
