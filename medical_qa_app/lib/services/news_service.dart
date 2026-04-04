import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/news_model.dart';

class NewsService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'news';

  // 뉴스 목록 조회 (사용자용 - 공개된 글만, 일회성)
  Future<List<NewsModel>> getPublishedNews() async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('isPublished', isEqualTo: true)
        .orderBy('createdAt', descending: true)
        .get();
    return snapshot.docs
        .map((doc) => NewsModel.fromFirestore(doc))
        .toList();
  }

  // 뉴스 목록 조회 (관리자용 - 모든 글, 일회성)
  Future<List<NewsModel>> getAllNews() async {
    final snapshot = await _firestore
        .collection(_collection)
        .orderBy('createdAt', descending: true)
        .get();
    return snapshot.docs
        .map((doc) => NewsModel.fromFirestore(doc))
        .toList();
  }

  // 단일 뉴스 조회
  Future<NewsModel?> getNews(String newsId) async {
    final doc = await _firestore.collection(_collection).doc(newsId).get();
    if (doc.exists) {
      return NewsModel.fromFirestore(doc);
    }
    return null;
  }

  // 뉴스 생성
  Future<String> createNews(NewsModel news) async {
    final docRef = await _firestore.collection(_collection).add(news.toMap());
    return docRef.id;
  }

  // 뉴스 수정
  Future<void> updateNews(NewsModel news) async {
    await _firestore.collection(_collection).doc(news.id).update({
      'title': news.title,
      'content': news.content,
      'imageUrl': news.imageUrl,
      'isPublished': news.isPublished,
      'updatedAt': Timestamp.fromDate(DateTime.now()),
    });
  }

  // 뉴스 삭제
  Future<void> deleteNews(String newsId) async {
    await _firestore.collection(_collection).doc(newsId).delete();
  }
}
