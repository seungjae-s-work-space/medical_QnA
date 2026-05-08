import 'dart:async';
import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../providers/auth_provider.dart' as app_auth;
import '../screens/admin/admin_chat_screen.dart';
import '../screens/user/chat_screen.dart';
import 'app_navigation.dart';
import 'device_token_record.dart';
import 'firestore_service.dart';
import 'notification_navigation.dart';

// 모바일 전용 (Windows에서는 사용 안함)
import 'package:firebase_messaging/firebase_messaging.dart'
    if (dart.library.io) 'package:firebase_messaging/firebase_messaging.dart';

// 로컬 알림 (Android 채널 생성용)
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

// Windows 전용
import 'package:local_notifier/local_notifier.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirestoreService _firestoreService = FirestoreService();

  // 모바일 전용
  FirebaseMessaging? _messaging;
  FlutterLocalNotificationsPlugin? _localNotifications;
  StreamSubscription<String>? _tokenRefreshSubscription;
  StreamSubscription<RemoteMessage>? _foregroundMessageSubscription;
  StreamSubscription<RemoteMessage>? _messageOpenedSubscription;

  // Windows 전용
  StreamSubscription? _conversationSubscription;
  int _lastUnreadCount = 0;

  /// 플랫폼에 맞게 초기화
  Future<void> initialize() async {
    if (Platform.isWindows) {
      await _initializeWindows();
    } else if (Platform.isAndroid || Platform.isIOS) {
      await _initializeMobile();
    }
  }

  // ==================== Windows 전용 ====================

  /// Windows 알림 초기화
  Future<void> _initializeWindows() async {
    await localNotifier.setup(
      appName: '난임&상담톡',
      shortcutPolicy: ShortcutPolicy.requireCreate,
    );

    if (kDebugMode) {
      print('Windows 알림 초기화 완료');
    }
  }

  /// Windows: 토스트 알림 표시
  void showWindowsNotification({
    required String title,
    required String body,
  }) {
    if (!Platform.isWindows) return;

    final notification = LocalNotification(
      title: title,
      body: body,
    );
    notification.show();
  }

  /// Windows용: Firestore 리스너 시작 (관리자용 - 새 질문 감지)
  void startListeningForNewMessages() {
    if (!Platform.isWindows) return;

    final user = _auth.currentUser;
    if (user == null) return;

    // 모든 대화방의 unreadByAdmin 변화 감지
    _conversationSubscription = _firestore
        .collection('conversations')
        .orderBy('lastMessageAt', descending: true)
        .snapshots()
        .listen((snapshot) {
      int totalUnread = 0;
      String? latestUserName;
      String? latestMessage;

      for (var doc in snapshot.docs) {
        final data = doc.data();
        final unread = data['unreadByAdmin'] ?? 0;
        totalUnread += unread as int;

        // 가장 최근 읽지 않은 메시지 정보
        if (unread > 0 && latestUserName == null) {
          latestUserName = data['userName'] ?? '익명';
          latestMessage = data['lastMessage'] ?? '새 메시지';
        }
      }

      // 새 메시지가 도착했을 때만 알림
      if (totalUnread > _lastUnreadCount && latestUserName != null) {
        showWindowsNotification(
          title: '$latestUserName님의 새 질문',
          body: latestMessage ?? '새 메시지가 도착했습니다',
        );
      }

      _lastUnreadCount = totalUnread;
    });

    if (kDebugMode) {
      print('Windows: 새 메시지 리스너 시작');
    }
  }

  /// Windows용: 리스너 중지
  void stopListening() {
    _conversationSubscription?.cancel();
    _conversationSubscription = null;
  }

  // ==================== 모바일 전용 (Android/iOS) ====================

  /// 모바일 FCM 초기화
  Future<void> _initializeMobile() async {
    _messaging = FirebaseMessaging.instance;

    // 알림 권한 요청
    await _requestPermission();

    // Android 알림 채널 설정
    await _setupAndroidNotificationChannels();

    // 토큰 가져오기 및 저장
    await _saveToken();

    // 토큰 갱신 리스너
    await _tokenRefreshSubscription?.cancel();
    _tokenRefreshSubscription = _messaging!.onTokenRefresh.listen(_updateToken);

    // 포그라운드 메시지 처리
    await _foregroundMessageSubscription?.cancel();
    _foregroundMessageSubscription =
        FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // 백그라운드에서 알림 탭해서 앱 열었을 때
    await _messageOpenedSubscription?.cancel();
    _messageOpenedSubscription =
        FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);

    // 앱이 종료된 상태에서 알림 탭해서 열렸을 때
    final initialMessage = await _messaging!.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageOpenedApp(initialMessage);
    }
  }

  /// Android 알림 채널 설정
  Future<void> _setupAndroidNotificationChannels() async {
    if (!Platform.isAndroid) return;

    _localNotifications = FlutterLocalNotificationsPlugin();

    // 채팅 메시지 채널
    const chatChannel = AndroidNotificationChannel(
      'chat_messages',
      '채팅 알림',
      description: '새 메시지가 도착하면 알림을 받습니다',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    // 콘텐츠 채널 (뉴스/공지/백과/영상)
    const contentChannel = AndroidNotificationChannel(
      'content',
      '콘텐츠 알림',
      description: '새로운 뉴스/공지/백과/영상이 등록되면 알림을 받습니다',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    // 구독 채널
    const subscriptionChannel = AndroidNotificationChannel(
      'subscription',
      '구독 알림',
      description: '구독 결제, 만료 등 구독 관련 알림을 받습니다',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    final androidPlugin = _localNotifications!
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();

    if (androidPlugin != null) {
      await androidPlugin.createNotificationChannel(chatChannel);
      await androidPlugin.createNotificationChannel(contentChannel);
      await androidPlugin.createNotificationChannel(subscriptionChannel);
      if (kDebugMode) {
        print('Android 알림 채널 생성 완료');
      }
    }
  }

  /// 모바일: 알림 권한 요청
  Future<void> _requestPermission() async {
    if (_messaging == null) return;

    final settings = await _messaging!.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    if (kDebugMode) {
      print('알림 권한 상태: ${settings.authorizationStatus}');
    }
  }

  /// 모바일: FCM 토큰 저장
  Future<void> _saveToken() async {
    if (_messaging == null) return;

    final user = _auth.currentUser;
    if (user == null) return;

    if (Platform.isIOS) {
      final apnsToken = await _messaging!.getAPNSToken();
      if (apnsToken == null) {
        if (kDebugMode) {
          print('APNs 토큰을 아직 받지 못함');
        }
        return;
      }
    }

    final token = await _messaging!.getToken();
    if (token != null) {
      await _registerDeviceToken(token);
    }
  }

  /// 모바일: 토큰 Firestore에 업데이트
  Future<void> _updateToken(String token) async {
    await _registerDeviceToken(token);
  }

  Future<String> _getOrCreateDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(DeviceTokenRecord.deviceIdPreferenceKey);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final deviceId = const Uuid().v4();
    await prefs.setString(DeviceTokenRecord.deviceIdPreferenceKey, deviceId);
    return deviceId;
  }

  Future<String?> _getExistingDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(DeviceTokenRecord.deviceIdPreferenceKey);
    return existing == null || existing.isEmpty ? null : existing;
  }

  Future<void> _registerDeviceToken(String token) async {
    final user = _auth.currentUser;
    if (user == null) return;

    final platform = Platform.isIOS ? 'ios' : 'android';
    final updatedAt = FieldValue.serverTimestamp();
    final userRef = _firestore.collection('users').doc(user.uid);

    try {
      // 기존 앱/Functions 경로와의 호환을 먼저 보장한다.
      await userRef.set({
        'fcmToken': token,
        'platform': platform,
        'tokenUpdatedAt': updatedAt,
      }, SetOptions(merge: true));
    } catch (e) {
      if (kDebugMode) {
        print('FCM 기존 토큰 저장 실패: $e');
      }
    }

    try {
      final deviceId = await _getOrCreateDeviceId();
      final packageInfo = await PackageInfo.fromPlatform();
      await _firestore.doc(DeviceTokenRecord.documentPath(deviceId)).set(
            DeviceTokenRecord.buildData(
              deviceId: deviceId,
              userId: user.uid,
              fcmToken: token,
              platform: platform,
              appVersion: packageInfo.version,
              buildNumber: packageInfo.buildNumber,
              updatedAt: updatedAt,
            ),
            SetOptions(merge: true),
          );

      await userRef.set({
        'lastDeviceId': deviceId,
      }, SetOptions(merge: true));

      if (kDebugMode) {
        print('FCM 기기 토큰 저장 완료: $deviceId / ${token.substring(0, 20)}...');
      }
    } catch (e) {
      if (kDebugMode) {
        print('FCM 기기 토큰 저장 실패: $e');
      }
    }
  }

  /// 모바일: 포그라운드 메시지 처리
  void _handleForegroundMessage(RemoteMessage message) {
    if (kDebugMode) {
      print('포그라운드 메시지 수신: ${message.notification?.title}');
    }
  }

  /// 모바일: 백그라운드에서 알림 탭해서 앱 열었을 때
  void _handleMessageOpenedApp(RemoteMessage message) {
    if (kDebugMode) {
      print('알림 탭해서 앱 열림: ${message.data}');
    }

    final target = NotificationNavigationTarget.fromData(message.data);
    if (target == null) return;

    _openChatFromNotification(target);
  }

  Future<void> _openChatFromNotification(
    NotificationNavigationTarget target,
  ) async {
    final navigator = appNavigatorKey.currentState;
    final context = appNavigatorKey.currentContext;
    if (navigator == null || context == null) return;

    final authProvider = context.read<app_auth.AuthProvider>();
    final user = authProvider.currentUser;
    if (user == null || authProvider.isGuest) return;

    if (user.isAdmin) {
      final conversation =
          await _firestoreService.getConversation(target.conversationId);
      if (conversation == null) return;

      navigator.push(
        MaterialPageRoute(
          builder: (_) => AdminChatScreen(conversation: conversation),
        ),
      );
      return;
    }

    navigator.push(
      MaterialPageRoute(
        builder: (_) => ChatScreen(
          initialConversationId: target.conversationId,
        ),
      ),
    );
  }

  // ==================== 공통 ====================

  /// 로그아웃 시 토큰 삭제 (모바일) 및 리스너 중지 (Windows)
  Future<void> removeToken() async {
    if (Platform.isWindows) {
      stopListening();
      return;
    }

    final user = _auth.currentUser;
    if (user == null) return;

    try {
      await _tokenRefreshSubscription?.cancel();
      await _foregroundMessageSubscription?.cancel();
      await _messageOpenedSubscription?.cancel();
      _tokenRefreshSubscription = null;
      _foregroundMessageSubscription = null;
      _messageOpenedSubscription = null;

      final token = await _messaging?.getToken();
      final deviceId = await _getExistingDeviceId();
      if (deviceId != null) {
        await _firestore.doc(DeviceTokenRecord.documentPath(deviceId)).delete();
      }

      if (token != null) {
        final userRef = _firestore.collection('users').doc(user.uid);
        final userSnapshot = await userRef.get();
        if (userSnapshot.data()?['fcmToken'] == token) {
          await userRef.update({
            'fcmToken': FieldValue.delete(),
            'tokenUpdatedAt': FieldValue.delete(),
            'lastDeviceId': FieldValue.delete(),
          });
        }
        await _messaging?.deleteToken();
      }
    } catch (e) {
      if (kDebugMode) {
        print('FCM 기기 토큰 삭제 실패: $e');
      }
    }
  }

  /// 현재 토큰 가져오기 (모바일 전용)
  Future<String?> getToken() async {
    if (Platform.isWindows || _messaging == null) return null;
    return await _messaging!.getToken();
  }

  /// 알림 설정 상태 가져오기
  Future<bool> getNotificationEnabled() async {
    final user = _auth.currentUser;
    if (user == null) return true;

    try {
      final doc = await _firestore.collection('users').doc(user.uid).get();
      if (doc.exists) {
        return doc.data()?['notificationsEnabled'] ?? true;
      }
      return true;
    } catch (e) {
      if (kDebugMode) {
        print('알림 설정 조회 실패: $e');
      }
      return true;
    }
  }

  /// 알림 설정 변경
  Future<void> setNotificationEnabled(bool enabled) async {
    final user = _auth.currentUser;
    if (user == null) return;

    try {
      await _firestore.collection('users').doc(user.uid).set({
        'notificationsEnabled': enabled,
      }, SetOptions(merge: true));

      if (kDebugMode) {
        print('알림 설정 변경: $enabled');
      }

      // Windows에서 알림 끄면 리스너도 중지, 켜면 시작
      if (Platform.isWindows) {
        if (enabled) {
          startListeningForNewMessages();
        } else {
          stopListening();
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('알림 설정 변경 실패: $e');
      }
    }
  }

  /// 카테고리별 알림 설정 전체 조회
  /// 반환: { 'notificationsEnabled': bool, 'notificationChat': bool, 'notificationContent': bool, 'notificationSubscription': bool }
  Future<Map<String, bool>> getNotificationSettings() async {
    final user = _auth.currentUser;
    const defaults = {
      'notificationsEnabled': true,
      'notificationChat': true,
      'notificationContent': true,
      'notificationSubscription': true,
    };
    if (user == null) return defaults;

    try {
      final doc = await _firestore.collection('users').doc(user.uid).get();
      final data = doc.data() ?? {};
      return {
        'notificationsEnabled': data['notificationsEnabled'] ?? true,
        'notificationChat': data['notificationChat'] ?? true,
        'notificationContent': data['notificationContent'] ?? true,
        'notificationSubscription': data['notificationSubscription'] ?? true,
      };
    } catch (e) {
      if (kDebugMode) print('알림 설정 조회 실패: $e');
      return defaults;
    }
  }

  /// 카테고리별 알림 설정 변경
  /// key: 'notificationChat' | 'notificationContent' | 'notificationSubscription'
  Future<void> setCategoryNotification(String key, bool enabled) async {
    final user = _auth.currentUser;
    if (user == null) return;

    try {
      await _firestore.collection('users').doc(user.uid).set({
        key: enabled,
      }, SetOptions(merge: true));
    } catch (e) {
      if (kDebugMode) print('$key 설정 변경 실패: $e');
    }
  }

  /// 알림 설정 스트림 (실시간 구독)
  Stream<bool> notificationEnabledStream() {
    final user = _auth.currentUser;
    if (user == null) return Stream.value(true);

    return _firestore
        .collection('users')
        .doc(user.uid)
        .snapshots()
        .map((doc) => doc.data()?['notificationsEnabled'] ?? true);
  }
}
