import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:go_router/go_router.dart';
import 'config/theme.dart';
import 'core/providers/router_provider.dart';
import 'core/providers/theme_provider.dart';
import 'core/services/notification_service.dart';
import 'core/services/socket_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  runApp(const ProviderScope(child: SkillSwapApp()));
}

class SkillSwapApp extends ConsumerStatefulWidget {
  const SkillSwapApp({super.key});

  @override
  ConsumerState<SkillSwapApp> createState() => _SkillSwapAppState();
}

class _SkillSwapAppState extends ConsumerState<SkillSwapApp> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(notificationServiceProvider).initialize();
      _setupSocketListener();
    });
  }

  void _setupSocketListener() {
    final socketService = ref.read(socketServiceProvider);

    socketService.on('notification:new', (data) {
      debugPrint('[Socket Notification] Received: $data');
      if (data is Map) {
        final type = data['type'];
        final notificationData = data['data'];

        if (type == 'session_scheduled' &&
            notificationData is Map &&
            notificationData['status'] == 'confirmed') {
          final sessionId = notificationData['sessionId']?.toString();
          final body = data['body'] ?? 'Incoming call...';

          final context = rootNavigatorKey.currentContext;
          if (context != null && sessionId != null) {
            showDialog(
              context: context,
              barrierDismissible: false,
              builder: (dialogCtx) => AlertDialog(
                backgroundColor: const Color(0xFF131B30),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: AppTheme.primary, width: 2),
                ),
                title: const Text(
                  'Incoming Instant Meet',
                  style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold),
                ),
                content: Text(
                  body,
                  style: const TextStyle(color: Colors.white),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(dialogCtx).pop(),
                    child: const Text('Decline', style: TextStyle(color: Colors.grey)),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () {
                      Navigator.of(dialogCtx).pop();
                      context.push('/sessions/$sessionId/call');
                    },
                    child: const Text('Join Call', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            );
            return;
          }
        }

        final title = data['title'] ?? 'Notification';
        final body = data['body'] ?? '';
        ref.read(notificationServiceProvider).showNotification(title, body);
      }
    });

    socketService.on('new_message', (data) {
      debugPrint('[Socket Message] Received: $data');
      if (data is Map) {
        final message = data['message'];
        if (message is Map) {
          final text = message['text'] ?? 'New message received';
          ref.read(notificationServiceProvider).showNotification('New message', text);
        } else {
          final text = data['text'] ?? 'New message received';
          ref.read(notificationServiceProvider).showNotification('New message', text);
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp.router(
      title: 'SkillSwap',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}
