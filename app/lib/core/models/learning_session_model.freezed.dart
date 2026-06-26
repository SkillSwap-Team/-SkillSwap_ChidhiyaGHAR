// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'learning_session_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

LearningSessionModel _$LearningSessionModelFromJson(Map<String, dynamic> json) {
  return _LearningSessionModel.fromJson(json);
}

/// @nodoc
mixin _$LearningSessionModel {
  String get id => throw _privateConstructorUsedError;
  @JsonKey(name: 'match_id')
  String? get matchId => throw _privateConstructorUsedError;
  @JsonKey(name: 'host_id')
  String? get hostId => throw _privateConstructorUsedError;
  @JsonKey(name: 'participant_id')
  String? get participantId => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  @JsonKey(name: 'scheduled_at')
  DateTime get scheduledAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'duration_minutes')
  int get durationMinutes => throw _privateConstructorUsedError;
  @JsonKey(name: 'actual_duration_minutes')
  int? get actualDurationMinutes => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  @JsonKey(name: 'agora_channel')
  String? get agoraChannel => throw _privateConstructorUsedError;
  @JsonKey(name: 'session_notes')
  String? get sessionNotes => throw _privateConstructorUsedError;
  @JsonKey(name: 'host_attendance')
  bool get hostAttendance => throw _privateConstructorUsedError;
  @JsonKey(name: 'participant_attendance')
  bool get participantAttendance => throw _privateConstructorUsedError;
  @JsonKey(name: 'created_at')
  DateTime? get createdAt =>
      throw _privateConstructorUsedError; // Nested join data from Supabase
  @JsonKey(includeFromJson: false, includeToJson: false)
  dynamic get host => throw _privateConstructorUsedError;
  @JsonKey(includeFromJson: false, includeToJson: false)
  dynamic get participant => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $LearningSessionModelCopyWith<LearningSessionModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LearningSessionModelCopyWith<$Res> {
  factory $LearningSessionModelCopyWith(LearningSessionModel value,
          $Res Function(LearningSessionModel) then) =
      _$LearningSessionModelCopyWithImpl<$Res, LearningSessionModel>;
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'match_id') String? matchId,
      @JsonKey(name: 'host_id') String? hostId,
      @JsonKey(name: 'participant_id') String? participantId,
      String title,
      String? description,
      @JsonKey(name: 'scheduled_at') DateTime scheduledAt,
      @JsonKey(name: 'duration_minutes') int durationMinutes,
      @JsonKey(name: 'actual_duration_minutes') int? actualDurationMinutes,
      String status,
      @JsonKey(name: 'agora_channel') String? agoraChannel,
      @JsonKey(name: 'session_notes') String? sessionNotes,
      @JsonKey(name: 'host_attendance') bool hostAttendance,
      @JsonKey(name: 'participant_attendance') bool participantAttendance,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(includeFromJson: false, includeToJson: false) dynamic host,
      @JsonKey(includeFromJson: false, includeToJson: false)
      dynamic participant});
}

