import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/utils/chat_attachment_retention.dart';

void main() {
  group('ChatAttachmentRetention', () {
    test('uses a 180 day retention window', () {
      expect(ChatAttachmentRetention.retentionDays, 180);
    });

    test('expires chat attachments when the message is older than retention',
        () {
      final now = DateTime.utc(2026, 7, 1);

      expect(
        ChatAttachmentRetention.isExpired(
          DateTime.utc(2026, 1, 1),
          now: now,
        ),
        isTrue,
      );
      expect(
        ChatAttachmentRetention.isExpired(
          DateTime.utc(2026, 6, 1),
          now: now,
        ),
        isFalse,
      );
    });
  });
}
