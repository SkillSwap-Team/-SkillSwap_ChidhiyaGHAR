import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/dio_client.dart';
import '../../config/api_constants.dart';

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService(ref.watch(apiProvider));
});

class NotificationService {
  final ApiClient _api;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  bool _isInitialized = false;

  NotificationService(this._api);

  /// Initialize notifications for the app.
  Future<void> initialize() async {
    if (_isInitialized) return;

    // 1. Initialize Local Notifications
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
    );

    await _localNotifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: _onDidReceiveLocalNotification,
    );

    // Create default Android Notification Channel
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'skillswap_high_importance',
      'High Importance Notifications',
      description: 'Used for important SkillSwap alerts like matches & session calls.',
      importance: Importance.high,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    // 2. Initialize Firebase Messaging (wrapped in try/catch to avoid crashes if Firebase is not fully configured natively)
    try {
      final messaging = FirebaseMessaging.instance;

      // Request permissions
      await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      // Listen for foreground FCM messages and show them via Local Notifications
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('[Notification] Foreground message received: ${message.notification?.title}');
        _showLocalNotification(message);
      });

      // Handle notification clicks when app is in background/terminated
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('[Notification] Message opened app: ${message.data}');
        // Router will handle routing based on notification payload in future phases
      });

      _isInitialized = true;
      debugPrint('[Notification] NotificationService initialized successfully');
    } catch (e) {
      debugPrint('[Notification] Firebase Messaging failed to initialize. Skipping FCM registration. Error: $e');
      _isInitialized = true; // Still mark initialized so we don't spam attempts
    }
  }

  /// Get current FCM Token and upload to backend database.
  Future<void> registerFcmToken() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        debugPrint('[Notification] Registering FCM token: $token');
        await _api.post(
          ApiConstants.notificationPrefs,
          data: {'fcmToken': token},
        );
      }
    } catch (e) {
      debugPrint('[Notification] Failed to register FCM Token: $e');
    }
  }

  /// Show a local notification for a foreground message.
  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    final androidDetails = AndroidNotificationDetails(
      'skillswap_high_importance',
      'High Importance Notifications',
      channelDescription: 'Used for important SkillSwap alerts like matches & session calls.',
      importance: Importance.max,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      details,
      payload: message.data.toString(),
    );
  }

  /// Show a local notification programmatically.
  Future<void> showNotification(String title, String body, {String? payload}) async {
    const androidDetails = AndroidNotificationDetails(
      'skillswap_high_importance',
      'High Importance Notifications',
      channelDescription: 'Used for important SkillSwap alerts like matches & session calls.',
      importance: Importance.max,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch.hashCode,
      title,
      body,
      details,
      payload: payload,
    );
  }

  /// Callback when user taps a local notification.
  void _onDidReceiveLocalNotification(NotificationResponse response) {
    debugPrint('[Notification] Local notification tapped with payload: ${response.payload}');
    // Routing based on payload will be implemented in Phase 3
  }
}