/// @nodoc
class _$LearningSessionModelCopyWithImpl<$Res,
        $Val extends LearningSessionModel>
    implements $LearningSessionModelCopyWith<$Res> {
  _$LearningSessionModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? matchId = freezed,
    Object? hostId = freezed,
    Object? participantId = freezed,
    Object? title = null,
    Object? description = freezed,
    Object? scheduledAt = null,
    Object? durationMinutes = null,
    Object? actualDurationMinutes = freezed,
    Object? status = null,
    Object? agoraChannel = freezed,
    Object? sessionNotes = freezed,
    Object? hostAttendance = null,
    Object? participantAttendance = null,
    Object? createdAt = freezed,
    Object? host = freezed,
    Object? participant = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      matchId: freezed == matchId
          ? _value.matchId
          : matchId // ignore: cast_nullable_to_non_nullable
              as String?,
      hostId: freezed == hostId
          ? _value.hostId
          : hostId // ignore: cast_nullable_to_non_nullable
              as String?,
      participantId: freezed == participantId
          ? _value.participantId
          : participantId // ignore: cast_nullable_to_non_nullable
              as String?,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      scheduledAt: null == scheduledAt
          ? _value.scheduledAt
          : scheduledAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      actualDurationMinutes: freezed == actualDurationMinutes
          ? _value.actualDurationMinutes
          : actualDurationMinutes // ignore: cast_nullable_to_non_nullable
              as int?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      agoraChannel: freezed == agoraChannel
          ? _value.agoraChannel
          : agoraChannel // ignore: cast_nullable_to_non_nullable
              as String?,
      sessionNotes: freezed == sessionNotes
          ? _value.sessionNotes
          : sessionNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      hostAttendance: null == hostAttendance
          ? _value.hostAttendance
          : hostAttendance // ignore: cast_nullable_to_non_nullable
              as bool,
      participantAttendance: null == participantAttendance
          ? _value.participantAttendance
          : participantAttendance // ignore: cast_nullable_to_non_nullable
              as bool,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      host: freezed == host
          ? _value.host
          : host // ignore: cast_nullable_to_non_nullable
              as dynamic,
      participant: freezed == participant
          ? _value.participant
          : participant // ignore: cast_nullable_to_non_nullable
              as dynamic,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$LearningSessionModelImplCopyWith<$Res>
    implements $LearningSessionModelCopyWith<$Res> {
  factory _$$LearningSessionModelImplCopyWith(_$LearningSessionModelImpl value,
          $Res Function(_$LearningSessionModelImpl) then) =
      __$$LearningSessionModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'match_id') String? matchId,
      @JsonKey(name: 'host_id') String? hostId,
      @JsonKey(name: 'participant_id') String? participantId,
      String title,
      String? description,
      @JsonKey(name: 'scheduled_at') DateTime scheduledAt,
      @JsonKey(name: 'duration_minutes') int durationMinutes,
      @JsonKey(name: 'actual_duration_minutes') int? actualDurationMinutes,
      String status,
      @JsonKey(name: 'agora_channel') String? agoraChannel,
      @JsonKey(name: 'session_notes') String? sessionNotes,
      @JsonKey(name: 'host_attendance') bool hostAttendance,
      @JsonKey(name: 'participant_attendance') bool participantAttendance,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(includeFromJson: false, includeToJson: false) dynamic host,
      @JsonKey(includeFromJson: false, includeToJson: false)
      dynamic participant});
}

