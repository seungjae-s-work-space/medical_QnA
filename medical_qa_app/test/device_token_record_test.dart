import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/services/device_token_record.dart';

void main() {
  test('builds a stable device token document path', () {
    expect(DeviceTokenRecord.collectionName, 'deviceTokens');
    expect(
      DeviceTokenRecord.documentPath('device-123'),
      'deviceTokens/device-123',
    );
  });

  test('builds device token payload with current user and platform context',
      () {
    final payload = DeviceTokenRecord.buildData(
      deviceId: 'device-123',
      userId: 'user-456',
      fcmToken: 'fcm-token',
      platform: 'ios',
      appVersion: '1.2.3',
      buildNumber: '45',
      updatedAt: DateTime.utc(2026, 4, 30),
    );

    expect(payload, {
      'deviceId': 'device-123',
      'userId': 'user-456',
      'fcmToken': 'fcm-token',
      'platform': 'ios',
      'appVersion': '1.2.3',
      'buildNumber': '45',
      'updatedAt': DateTime.utc(2026, 4, 30),
    });
  });
}
