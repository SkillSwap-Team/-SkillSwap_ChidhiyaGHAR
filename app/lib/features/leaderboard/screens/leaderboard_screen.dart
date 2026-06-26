import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme.dart';
import '../../../core/providers/profile_provider.dart';

class LeaderboardScreen extends ConsumerWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leaderboardAsync = ref.watch(activityLeaderboardProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        title: const Text(
          'Activity Leaderboard',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => context.pop(),
        ),
      ),
      body: leaderboardAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (err, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline_rounded, color: AppTheme.error, size: 48),
                const SizedBox(height: 16),
                Text('Failed to load leaderboard', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(err.toString(), textAlign: TextAlign.center, style: TextStyle(color: AppTheme.textSecondary)),
              ],
            ),
          ),
        ),
        data: (entries) {
          final ranked = entries.toList();
          final top = ranked.where((e) => ((e['rank'] as int?) ?? 0) <= 3).toList();

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
            children: [
              const Text(
                'Hall of Fame',
                style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              if (top.isEmpty)
                Container(
                  height: 160,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [AppTheme.primary.withValues(alpha: 0.2), AppTheme.secondary.withValues(alpha: 0.15)]),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppTheme.primary.withValues(alpha: 0.4)),
                  ),
                  child: const Text('Play, chat & learn to earn XP', style: TextStyle(color: Colors.white70)),
                )
              else
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _PodiumCard(entry: top.length > 1 ? top[1] : null, label: '2nd'),
                    const SizedBox(width: 12),
                    _PodiumCard(entry: top.isNotEmpty ? top[0] : null, label: '1st'),
                    const SizedBox(width: 12),
                    _PodiumCard(entry: top.length > 2 ? top[2] : null, label: '3rd'),
                  ],
                ),
              const SizedBox(height: 24),
              const Divider(color: Colors.white24),
              const SizedBox(height: 8),
              const Text(
                'Full Rankings',
                style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              ...entries.map((e) => _LeaderboardTile(rank: e['rank'] as int, entry: e)),
            ],
          );
        },
      ),
    );
  }
}

class _PodiumCard extends StatelessWidget {
  final Map<String, dynamic>? entry;
  final String label;
  const _PodiumCard({required this.entry, required this.label});

  @override
  Widget build(BuildContext context) {
    final profile = entry?['profile'];
    final initial = (profile?['full_name'] ?? '?')[0].toUpperCase();

    Color? glow;
    if (label == '1st') glow = Colors.amber;
    if (label == '2nd') glow = Colors.grey.shade300;
    if (label == '3rd') glow = Colors.orange.shade300;

    return Expanded(
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        height: label == '1st' ? 170 : 130,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              (glow ?? AppTheme.primary).withValues(alpha: 0.25),
              AppTheme.background,
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: (glow ?? AppTheme.primary).withValues(alpha: 0.6)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.black54,
                border: Border.all(color: glow ?? AppTheme.primary),
              ),
              child: Center(child: Text(initial, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold))),
            ),
            const SizedBox(height: 6),
            Text(
              profile?['full_name'] ?? '???',
              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              '${entry?['score'] ?? 0} XP',
              style: TextStyle(color: glow ?? AppTheme.secondary, fontSize: 11, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: (glow ?? AppTheme.primary).withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(label, style: TextStyle(color: glow ?? AppTheme.primary, fontSize: 10, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}

class _LeaderboardTile extends StatelessWidget {
  final int rank;
  final Map<String, dynamic> entry;
  const _LeaderboardTile({required this.rank, required this.entry});

  @override
  Widget build(BuildContext context) {
    final profile = entry['profile'];
    final initial = (profile?['full_name'] ?? '?')[0].toUpperCase();
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Row(
        children: [
          Container(
            width: 28,
            alignment: Alignment.center,
            child: Text('#$rank', style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 10),
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(shape: BoxShape.circle, color: AppTheme.primary.withValues(alpha: 0.2)),
            child: Center(child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              profile?['full_name'] ?? '???',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text('${entry['score'] ?? 0} XP', style: TextStyle(color: AppTheme.secondary, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
