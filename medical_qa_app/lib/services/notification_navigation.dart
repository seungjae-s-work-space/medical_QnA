class NotificationNavigationTarget {
  const NotificationNavigationTarget._({required this.conversationId});

  final String conversationId;

  static NotificationNavigationTarget? fromData(Map<String, dynamic> data) {
    final conversationId = data['conversationId'];
    if (conversationId is! String || conversationId.trim().isEmpty) {
      return null;
    }

    return NotificationNavigationTarget._(
      conversationId: conversationId.trim(),
    );
  }
}
