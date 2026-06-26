import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../../core/api/dio_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/models/profile_model.dart';
import '../../../core/providers/profile_provider.dart';
import '../../../core/services/socket_service.dart';
import '../../../core/widgets/app_avatar.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_input.dart';
import '../../../core/widgets/app_snackbar.dart';

class ConversationsListScreen extends ConsumerWidget {
  const ConversationsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onlineUsersAsync = ref.watch(onlineUsersProvider);

    return Scaffold(
      appBar: AppBar(
        title: ShaderMask(
          shaderCallback: (bounds) => AppTheme.primaryGradient.createShader(bounds),
          child: const Text('Live Learners', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
        actions: [
          IconButton(
            onPressed: () => ref.refresh(onlineUsersProvider),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [AppTheme.background, Color(0xFF0F1629)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: onlineUsersAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
          error: (e, __) => Center(
            child: Text(
              'Failed to load live users',
              style: TextStyle(color: AppTheme.textSecondary),
            ),
          ),
          data: (users) {
            if (users.isEmpty) {
              return Center(
                child: Text(
                  'No other learners online right now.',
                  style: TextStyle(color: AppTheme.textSecondary),
                ),
              );
            }

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Horizontal Live Carousel
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text(
                    'Online Now',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
                SizedBox(
                  height: 110,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: users.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 16),
                    itemBuilder: (context, index) {
                      final user = users[index];
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
                            Text(
                              user.fullName ?? 'Learner',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const Divider(color: AppTheme.border, thickness: 1, height: 24),
                // Detailed Online List
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Text(
                    'All Active Members',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                ),
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: users.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final user = users[index];
                      return AppCard(
                        glassmorphism: true,
                        onTap: () => _openActionSheet(context, ref, user),
                        child: Row(
                          children: [
                            AppAvatar(
                              imageUrl: user.avatarUrl,
                              name: user.fullName,
                              radius: 24,
                              glowColor: AppTheme.primary,
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    user.fullName ?? 'Learner',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                      color: AppTheme.textPrimary,
                                    ),
                                  ),
                                  if (user.bio != null) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      user.bio!,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: AppTheme.textSecondary,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.star_rounded, color: AppTheme.warning, size: 16),
                                    const SizedBox(width: 2),
                                    Text(
                                      user.avgRating.toStringAsFixed(1),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                        color: AppTheme.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${user.reputationPoints} RP',
                                  style: const TextStyle(
                                    color: AppTheme.secondary,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            );
          },
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
}

class ChatBottomSheet extends ConsumerStatefulWidget {
  final ProfileModel otherUser;
  const ChatBottomSheet({required this.otherUser});

  @override
  ConsumerState<ChatBottomSheet> createState() => ChatBottomSheetState();
}

class ChatBottomSheetState extends ConsumerState<ChatBottomSheet> {
  final TextEditingController _msgCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();
  String? _conversationId;
  List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  VoidCallback? _socketUnsubscribe;

  @override
  void initState() {
    super.initState();
    _loadConversation();
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    if (_socketUnsubscribe != null) {
      _socketUnsubscribe!();
    }
    super.dispose();
  }

  Future<void> _loadConversation() async {
    try {
      final api = ref.read(apiProvider);
      final response = await api.post<Map<String, dynamic>>('/chat/conversations', data: {
        'participantId': widget.otherUser.id,
      });

      final conversation = response['data'];
      if (conversation != null) {
        _conversationId = conversation['id']?.toString();
        if (_conversationId != null) {
          // Fetch existing messages
          final messagesResponse = await api.get<Map<String, dynamic>>('/chat/conversations/$_conversationId/messages');
          final data = messagesResponse['data'] as List?;
          if (data != null) {
            _messages = List<Map<String, dynamic>>.from(data.map((item) => Map<String, dynamic>.from(item as Map)));
            _messages.sort((a, b) => (a['created_at'] ?? '').compareTo(b['created_at'] ?? ''));
          }

          _setupRealtimeMessages();
        }
      }
      setState(() => _isLoading = false);
      _scrollToBottom();
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _setupRealtimeMessages() {
    final socketService = ref.read(socketServiceProvider);
    
    socketService.emit('join_conversation', _conversationId);

    _socketUnsubscribe = socketService.on('new_message', (data) {
      if (data is Map) {
        final convId = data['conversationId']?.toString();
        final message = data['message'];
        if (convId == _conversationId && message is Map) {
          setState(() {
            _messages.add(Map<String, dynamic>.from(message));
          });
          _scrollToBottom();
        }
      }
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty || _conversationId == null) return;
    _msgCtrl.clear();

    try {
      final api = ref.read(apiProvider);
      final response = await api.post<Map<String, dynamic>>('/chat/conversations/$_conversationId/messages', data: {
        'text': text,
      });

      final message = response['data'];
      if (message != null) {
        setState(() {
          _messages.add(Map<String, dynamic>.from(message));
        });
        _scrollToBottom();
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final sheetHeight = bottomInset > 0
        ? MediaQuery.of(context).size.height * 0.8
        : MediaQuery.of(context).size.height * 0.7;

    return Container(
      height: sheetHeight,
      padding: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: Color(0xFF131B30),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: AppTheme.primary, width: 2)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(color: Colors.white30, borderRadius: BorderRadius.circular(2)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                AppAvatar(
                  imageUrl: widget.otherUser.avatarUrl,
                  name: widget.otherUser.fullName,
                  radius: 20,
                  glowColor: AppTheme.primary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.otherUser.fullName ?? 'Chat',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white54),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(color: AppTheme.border, height: 1),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                : _messages.isEmpty
                    ? Center(
                        child: Text(
                          'No messages yet. Say hello! 👋',
                          style: TextStyle(color: AppTheme.textSecondary),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe = msg['sender_id'] != widget.otherUser.id;
                          return Align(
                            alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.symmetric(vertical: 4),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: isMe ? AppTheme.primary : AppTheme.border,
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(16),
                                  topRight: const Radius.circular(16),
                                  bottomLeft: isMe ? const Radius.circular(16) : Radius.zero,
                                  bottomRight: isMe ? Radius.zero : const Radius.circular(16),
                                ),
                              ),
                              child: Text(
                                msg['text'] ?? '',
                                style: const TextStyle(color: Colors.white, fontSize: 14),
                              ),
                            ),
                          );
                        },
                      ),
          ),
          const Divider(color: AppTheme.border, height: 1),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: AppInput(
                      label: 'Message',
                      hintText: 'Type your message...',
                      controller: _msgCtrl,
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: _sendMessage,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        gradient: AppTheme.primaryGradient,
                        shape: BoxShape.circle,
                        boxShadow: AppTheme.neonGlow(AppTheme.primary, spread: 2, blur: 8),
                      ),
                      child: const Icon(Icons.send, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
