import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/encyclopedia_model.dart';
import '../models/article_section.dart';
import 'paginated_result.dart';

class EncyclopediaService {
  EncyclopediaService({
    ArticleSection section = ArticleSection.encyclopedia,
    FirebaseFirestore? firestore,
  })  : _collection = section.collectionName,
        _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;
  final String _collection;
  static const int defaultPageSize = 50;

  // 게시글 목록 조회 (사용자용 - 공개된 글만, 일회성)
  Future<List<EncyclopediaModel>> getPublishedArticles() async {
    final result = await getPublishedArticlesPage();
    return result.items;
  }

  Future<PaginatedResult<EncyclopediaModel>> getPublishedArticlesPage({
    int pageSize = defaultPageSize,
    DocumentSnapshot? startAfter,
  }) =>
      getArticlesPage(pageSize: pageSize, startAfter: startAfter);

  Future<PaginatedResult<EncyclopediaModel>> getArticlesPage({
    bool publishedOnly = true,
    int pageSize = defaultPageSize,
    DocumentSnapshot? startAfter,
  }) async {
    Query<Map<String, dynamic>> query = _firestore.collection(_collection);
    if (publishedOnly) {
      query = query.where('isPublished', isEqualTo: true);
    }
    query = query.orderBy('createdAt', descending: true);

    if (startAfter != null) {
      query = query.startAfterDocument(startAfter);
    }
    query = query.limit(pageSize);

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
      'references': article.references,
      'sourceUrl': article.sourceUrl,
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