/// @nodoc
class __$$LearningSessionModelImplCopyWithImpl<$Res>
    extends _$LearningSessionModelCopyWithImpl<$Res, _$LearningSessionModelImpl>
    implements _$$LearningSessionModelImplCopyWith<$Res> {
  __$$LearningSessionModelImplCopyWithImpl(_$LearningSessionModelImpl _value,
      $Res Function(_$LearningSessionModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? matchId = freezed,
    Object? hostId = freezed,
    Object? participantId = freezed,
    Object? title = null,
    Object? description = freezed,
    Object? scheduledAt = null,
    Object? durationMinutes = null,
    Object? actualDurationMinutes = freezed,
    Object? status = null,
    Object? agoraChannel = freezed,
    Object? sessionNotes = freezed,
    Object? hostAttendance = null,
    Object? participantAttendance = null,
    Object? createdAt = freezed,
    Object? host = freezed,
    Object? participant = freezed,
  }) {
    return _then(_$LearningSessionModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      matchId: freezed == matchId
          ? _value.matchId
          : matchId // ignore: cast_nullable_to_non_nullable
              as String?,
      hostId: freezed == hostId
          ? _value.hostId
          : hostId // ignore: cast_nullable_to_non_nullable
              as String?,
      participantId: freezed == participantId
          ? _value.participantId
          : participantId // ignore: cast_nullable_to_non_nullable
              as String?,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      scheduledAt: null == scheduledAt
          ? _value.scheduledAt
          : scheduledAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      actualDurationMinutes: freezed == actualDurationMinutes
          ? _value.actualDurationMinutes
          : actualDurationMinutes // ignore: cast_nullable_to_non_nullable
              as int?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      agoraChannel: freezed == agoraChannel
          ? _value.agoraChannel
          : agoraChannel // ignore: cast_nullable_to_non_nullable
              as String?,
      sessionNotes: freezed == sessionNotes
          ? _value.sessionNotes
          : sessionNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      hostAttendance: null == hostAttendance
          ? _value.hostAttendance
          : hostAttendance // ignore: cast_nullable_to_non_nullable
              as bool,
      participantAttendance: null == participantAttendance
          ? _value.participantAttendance
          : participantAttendance // ignore: cast_nullable_to_non_nullable
              as bool,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      host: freezed == host
          ? _value.host
          : host // ignore: cast_nullable_to_non_nullable
              as dynamic,
      participant: freezed == participant
          ? _value.participant
          : participant // ignore: cast_nullable_to_non_nullable
              as dynamic,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$LearningSessionModelImpl implements _LearningSessionModel {
  const _$LearningSessionModelImpl(
      {required this.id,
      @JsonKey(name: 'match_id') this.matchId,
      @JsonKey(name: 'host_id') this.hostId,
      @JsonKey(name: 'participant_id') this.participantId,
      this.title = 'Session',
      this.description,
      @JsonKey(name: 'scheduled_at') required this.scheduledAt,
      @JsonKey(name: 'duration_minutes') this.durationMinutes = 60,
      @JsonKey(name: 'actual_duration_minutes') this.actualDurationMinutes,
      this.status = 'pending',
      @JsonKey(name: 'agora_channel') this.agoraChannel,
      @JsonKey(name: 'session_notes') this.sessionNotes,
      @JsonKey(name: 'host_attendance') this.hostAttendance = false,
      @JsonKey(name: 'participant_attendance')
      this.participantAttendance = false,
      @JsonKey(name: 'created_at') this.createdAt,
      @JsonKey(includeFromJson: false, includeToJson: false) this.host,
      @JsonKey(includeFromJson: false, includeToJson: false) this.participant});

  factory _$LearningSessionModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$LearningSessionModelImplFromJson(json);

  @override
  final String id;
  @override
  @JsonKey(name: 'match_id')
  final String? matchId;
  @override
  @JsonKey(name: 'host_id')
  final String? hostId;
  @override
  @JsonKey(name: 'participant_id')
  final String? participantId;
  @override
  @JsonKey()
  final String title;
  @override
  final String? description;
  @override
  @JsonKey(name: 'scheduled_at')
  final DateTime scheduledAt;
  @override
  @JsonKey(name: 'duration_minutes')
  final int durationMinutes;
  @override
  @JsonKey(name: 'actual_duration_minutes')
  final int? actualDurationMinutes;
  @override
  @JsonKey()
  final String status;
  @override
  @JsonKey(name: 'agora_channel')
  final String? agoraChannel;
  @override
  @JsonKey(name: 'session_notes')
  final String? sessionNotes;
  @override
  @JsonKey(name: 'host_attendance')
  final bool hostAttendance;
  @override
  @JsonKey(name: 'participant_attendance')
  final bool participantAttendance;
  @override
  @JsonKey(name: 'created_at')
  final DateTime? createdAt;
// Nested join data from Supabase
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  final dynamic host;
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  final dynamic participant;

  @override
  String toString() {
    return 'LearningSessionModel(id: $id, matchId: $matchId, hostId: $hostId, participantId: $participantId, title: $title, description: $description, scheduledAt: $scheduledAt, durationMinutes: $durationMinutes, actualDurationMinutes: $actualDurationMinutes, status: $status, agoraChannel: $agoraChannel, sessionNotes: $sessionNotes, hostAttendance: $hostAttendance, participantAttendance: $participantAttendance, createdAt: $createdAt, host: $host, participant: $participant)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LearningSessionModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.matchId, matchId) || other.matchId == matchId) &&
            (identical(other.hostId, hostId) || other.hostId == hostId) &&
            (identical(other.participantId, participantId) ||
                other.participantId == participantId) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.scheduledAt, scheduledAt) ||
                other.scheduledAt == scheduledAt) &&
            (identical(other.durationMinutes, durationMinutes) ||
                other.durationMinutes == durationMinutes) &&
            (identical(other.actualDurationMinutes, actualDurationMinutes) ||
                other.actualDurationMinutes == actualDurationMinutes) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.agoraChannel, agoraChannel) ||
                other.agoraChannel == agoraChannel) &&
            (identical(other.sessionNotes, sessionNotes) ||
                other.sessionNotes == sessionNotes) &&
            (identical(other.hostAttendance, hostAttendance) ||
                other.hostAttendance == hostAttendance) &&
            (identical(other.participantAttendance, participantAttendance) ||
                other.participantAttendance == participantAttendance) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            const DeepCollectionEquality().equals(other.host, host) &&
            const DeepCollectionEquality()
                .equals(other.participant, participant));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      matchId,
      hostId,
      participantId,
      title,
      description,
      scheduledAt,
      durationMinutes,
      actualDurationMinutes,
      status,
      agoraChannel,
      sessionNotes,
      hostAttendance,
      participantAttendance,
      createdAt,
      const DeepCollectionEquality().hash(host),
      const DeepCollectionEquality().hash(participant));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$LearningSessionModelImplCopyWith<_$LearningSessionModelImpl>
      get copyWith =>
          __$$LearningSessionModelImplCopyWithImpl<_$LearningSessionModelImpl>(
              this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$LearningSessionModelImplToJson(
      this,
    );
  }
}

