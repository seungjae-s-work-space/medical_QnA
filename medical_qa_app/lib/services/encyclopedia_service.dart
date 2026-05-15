import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/encyclopedia_model.dart';
import 'paginated_result.dart';

class EncyclopediaService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'encyclopedia';
  static const int defaultPageSize = 50;

  // 게시글 목록 조회 (사용자용 - 공개된 글만, 일회성)
  Future<List<EncyclopediaModel>> getPublishedArticles() async {
    final result = await getPublishedArticlesPage();
    return result.items;
  }

  Future<PaginatedResult<EncyclopediaModel>> getPublishedArticlesPage({
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
      items: snapshot.docs
          .map((doc) => EncyclopediaModel.fromFirestore(doc))
          .toList(),
      lastDocument: snapshot.docs.isNotEmpty ? snapshot.docs.last : startAfter,
      hasMore: snapshot.docs.length == pageSize,
    );
  }

  Future<int> getPublishedArticlesCount() async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('isPublished', isEqualTo: true)
        .count()
        .get();
    return snapshot.count ?? 0;
  }

  // 게시글 목록 조회 (관리자용 - 모든 글, 일회성)
  Future<List<EncyclopediaModel>> getAllArticles() async {
    final snapshot = await _firestore
        .collection(_collection)
        .orderBy('createdAt', descending: true)
        .get();
    return snapshot.docs
        .map((doc) => EncyclopediaModel.fromFirestore(doc))
        .toList();
  }

  // 단일 게시글 조회
  Future<EncyclopediaModel?> getArticle(String articleId) async {
    final doc = await _firestore.collection(_collection).doc(articleId).get();
    if (doc.exists) {
      return EncyclopediaModel.fromFirestore(doc);
    }
    return null;
  }

  // 게시글 생성
  Future<String> createArticle(EncyclopediaModel article) async {
    final docRef =
        await _firestore.collection(_collection).add(article.toMap());
    return docRef.id;
  }

  // 게시글 수정
  Future<void> updateArticle(EncyclopediaModel article) async {
    await _firestore.collection(_collection).doc(article.id).update({
      'title': article.title,
      'content': article.content,
      'imageUrl': article.imageUrl,
      'isPublished': article.isPublished,
      'updatedAt': Timestamp.fromDate(DateTime.now()),
    });
  }

  // 게시글 삭제
  Future<void> deleteArticle(String articleId) async {
    await _firestore.collection(_collection).doc(articleId).delete();
  }

  // 조회수 증가
  Future<void> incrementViewCount(String articleId) async {
    await _firestore.collection(_collection).doc(articleId).update({
      'viewCount': FieldValue.increment(1),
    });
  }
}
