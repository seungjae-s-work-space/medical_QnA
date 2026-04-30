import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

abstract class ScreenshotLogWriter {
  Future<void> record(Map<String, dynamic> payload);
}

class FirestoreScreenshotLogWriter implements ScreenshotLogWriter {
  FirestoreScreenshotLogWriter({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  @override
  Future<void> record(Map<String, dynamic> payload) {
    return _firestore.collection('screenshot_events').add(payload);
  }
}

class ScreenshotProtectionService {
  ScreenshotProtectionService({
    Stream<dynamic>? nativeEvents,
    ScreenshotLogWriter? logWriter,
  })  : _nativeEvents = nativeEvents ?? _eventChannel.receiveBroadcastStream(),
        _logWriter = logWriter ?? FirestoreScreenshotLogWriter();

  static const warningMessage = '콘텐츠 무단 공유를 금지합니다';
  static const _eventChannel =
      EventChannel('net.agisungong.nanimtalktalk/screenshot_events');
  static final instance = ScreenshotProtectionService();

  final Stream<dynamic> _nativeEvents;
  final ScreenshotLogWriter _logWriter;

  Stream<void> get screenshots => _nativeEvents.map((_) {});

  Future<void> recordScreenshotAttempt({
    required String contentType,
    required String contentId,
    required String contentTitle,
    required String? userId,
    required String? userName,
    required String? userEmail,
  }) async {
    if (userId == null || userId.isEmpty) {
      debugPrint(
        'Screenshot detected on $contentType/$contentId by guest user.',
      );
      return;
    }

    try {
      await _logWriter.record(
        buildScreenshotLogPayload(
          contentType: contentType,
          contentId: contentId,
          contentTitle: contentTitle,
          userId: userId,
          userName: userName,
          userEmail: userEmail,
          capturedAt: DateTime.now(),
        ),
      );
    } catch (error, stackTrace) {
      debugPrint('Failed to record screenshot event: $error');
      debugPrint('$stackTrace');
    }
  }

  static Map<String, dynamic> buildScreenshotLogPayload({
    required String contentType,
    required String contentId,
    required String contentTitle,
    required String userId,
    required String? userName,
    required String? userEmail,
    required DateTime capturedAt,
  }) {
    return {
      'contentType': contentType,
      'contentId': contentId,
      'contentTitle': contentTitle,
      'userId': userId,
      'userName': userName,
      'userEmail': userEmail,
      'capturedAt': capturedAt,
    };
  }
}
