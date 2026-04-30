import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/services/screenshot_protection_service.dart';

void main() {
  test('uses the required warning message', () {
    expect(
      ScreenshotProtectionService.warningMessage,
      '콘텐츠 무단 공유를 금지합니다',
    );
  });

  test('builds screenshot log payload with content and user context', () {
    final capturedAt = DateTime(2026, 4, 30, 12, 30);

    final payload = ScreenshotProtectionService.buildScreenshotLogPayload(
      contentType: 'news',
      contentId: 'news-1',
      contentTitle: '테스트 뉴스',
      userId: 'user-1',
      userName: '홍길동',
      userEmail: 'user@example.com',
      capturedAt: capturedAt,
    );

    expect(payload, {
      'contentType': 'news',
      'contentId': 'news-1',
      'contentTitle': '테스트 뉴스',
      'userId': 'user-1',
      'userName': '홍길동',
      'userEmail': 'user@example.com',
      'capturedAt': capturedAt,
    });
  });
}
