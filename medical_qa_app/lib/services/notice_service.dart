import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/notice_model.dart';

class NoticeService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'notices';

  // 공지사항 목록 조회 (사용자용 - 공개된 글만, 일회성)
  Future<List<NoticeModel>> getPublishedNotices() async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('isPublished', isEqualTo: true)
        .orderBy('createdAt', descending: true)
        .get();
    return snapshot.docs.map((doc) => NoticeModel.fromFirestore(doc)).toList();
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
