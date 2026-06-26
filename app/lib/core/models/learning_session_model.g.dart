// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'learning_session_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$LearningSessionModelImpl _$$LearningSessionModelImplFromJson(
        Map<String, dynamic> json) =>
    _$LearningSessionModelImpl(
      id: json['id'] as String,
      matchId: json['match_id'] as String?,
      hostId: json['host_id'] as String?,
      participantId: json['participant_id'] as String?,
      title: json['title'] as String? ?? 'Session',
      description: json['description'] as String?,
      scheduledAt: DateTime.parse(json['scheduled_at'] as String),
      durationMinutes: (json['duration_minutes'] as num?)?.toInt() ?? 60,
      actualDurationMinutes: (json['actual_duration_minutes'] as num?)?.toInt(),
      status: json['status'] as String? ?? 'pending',
      agoraChannel: json['agora_channel'] as String?,
      sessionNotes: json['session_notes'] as String?,
      hostAttendance: json['host_attendance'] as bool? ?? false,
      participantAttendance: json['participant_attendance'] as bool? ?? false,
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
    );

Map<String, dynamic> _$$LearningSessionModelImplToJson(
        _$LearningSessionModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'match_id': instance.matchId,
      'host_id': instance.hostId,
      'participant_id': instance.participantId,
      'title': instance.title,
      'description': instance.description,
      'scheduled_at': instance.scheduledAt.toIso8601String(),
      'duration_minutes': instance.durationMinutes,
      'actual_duration_minutes': instance.actualDurationMinutes,
      'status': instance.status,
      'agora_channel': instance.agoraChannel,
      'session_notes': instance.sessionNotes,
      'host_attendance': instance.hostAttendance,
      'participant_attendance': instance.participantAttendance,
      'created_at': instance.createdAt?.toIso8601String(),
    };
