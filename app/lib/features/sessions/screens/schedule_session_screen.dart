import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../config/theme.dart';
import '../../../core/api/dio_client.dart';
import '../../../core/providers/profile_provider.dart';

class ScheduleSessionScreen extends ConsumerStatefulWidget {
  const ScheduleSessionScreen({super.key});

  @override
  ConsumerState<ScheduleSessionScreen> createState() =>
      _ScheduleSessionScreenState();
}

class _ScheduleSessionScreenState
    extends ConsumerState<ScheduleSessionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _participantCtrl = TextEditingController();

  DateTime? _scheduledAt;
  int _durationMinutes = 60;
  bool _loading = false;
  String? _error;
  String? _selectedParticipantId;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _participantCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(hours: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: AppTheme.primary,
            onPrimary: Colors.white,
            surface: Color(0xFF1A1F35),
            onSurface: Colors.white,
          ),
        ),
        child: child!,
      ),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: AppTheme.primary,
            onPrimary: Colors.white,
            surface: Color(0xFF1A1F35),
            onSurface: Colors.white,
          ),
        ),
        child: child!,
      ),
    );
    if (time == null || !mounted) return;

    setState(() {
      _scheduledAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_scheduledAt == null) {
      setState(() => _error = 'Please pick a date & time.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      if (_selectedParticipantId == null) {
        setState(() => _error = 'Please select a participant by searching their name.');
        return;
      }

      final api = ref.read(apiProvider);
      await api.post<Map<String, dynamic>>('/sessions', data: {
        'participantId': _selectedParticipantId,
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'scheduledAt': _scheduledAt!.toUtc().toIso8601String(),
        'durationMinutes': _durationMinutes,
      });

      // Refresh sessions list
      ref.refresh(mySessionsProvider);
      ref.refresh(upcomingSessionsProvider);

      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Session scheduled! ✅'),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        title: ShaderMask(
          shaderCallback: (b) => AppTheme.primaryGradient.createShader(b),
          child: const Text(
            'Schedule a Meet',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [AppTheme.background, Color(0xFF0F1629)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Header ────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.primary.withValues(alpha: 0.15),
                        AppTheme.secondary.withValues(alpha: 0.10),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppTheme.primary.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.video_camera_front_rounded,
                          color: AppTheme.primary,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'New Session',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Schedule a skill-swap video call',
                              style: TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // ── Title ─────────────────────────────────────────────
                _SectionLabel(label: 'Session Title'),
                const SizedBox(height: 8),
                _StyledField(
                  controller: _titleCtrl,
                  hint: 'e.g. Flutter with React Native swap',
                  icon: Icons.title_rounded,
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Title is required' : null,
                ),
                const SizedBox(height: 20),

                // ── Participant ───────────────────────────────────────
                _SectionLabel(label: 'Participant'),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () async {
                    final api = ref.read(apiProvider);
                    final result = await showSearch<_UserSearchResult?>(
                      context: context,
                      delegate: _UserSearchDelegate(api),
                    );
                    if (result != null && mounted) {
                      setState(() {
                        _selectedParticipantId = result.id;
                        _participantCtrl.text = result.displayName;
                      });
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _selectedParticipantId == null
                            ? Colors.white12
                            : AppTheme.primary.withValues(alpha: 0.6),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.person_rounded, color: AppTheme.textSecondary, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _participantCtrl.text.isEmpty ? 'Tap to search participant' : _participantCtrl.text,
                            style: TextStyle(
                              color: _selectedParticipantId == null ? AppTheme.textSecondary : Colors.white,
                              fontSize: 15,
                            ),
                          ),
                        ),
                        const Icon(Icons.search_rounded, color: AppTheme.textSecondary),
                      ],
                    ),
                  ),
                ),
                if (_selectedParticipantId == null)
                  Padding(
                    padding: const EdgeInsets.only(left: 4, top: 4),
                    child: Text(
                      'Search by name to pick a participant.',
                      style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                    ),
                  ),
                const SizedBox(height: 20),

                // ── Description ───────────────────────────────────────
                _SectionLabel(label: 'Description (optional)'),
                const SizedBox(height: 8),
                _StyledField(
                  controller: _descCtrl,
                  hint: 'What will you learn / teach?',
                  icon: Icons.notes_rounded,
                  maxLines: 3,
                ),
                const SizedBox(height: 20),

                // ── Date & Time ───────────────────────────────────────
                _SectionLabel(label: 'Date & Time'),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: _pickDateTime,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _scheduledAt != null
                            ? AppTheme.primary.withValues(alpha: 0.6)
                            : Colors.white12,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.calendar_month_rounded,
                          color: _scheduledAt != null
                              ? AppTheme.primary
                              : AppTheme.textSecondary,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Text(
                          _scheduledAt != null
                              ? DateFormat('EEE, MMM dd, yyyy  •  hh:mm a')
                                  .format(_scheduledAt!)
                              : 'Tap to pick date & time',
                          style: TextStyle(
                            color: _scheduledAt != null
                                ? Colors.white
                                : AppTheme.textSecondary,
                            fontSize: 15,
                          ),
                        ),
                        const Spacer(),
                        const Icon(
                          Icons.chevron_right_rounded,
                          color: AppTheme.textSecondary,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // ── Duration ──────────────────────────────────────────
                _SectionLabel(label: 'Duration: $_durationMinutes minutes'),
                const SizedBox(height: 8),
                SliderTheme(
                  data: SliderThemeData(
                    activeTrackColor: AppTheme.primary,
                    inactiveTrackColor: Colors.white12,
                    thumbColor: AppTheme.primary,
                    overlayColor: AppTheme.primary.withValues(alpha: 0.2),
                    valueIndicatorColor: AppTheme.primary,
                    valueIndicatorTextStyle:
                        const TextStyle(color: Colors.white),
                  ),
                  child: Slider(
                    value: _durationMinutes.toDouble(),
                    min: 15,
                    max: 180,
                    divisions: 11,
                    label: '$_durationMinutes min',
                    onChanged: (v) =>
                        setState(() => _durationMinutes = v.round()),
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('15 min',
                        style: TextStyle(
                            color: AppTheme.textSecondary, fontSize: 11)),
                    Text('3 hours',
                        style: TextStyle(
                            color: AppTheme.textSecondary, fontSize: 11)),
                  ],
                ),
                const SizedBox(height: 28),

                // ── Error ─────────────────────────────────────────────
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.error.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: AppTheme.error.withValues(alpha: 0.4)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline_rounded,
                            color: AppTheme.error, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _error!,
                            style: const TextStyle(
                                color: AppTheme.error, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // ── Submit ────────────────────────────────────────────
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _loading ? null : _submit,
                    icon: _loading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.event_available_rounded,
                            color: Colors.white),
                    label: Text(
                      _loading ? 'Scheduling...' : 'Schedule Session',
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16),
                    ),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: AppTheme.primary,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _UserSearchResult {
  final String id;
  final String fullName;
  final String? username;
  final String? avatarUrl;
  const _UserSearchResult({
    required this.id,
    required this.fullName,
    this.username,
    this.avatarUrl,
  });

  factory _UserSearchResult.fromJson(Map<String, dynamic> json) => _UserSearchResult(
        id: json['id'] as String,
        fullName: (json['full_name'] ?? json['username'] ?? '') as String,
        username: json['username'] as String?,
        avatarUrl: json['avatar_url'] as String?,
      );

  String get displayName => fullName.isNotEmpty ? fullName : (username ?? 'Unknown');
}

