import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:tencent_rtc_sdk/trtc_cloud.dart';
import 'package:tencent_rtc_sdk/trtc_cloud_def.dart';
import 'package:tencent_rtc_sdk/trtc_cloud_listener.dart';
import 'package:tencent_rtc_sdk/trtc_cloud_video_view.dart';
import '../../../config/app_config.dart';
import '../../../config/theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/services/socket_service.dart';
import '../../../core/utils/trtc_sig.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/neon_text.dart';

class VideoCallScreen extends ConsumerStatefulWidget {
  final String sessionId;
  const VideoCallScreen({super.key, required this.sessionId});

  @override
  ConsumerState<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends ConsumerState<VideoCallScreen> {
  late TRTCCloud _trtcCloud;
  bool _isJoined = false;
  bool _isMicOn = true;
  bool _isCameraOn = true;
  bool _isScreenSharing = false;
  TRTCCloudListener? _trtcListener;
  
  String? _remoteUserId;
  int? _localViewId;
  int? _remoteViewId;

  @override
  void initState() {
    super.initState();
    _initTRTC();
  }

  @override
  void dispose() {
    _leaveRoom();
    super.dispose();
  }

  Future<void> _initTRTC() async {
    try {
      // Request camera and microphone permissions first
      await [Permission.camera, Permission.microphone].request();

      // 1. Join room on Socket.IO for whiteboard & signaling sync
      ref.read(socketServiceProvider).emit('join_session', widget.sessionId);

      // 2. Initialize TRTC
      final cloud = await TRTCCloud.sharedInstance();
      if (cloud == null) return;
      _trtcCloud = cloud;

      // 3. Register listener object
      _trtcListener = TRTCCloudListener(
        onUserVideoAvailable: (userId, available) {
          setState(() {
            if (available) {
              _remoteUserId = userId;
            } else {
              if (_remoteUserId == userId) {
                _remoteUserId = null;
                _remoteViewId = null;
              }
            }
          });
        },
        onError: (errCode, errMsg) {
          debugPrint('[TRTC] error: $errCode, msg: $errMsg');
        },
      );
      _trtcCloud.registerListener(_trtcListener!);

      // 4. Resolve current user credentials
      final currentUser = ref.read(authProvider).user;
      final userId = currentUser?.id ?? 'user_${DateTime.now().millisecondsSinceEpoch}';

      // 5. Generate signature locally
      final userSig = GenerateTestUserSig(
        sdkAppId: AppConfig.trtcSdkAppId,
        secretKey: AppConfig.trtcSecretKey,
      ).genSig(userId: userId);

      // 6. Generate a stable 32-bit positive integer room ID from the sessionId UUID
      int hash = 0;
      for (int i = 0; i < widget.sessionId.length; i++) {
        hash = (31 * hash + widget.sessionId.codeUnitAt(i)) & 0x7FFFFFFF;
      }
      final roomId = hash;

      _trtcCloud.enterRoom(
        TRTCParams(
          sdkAppId: AppConfig.trtcSdkAppId,
          userId: userId,
          userSig: userSig,
          roomId: roomId,
          strRoomId: widget.sessionId,
          role: TRTCRoleType.anchor,
        ),
        TRTCAppScene.videoCall,
      );

      // 7. Publish local audio stream
      _trtcCloud.startLocalAudio(TRTCAudioQuality.defaultMode);
      
      setState(() {
        _isJoined = true;
      });
    } catch (e) {
      debugPrint('[TRTC] Error initializing call: $e');
    }
  }

  void _leaveRoom() {
    try {
      if (_isScreenSharing) {
        _trtcCloud.stopScreenCapture();
      }
      _trtcCloud.stopLocalAudio();
      _trtcCloud.stopLocalPreview();
      _trtcCloud.exitRoom();
      if (_trtcListener != null) {
        _trtcCloud.unRegisterListener(_trtcListener!);
      }
    } catch (e) {
      debugPrint('[TRTC] Error leaving room: $e');
    }
  }

  void _toggleMic() {
    if (_isMicOn) {
      _trtcCloud.muteLocalAudio(true);
    } else {
      _trtcCloud.muteLocalAudio(false);
    }
    setState(() => _isMicOn = !_isMicOn);
  }

  void _toggleCamera() {
    if (_isCameraOn) {
      _trtcCloud.stopLocalPreview();
      _trtcCloud.muteLocalVideo(TRTCVideoStreamType.big, true);
      setState(() {
        _isCameraOn = false;
        _localViewId = null;
      });
    } else {
      _trtcCloud.muteLocalVideo(TRTCVideoStreamType.big, false);
      setState(() {
        _isCameraOn = true;
      });
    }
  }

  void _toggleScreenShare() {
    try {
      if (_isScreenSharing) {
        _trtcCloud.stopScreenCapture();
        setState(() {
          _isScreenSharing = false;
        });
      } else {
        _trtcCloud.startScreenCapture(
          null,
          TRTCVideoStreamType.sub,
          TRTCVideoEncParam(
            videoResolution: TRTCVideoResolution.res_1280_720,
            videoFps: 15,
            videoBitrate: 1600,
            videoResolutionMode: TRTCVideoResolutionMode.portrait,
          ),
        );
        setState(() {
          _isScreenSharing = true;
        });
      }
    } catch (e) {
      debugPrint('[TRTC] Error toggling screen share: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_isJoined) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const CircularProgressIndicator(),
                const SizedBox(height: 24),
                NeonText(text: 'Connecting to TRTC Room...', fontSize: 18, glowColor: AppTheme.secondary),
              ],
            ),
          ),
        ),
      );
    }

    return SafeArea(
      child: Scaffold(
        backgroundColor: AppTheme.background,
        body: Column(
          children: [
            // ── Video area ────────────────────────────────────────
            Expanded(
              child: Stack(
                children: [
                  // Remote view fills the video area
                  if (_remoteUserId != null)
                    Positioned.fill(
                      child: TRTCCloudVideoView(
                        key: ValueKey('remote_$_remoteUserId'),
                        onViewCreated: (viewId) {
                          _remoteViewId = viewId;
                          _trtcCloud.startRemoteView(
                            _remoteUserId!,
                            TRTCVideoStreamType.big,
                            viewId,
                          );
                        },
                      ),
                    )
                  else
                    Positioned.fill(
                      child: Container(
                        color: Colors.black87,
                        child: const Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.person_outline_rounded, size: 72, color: AppTheme.textSecondary),
                              SizedBox(height: 16),
                              Text(
                                'Waiting for peer...',
                                style: TextStyle(color: AppTheme.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                  // Local PiP window
                  if (_isCameraOn)
                    Positioned(
                      top: 16,
                      right: 16,
                      width: 110,
                      height: 160,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                        child: Container(
                          color: Colors.black,
                          child: TRTCCloudVideoView(
                            key: const ValueKey('local_preview'),
                            onViewCreated: (viewId) {
                              _localViewId = viewId;
                              _trtcCloud.startLocalPreview(true, viewId);
                            },
                          ),
                        ),
                      ),
                    ),

                  // Whiteboard button
                  Positioned(
                    top: 16,
                    left: 16,
                    child: AppButton(
                      text: 'Whiteboard',
                      icon: Icons.gesture_rounded,
                      isOutlined: true,
                      onPressed: () {
                        context.push('/sessions/${widget.sessionId}/whiteboard');
                      },
                    ),
                  ),
                ],
              ),
            ),

            // ── Bottom controls ─────────────────────────────────
            Container(
              padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.4),
                    blurRadius: 20,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Mic Control
                  _ControlButton(
                    icon: _isMicOn ? Icons.mic_rounded : Icons.mic_off_rounded,
                    label: _isMicOn ? 'Mic' : 'Muted',
                    onPressed: _toggleMic,
                    active: _isMicOn,
                  ),
                  const SizedBox(width: 16),

                  // Camera Control
                  _ControlButton(
                    icon: _isCameraOn ? Icons.videocam_rounded : Icons.videocam_off_rounded,
                    label: _isCameraOn ? 'Camera' : 'Off',
                    onPressed: _toggleCamera,
                    active: _isCameraOn,
                  ),
                  const SizedBox(width: 16),

                  // Screen Share Control
                  _ControlButton(
                    icon: _isScreenSharing ? Icons.stop_screen_share_rounded : Icons.screen_share_rounded,
                    label: _isScreenSharing ? 'Stop Share' : 'Share',
                    onPressed: _toggleScreenShare,
                    active: _isScreenSharing,
                    activeColor: AppTheme.secondary,
                  ),
                  const SizedBox(width: 16),

                  // End Call Button
                  _EndCallButton(
                    onPressed: () => context.pop(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Control Buttons ───────────────────────────────────────────────────────────

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  final bool active;
  final Color? activeColor;

  const _ControlButton({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.active = true,
    this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    final bg = active
        ? (activeColor ?? Colors.white).withValues(alpha: 0.15)
        : Colors.red.withValues(alpha: 0.8);
    final fg = active ? Colors.white : Colors.white;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          onPressed: onPressed,
          iconSize: 28,
          icon: Icon(icon, color: fg),
          style: IconButton.styleFrom(
            backgroundColor: bg,
            padding: const EdgeInsets.all(12),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: fg.withValues(alpha: 0.85),
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _EndCallButton extends StatelessWidget {
  final VoidCallback onPressed;
  const _EndCallButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          onPressed: onPressed,
          iconSize: 28,
          icon: const Icon(Icons.call_end_rounded),
          color: Colors.white,
          style: IconButton.styleFrom(
            backgroundColor: Colors.red.shade700,
            padding: const EdgeInsets.all(12),
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'End',
          style: TextStyle(
            color: Colors.white70,
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
