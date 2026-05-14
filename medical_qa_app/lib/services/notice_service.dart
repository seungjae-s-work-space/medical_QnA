import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/notice_model.dart';
import 'paginated_result.dart';

class NoticeService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'notices';
  static const int defaultPageSize = 50;

  // 공지사항 목록 조회 (사용자용 - 공개된 글만, 일회성)
  Future<List<NoticeModel>> getPublishedNotices() async {
    final result = await getPublishedNoticesPage();
    return result.items;
  }

  Future<PaginatedResult<NoticeModel>> getPublishedNoticesPage({
    int pageSize = defaultPageSize,
    DocumentSnapshot? startAfter,
  }) async {
    var query = _firestore
        .collection(_collection)
        .where('isPublished', isEqualTo: true)
        .orderBy('createdAt', descending: true)
        .limit(pageSize);

    if (startAfter != null) {
      query = query.startAfterDocument(startAfter);
    }

    final snapshot = await query.get();
    return PaginatedResult(
      items:
          snapshot.docs.map((doc) => NoticeModel.fromFirestore(doc)).toList(),
      lastDocument: snapshot.docs.isNotEmpty ? snapshot.docs.last : startAfter,
      hasMore: snapshot.docs.length == pageSize,
    );
  }

  // 공지사항 목록 조회 (관리자용 - 모든 글, 일회성)
  Future<List<NoticeModel>> getAllNotices() async {
    final snapshot = await _firestore
        .collection(_collection)
        .orderBy('createdAt', descending: true)
        .get();
    return snapshot.docs.map((doc) => NoticeModel.fromFirestore(doc)).toList();
  }

  // 단일 공지사항 조회
  Future<NoticeModel?> getNotice(String noticeId) async {
    final doc = await _firestore.collection(_collection).doc(noticeId).get();
    if (doc.exists) {
      return NoticeModel.fromFirestore(doc);
    }
    return null;
  }
}