class _UserSearchDelegate extends SearchDelegate<_UserSearchResult?> {
  final ApiClient api;
  _UserSearchDelegate(this.api);

  @override
  List<Widget>? buildActions(BuildContext context) => [
        IconButton(onPressed: () => query = '', icon: const Icon(Icons.clear_rounded))
      ];

  @override
  Widget? buildLeading(BuildContext context) => IconButton(
        onPressed: () => close(context, null),
        icon: const Icon(Icons.arrow_back_rounded),
      );

  @override
  Widget buildResults(BuildContext context) => const SizedBox.shrink();

  @override
  Widget buildSuggestions(BuildContext context) {
    if (query.isEmpty) return const Center(child: Text('Type a name to search...'));
    return FutureBuilder<List<_UserSearchResult>>(
      future: _fetchResults(query),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator(color: AppTheme.primary));
        if (snapshot.hasError) return Center(child: Text('Error: ${snapshot.error}', style: const TextStyle(color: Colors.red)));
        final results = snapshot.data ?? [];
        if (results.isEmpty) return const Center(child: Text('No users found.'));
        return ListView.builder(
          itemCount: results.length,
          itemBuilder: (context, index) {
            final user = results[index];
            return ListTile(
              leading: CircleAvatar(
                backgroundColor: AppTheme.primary.withValues(alpha: 0.2),
                child: Text(
                  user.displayName[0].toUpperCase(),
                  style: const TextStyle(color: Colors.white),
                ),
              ),
              title: Text(user.displayName, style: const TextStyle(color: Colors.white)),
              subtitle: Text(user.username ?? '', style: const TextStyle(color: Colors.white70, fontSize: 12)),
              onTap: () => close(context, user),
            );
          },
        );
      },
    );
  }

  Future<List<_UserSearchResult>> _fetchResults(String q) async {
    try {
      final response = await api.get<Map<String, dynamic>>('/profile/search-users', queryParameters: {'q': q});
      final data = response['data'] as List? ?? [];
      return data.map((e) => _UserSearchResult.fromJson(Map<String, dynamic>.from(e))).toList();
    } catch (e) {
      return [];
    }
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) => Text(
        label,
        style: const TextStyle(
          color: Colors.white70,
          fontSize: 13,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      );
}

class _StyledField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final String? Function(String?)? validator;
  final int maxLines;

  const _StyledField({
    required this.controller,
    required this.hint,
    required this.icon,
    this.validator,
    this.maxLines = 1,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      validator: validator,
      maxLines: maxLines,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: AppTheme.textSecondary),
        prefixIcon: Icon(icon, color: AppTheme.textSecondary, size: 20),
        filled: true,
        fillColor: AppTheme.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.white12),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.white12),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
              color: AppTheme.primary.withValues(alpha: 0.8), width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.error),
        ),
      ),
    );
  }
}
