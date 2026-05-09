class ChatAttachmentRetention {
  static const int retentionDays = 180;
  static const Duration retention = Duration(days: retentionDays);

  static bool isExpired(DateTime createdAt, {DateTime? now}) {
    final currentTime = (now ?? DateTime.now()).toUtc();
    return currentTime.difference(createdAt.toUtc()) >= retention;
  }
}
