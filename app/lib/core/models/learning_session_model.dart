import 'package:freezed_annotation/freezed_annotation.dart';

part 'learning_session_model.freezed.dart';
part 'learning_session_model.g.dart';

@freezed
class LearningSessionModel with _$LearningSessionModel {
  const factory LearningSessionModel({
    required String id,
    @JsonKey(name: 'match_id') String? matchId,
    @JsonKey(name: 'host_id') String? hostId,
    @JsonKey(name: 'participant_id') String? participantId,
    @Default('Session') String title,
    String? description,
    @JsonKey(name: 'scheduled_at') required DateTime scheduledAt,
    @JsonKey(name: 'duration_minutes') @Default(60) int durationMinutes,
    @JsonKey(name: 'actual_duration_minutes') int? actualDurationMinutes,
    @Default('pending') String status,
    @JsonKey(name: 'agora_channel') String? agoraChannel,
    @JsonKey(name: 'session_notes') String? sessionNotes,
    @JsonKey(name: 'host_attendance') @Default(false) bool hostAttendance,
    @JsonKey(name: 'participant_attendance') @Default(false) bool participantAttendance,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    // Nested join data from Supabase
    @JsonKey(includeFromJson: false, includeToJson: false) dynamic host,
    @JsonKey(includeFromJson: false, includeToJson: false) dynamic participant,
  }) = _LearningSessionModel;

  factory LearningSessionModel.fromJson(Map<String, dynamic> json) =>
      _$LearningSessionModelFromJson(json);
}
