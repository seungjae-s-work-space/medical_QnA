class DeviceTokenRecord {
  static const collectionName = 'deviceTokens';
  static const deviceIdPreferenceKey = 'device_token_device_id';

  static String documentPath(String deviceId) => '$collectionName/$deviceId';

  static Map<String, Object?> buildData({
    required String deviceId,
    required String userId,
    required String fcmToken,
    required String platform,
    required String appVersion,
    required String buildNumber,
    required Object updatedAt,
  }) {
    return {
      'deviceId': deviceId,
      'userId': userId,
      'fcmToken': fcmToken,
      'platform': platform,
      'appVersion': appVersion,
      'buildNumber': buildNumber,
      'updatedAt': updatedAt,
    };
  }
}
