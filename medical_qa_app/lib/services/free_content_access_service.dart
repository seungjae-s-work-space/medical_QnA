import 'package:cloud_firestore/cloud_firestore.dart';

class FreeContentAccessResult {
  final bool granted;
  final int remainingViews;
  final int limit;

  const FreeContentAccessResult({
    required this.granted,
    required this.remainingViews,
    required this.limit,
  });

  bool get isLastFreeView => granted && remainingViews == 0;
}

class FreeContentAccessService {
  static const int defaultFreeContentViewLimit = 5;

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<FreeContentAccessResult> consumeView(String userId) async {
    final userRef = _firestore.collection('users').doc(userId);

    return _firestore.runTransaction((transaction) async {
      final snapshot = await transaction.get(userRef);
      if (!snapshot.exists) {
        throw StateError('사용자 정보를 찾을 수 없습니다.');
      }

      final data = snapshot.data() ?? <String, dynamic>{};
      final limit = _parseInt(data['freeContentViewLimit']) ??
          defaultFreeContentViewLimit;
      final used = _parseInt(data['freeContentViewUsed']) ?? 0;

      if (used >= limit) {
        return FreeContentAccessResult(
          granted: false,
          remainingViews: 0,
          limit: limit,
        );
      }

      final nextUsed = used + 1;
      final remainingViews = limit - nextUsed;

      transaction.set(
        userRef,
        {
          'freeContentViewLimit': limit,
          'freeContentViewUsed': nextUsed,
          'freeContentViewUpdatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true),
      );

      return FreeContentAccessResult(
        granted: true,
        remainingViews: remainingViews > 0 ? remainingViews : 0,
        limit: limit,
      );
    });
  }

  int? _parseInt(dynamic value) {
    if (value is int) return value;
    if (value is double) return value.toInt();
    return null;
  }
}
