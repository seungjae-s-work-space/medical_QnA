import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/video_model.dart';
import 'paginated_result.dart';

class VideoService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'videos';
  static const int defaultPageSize = 50;

  // 공개된 영상 목록 가져오기 (일회성)
  Future<List<VideoModel>> getPublishedVideos() async {
    final result = await getPublishedVideosPage();
    return result.items;
  }

  Future<PaginatedResult<VideoModel>> getPublishedVideosPage({
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
      items: snapshot.docs.map((doc) => VideoModel.fromFirestore(doc)).toList(),
      lastDocument: snapshot.docs.isNotEmpty ? snapshot.docs.last : startAfter,
      hasMore: snapshot.docs.length == pageSize,
    );
  }

  Future<int> getPublishedVideosCount() async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('isPublished', isEqualTo: true)
        .count()
        .get();
    return snapshot.count ?? 0;
  }

  // 단일 영상 가져오기
  Future<VideoModel?> getVideo(String id) async {
    final doc = await _firestore.collection(_collection).doc(id).get();
    if (doc.exists) {
      return VideoModel.fromFirestore(doc);
    }
    return null;
  }
}
