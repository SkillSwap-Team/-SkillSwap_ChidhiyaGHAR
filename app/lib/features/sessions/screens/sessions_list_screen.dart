import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../config/theme.dart';
import '../../../core/api/dio_client.dart';
import '../../../core/models/learning_session_model.dart';
import '../../../core/providers/profile_provider.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_avatar.dart';
import 'schedule_session_screen.dart';

class SessionsListScreen extends ConsumerWidget {
  const SessionsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionsAsync = ref.watch(mySessionsProvider);

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: ShaderMask(
            shaderCallback: (bounds) =>
                AppTheme.primaryGradient.createShader(bounds),
            child: const Text(
              'My Sessions',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          bottom: const TabBar(
            indicatorColor: AppTheme.primary,
            labelColor: AppTheme.primary,
            unselectedLabelColor: Colors.white54,
            tabs: [
              Tab(text: 'Upcoming'),
              Tab(text: 'Past'),
              Tab(text: 'Cancelled'),
            ],
          ),
        ),

        floatingActionButton: FloatingActionButton.extended(
          onPressed: () async {
            final result = await Navigator.of(context).push<bool>(
              MaterialPageRoute(
                builder: (_) => const ScheduleSessionScreen(),
              ),
            );
            if (result == true) {
              ref.refresh(mySessionsProvider);
            }
          },
          backgroundColor: AppTheme.primary,
          icon: const Icon(Icons.add_rounded, color: Colors.white),
          label: const Text(
            'Schedule',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),

        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [AppTheme.background, Color(0xFF0F1629)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),

          child: sessionsAsync.when(
            loading: () => const Center(
              child: CircularProgressIndicator(color: AppTheme.primary),
            ),

            error: (err, stack) => Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline_rounded,
                      color: AppTheme.error,
                      size: 48,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Failed to load sessions',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      err.toString(),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton.icon(
                      onPressed: () =>
                          ref.refresh(mySessionsProvider),
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Retry'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            data: (sessions) {
              final now = DateTime.now();

              final upcoming = sessions.where((s) =>
                  (s.status == 'confirmed' || s.status == 'pending') &&
                  s.scheduledAt
                      .add(Duration(minutes: s.durationMinutes))
                      .isAfter(now)).toList();

              final past = sessions.where((s) =>
                  s.status == 'completed' ||
                  ((s.status == 'confirmed' || s.status == 'pending') &&
                      s.scheduledAt
                          .add(Duration(minutes: s.durationMinutes))
                          .isBefore(now))).toList();

              final cancelled = sessions.where((s) =>
                  s.status == 'cancelled' ||
                  s.status == 'no_show').toList();

              return TabBarView(
                children: [
                  _SessionsTabList(
                    sessions: upcoming,
                    emptyMessage: 'No upcoming sessions scheduled',
                    onRefresh: () => ref.refresh(mySessionsProvider),
                  ),
                  _SessionsTabList(
                    sessions: past,
                    emptyMessage: 'No past sessions found',
                    onRefresh: () => ref.refresh(mySessionsProvider),
                  ),
                  _SessionsTabList(
                    sessions: cancelled,
                    emptyMessage: 'No cancelled sessions found',
                    onRefresh: () => ref.refresh(mySessionsProvider),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _SessionsTabList extends ConsumerWidget {
  final List<LearningSessionModel> sessions;
  final String emptyMessage;
  final VoidCallback? onRefresh;

  const _SessionsTabList({
    required this.sessions,
    required this.emptyMessage,
    this.onRefresh,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (sessions.isEmpty) {
      return Center(
        child: Text(
          emptyMessage,
          style: TextStyle(
            color: AppTheme.textSecondary,
            fontSize: 14,
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      itemCount: sessions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),

      itemBuilder: (context, index) {
        final session = sessions[index];
        final localTime = session.scheduledAt.toLocal();

        final dateStr =
            DateFormat('EEE, MMM dd yyyy').format(localTime);
        final timeStr = DateFormat('hh:mm a').format(localTime);

        final now = DateTime.now();
        final isUpcoming = session.scheduledAt.isAfter(now);

        Color statusColor = const Color(0xFFFFA040);
        String statusLabel = session.status.toUpperCase();
        IconData statusIcon = Icons.schedule_rounded;

        if (session.status == 'confirmed') {
          statusColor = AppTheme.success;
          statusLabel = 'CONFIRMED';
          statusIcon = Icons.check_circle_rounded;
        } else if (session.status == 'completed') {
          statusColor = AppTheme.secondary;
          statusLabel = 'COMPLETED';
          statusIcon = Icons.done_all_rounded;
        } else if (session.status == 'cancelled' ||
            session.status == 'no_show') {
          statusColor = AppTheme.error;
          statusLabel =
              session.status == 'no_show' ? 'NO SHOW' : 'CANCELLED';
          statusIcon = Icons.cancel_rounded;
        } else if (session.status == 'pending') {
          statusColor = const Color(0xFFFFA040);
          statusLabel = 'SCHEDULED';
          statusIcon = Icons.event_rounded;
        }

        return AppCard(
          glassmorphism: true,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                /// HEADER
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AppAvatar(
                      radius: 22,
                      name: session.title,
                      glowColor: statusColor,
                    ),
                    const SizedBox(width: 12),

                    Expanded(
                      child: Column(
                        crossAxisAlignment:
                            CrossAxisAlignment.start,
                        children: [
                          Text(
                            session.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          if (session.description != null &&
                              session.description!.isNotEmpty)
                            Text(
                              session.description!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 8),

                    /// STATUS BADGE
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color:
                            statusColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: statusColor.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(statusIcon,
                              color: statusColor, size: 10),
                          const SizedBox(width: 4),
                          Text(
                            statusLabel,
                            style: TextStyle(
                              color: statusColor,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                /// DATE ROW
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: isUpcoming
                        ? AppTheme.primary.withValues(alpha: 0.08)
                        : Colors.white.withValues(alpha: 0.04),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded,
                          size: 15, color: AppTheme.primary),
                      const SizedBox(width: 8),
                      Text(dateStr,
                          style: const TextStyle(
                              color: Colors.white)),
                      const SizedBox(width: 10),
                      const Icon(Icons.access_time_rounded,
                          size: 14, color: AppTheme.secondary),
                      const SizedBox(width: 4),
                      Text(timeStr,
                          style: const TextStyle(
                              color: AppTheme.secondary)),
                      const Spacer(),
                      Text(
                        '${session.durationMinutes} min',
                        style: const TextStyle(
                            color: Colors.white54, fontSize: 11),
                      ),
                    ],
                  ),
                ),

                /// JOIN / CANCEL BUTTONS
                if (session.status == 'confirmed' ||
                    session.status == 'pending') ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            context.push('/sessions/${session.id}/call');
                          },
                          icon: const Icon(Icons.video_call_rounded, size: 18),
                          label: const Text('Join Call'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      ElevatedButton.icon(
                        onPressed: () async {
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              backgroundColor: AppTheme.surface,
                              title: const Text('Cancel Session?', style: TextStyle(color: Colors.white)),
                              content: const Text('Are you sure you want to cancel this session?', style: TextStyle(color: Colors.white70)),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
                                TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yes, Cancel', style: TextStyle(color: Colors.red))),
                              ],
                            ),
                          );
                          if (confirm != true) return;
                          try {
                            final api = ref.read(apiProvider);
                            await api.post<Map<String, dynamic>>('/sessions/${session.id}/cancel', data: {'reason': 'Cancelled by user'});
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Session cancelled'), backgroundColor: Colors.red));
                            }
                            onRefresh?.call();
                          } catch (e) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to cancel: $e'), backgroundColor: Colors.red));
                            }
                          }
                        },
                        icon: const Icon(Icons.cancel_rounded, size: 18),
                        label: const Text('Cancel'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red.shade700,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}