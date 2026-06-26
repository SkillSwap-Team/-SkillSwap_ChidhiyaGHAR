import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme.dart';
import '../../../core/providers/profile_provider.dart';

class BadgesScreen extends ConsumerWidget {
  const BadgesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        title: const Text('Badges', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: IconButton(icon: const Icon(Icons.arrow_back_rounded, color: Colors.white), onPressed: () => context.pop()),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(myBadgesProvider);
          ref.invalidate(badgeDefinitionsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          children: const [
            Text(
              'Your Badges',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 12),
            _BadgesGrid(),
          ],
        ),
      ),
    );
  }
}

class _BadgesGrid extends ConsumerWidget {
  const _BadgesGrid();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final myBadgesAsync = ref.watch(myBadgesProvider);

    return myBadgesAsync.when(
      loading: () => const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator(color: AppTheme.primary))),
      error: (err, _) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Text('Failed: $err', style: const TextStyle(color: Colors.red)))),
      data: (badges) {
        if (badges.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12)),
            child: const Center(child: Text('No badges yet. Keep learning!', style: TextStyle(color: Colors.white70))),
          );
        }

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 100),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.85,
          ),
          itemCount: badges.length,
          itemBuilder: (context, index) {
            final badge = badges[index];
            final definition = badge['badge_definitions'];
            return _BadgeCard(name: definition?['name'] ?? 'Badge', tier: definition?['tier'] ?? 'bronze', earnedAt: badge['earned_at'] ?? '');
          },
        );
      },
    );
  }
}

class _BadgeCard extends StatelessWidget {
  final String name;
  final String tier;
  final String earnedAt;

  const _BadgeCard({required this.name, required this.tier, required this.earnedAt});

  @override
  Widget build(BuildContext context) {
    Color glow;
    switch (tier.toLowerCase()) {
      case 'gold': glow = Colors.amber; break;
      case 'silver': glow = Colors.grey.shade300; break;
      case 'platinum': glow = Colors.tealAccent; break;
      case 'diamond': glow = Colors.purpleAccent; break;
      default: glow = Colors.orange;
    }

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [glow.withValues(alpha: 0.2), AppTheme.background], begin: Alignment.topCenter, end: Alignment.bottomCenter),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: glow.withValues(alpha: 0.6)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          ShaderMask(
            shaderCallback: (bounds) => AppTheme.primaryGradient.createShader(bounds),
            blendMode: BlendMode.srcIn,
            child: Icon(Icons.emoji_events_rounded, color: glow, size: 32),
          ),
          const SizedBox(height: 8),
          Text(name, maxLines: 2, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(tier.toUpperCase(), style: TextStyle(color: glow, fontSize: 10, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
