import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/services/notification_navigation.dart';

void main() {
  test('creates a chat target from notification data with conversationId', () {
    final target = NotificationNavigationTarget.fromData({
      'type': 'new_message',
      'conversationId': 'user-123',
      'messageId': 'message-456',
    });

    expect(target?.conversationId, 'user-123');
  });

  test('ignores notification data without a conversationId', () {
    final target = NotificationNavigationTarget.fromData({
      'type': 'content',
      'newsId': 'news-123',
    });

    expect(target, isNull);
  });
}