abstract class _LearningSessionModel implements LearningSessionModel {
  const factory _LearningSessionModel(
      {required final String id,
      @JsonKey(name: 'match_id') final String? matchId,
      @JsonKey(name: 'host_id') final String? hostId,
      @JsonKey(name: 'participant_id') final String? participantId,
      final String title,
      final String? description,
      @JsonKey(name: 'scheduled_at') required final DateTime scheduledAt,
      @JsonKey(name: 'duration_minutes') final int durationMinutes,
      @JsonKey(name: 'actual_duration_minutes')
      final int? actualDurationMinutes,
      final String status,
      @JsonKey(name: 'agora_channel') final String? agoraChannel,
      @JsonKey(name: 'session_notes') final String? sessionNotes,
      @JsonKey(name: 'host_attendance') final bool hostAttendance,
      @JsonKey(name: 'participant_attendance') final bool participantAttendance,
      @JsonKey(name: 'created_at') final DateTime? createdAt,
      @JsonKey(includeFromJson: false, includeToJson: false) final dynamic host,
      @JsonKey(includeFromJson: false, includeToJson: false)
      final dynamic participant}) = _$LearningSessionModelImpl;

  factory _LearningSessionModel.fromJson(Map<String, dynamic> json) =
      _$LearningSessionModelImpl.fromJson;

  @override
  String get id;
  @override
  @JsonKey(name: 'match_id')
  String? get matchId;
  @override
  @JsonKey(name: 'host_id')
  String? get hostId;
  @override
  @JsonKey(name: 'participant_id')
  String? get participantId;
  @override
  String get title;
  @override
  String? get description;
  @override
  @JsonKey(name: 'scheduled_at')
  DateTime get scheduledAt;
  @override
  @JsonKey(name: 'duration_minutes')
  int get durationMinutes;
  @override
  @JsonKey(name: 'actual_duration_minutes')
  int? get actualDurationMinutes;
  @override
  String get status;
  @override
  @JsonKey(name: 'agora_channel')
  String? get agoraChannel;
  @override
  @JsonKey(name: 'session_notes')
  String? get sessionNotes;
  @override
  @JsonKey(name: 'host_attendance')
  bool get hostAttendance;
  @override
  @JsonKey(name: 'participant_attendance')
  bool get participantAttendance;
  @override
  @JsonKey(name: 'created_at')
  DateTime? get createdAt;
  @override // Nested join data from Supabase
  @JsonKey(includeFromJson: false, includeToJson: false)
  dynamic get host;
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  dynamic get participant;
  @override
  @JsonKey(ignore: true)
  _$$LearningSessionModelImplCopyWith<_$LearningSessionModelImpl>
      get copyWith => throw _privateConstructorUsedError;
}
