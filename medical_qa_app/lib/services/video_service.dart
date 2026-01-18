import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/video_model.dart';

class VideoService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'videos';

  // 공개된 영상 목록 가져오기 (실시간)
  Stream<List<VideoModel>> getPublishedVideos() {
    return _firestore
        .collection(_collection)
        .where('isPublished', isEqualTo: true)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => VideoModel.fromFirestore(doc))
            .toList());
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
