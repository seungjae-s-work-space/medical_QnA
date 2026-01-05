import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// FCM 초기화 및 권한 요청
  Future<void> initialize() async {
    // 알림 권한 요청
    await _requestPermission();

    // 토큰 가져오기 및 저장
    await _saveToken();

    // 토큰 갱신 리스너
    _messaging.onTokenRefresh.listen(_updateToken);

    // 포그라운드 메시지 처리
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // 백그라운드에서 알림 탭해서 앱 열었을 때
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);

    // 앱이 종료된 상태에서 알림 탭해서 열렸을 때
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageOpenedApp(initialMessage);
    }
  }

  /// 알림 권한 요청
  Future<void> _requestPermission() async {
    final settings = await _messaging.requestPermission(
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

  /// FCM 토큰 저장
  Future<void> _saveToken() async {
    final user = _auth.currentUser;
    if (user == null) return;

    String? token;

    if (Platform.isIOS) {
      // iOS는 APNs 토큰도 필요
      final apnsToken = await _messaging.getAPNSToken();
      if (apnsToken == null) {
        if (kDebugMode) {
          print('APNs 토큰을 아직 받지 못함');
        }
        return;
      }
    }

    token = await _messaging.getToken();

    if (token != null) {
      await _updateToken(token);
    }
  }

  /// 토큰 Firestore에 업데이트
  Future<void> _updateToken(String token) async {
    final user = _auth.currentUser;
    if (user == null) return;

    try {
      await _firestore.collection('users').doc(user.uid).set({
        'fcmToken': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
        'tokenUpdatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      if (kDebugMode) {
        print('FCM 토큰 저장 완료: ${token.substring(0, 20)}...');
      }
    } catch (e) {
      if (kDebugMode) {
        print('FCM 토큰 저장 실패: $e');
      }
    }
  }

  /// 포그라운드 메시지 처리
  void _handleForegroundMessage(RemoteMessage message) {
    if (kDebugMode) {
      print('포그라운드 메시지 수신: ${message.notification?.title}');
    }

    // 포그라운드에서는 로컬 알림을 표시하거나
    // 인앱 스낵바/다이얼로그로 알려줄 수 있음
    // 여기서는 채팅 화면이면 무시, 아니면 알림 표시하는 로직 추가 가능
  }

  /// 백그라운드에서 알림 탭해서 앱 열었을 때
  void _handleMessageOpenedApp(RemoteMessage message) {
    if (kDebugMode) {
      print('알림 탭해서 앱 열림: ${message.data}');
    }

    // 특정 대화로 이동하는 로직
    // message.data['conversationId'] 등을 사용
    final conversationId = message.data['conversationId'];
    if (conversationId != null) {
      // Navigator로 해당 채팅 화면으로 이동
      // 이를 위해 GlobalKey<NavigatorState> 사용하거나
      // Provider/Riverpod 등으로 상태 변경
    }
  }

  /// 로그아웃 시 토큰 삭제
  Future<void> removeToken() async {
    final user = _auth.currentUser;
    if (user == null) return;

    try {
      await _firestore.collection('users').doc(user.uid).update({
        'fcmToken': FieldValue.delete(),
      });
    } catch (e) {
      if (kDebugMode) {
        print('FCM 토큰 삭제 실패: $e');
      }
    }
  }

  /// 현재 토큰 가져오기 (디버깅용)
  Future<String?> getToken() async {
    return await _messaging.getToken();
  }

  /// 알림 설정 상태 가져오기
  Future<bool> getNotificationEnabled() async {
    final user = _auth.currentUser;
    if (user == null) return true;

    try {
      final doc = await _firestore.collection('users').doc(user.uid).get();
      if (doc.exists) {
        // notificationsEnabled 필드가 없으면 기본값 true
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
    } catch (e) {
      if (kDebugMode) {
        print('알림 설정 변경 실패: $e');
      }
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
