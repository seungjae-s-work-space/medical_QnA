import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/promotion_model.dart';

class PromotionService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'promotions';
  static const int defaultLimit = 10;

  Future<List<PromotionModel>> getPublishedPromotions({
    int limit = defaultLimit,
  }) async {
    final cappedLimit = limit.clamp(1, defaultLimit).toInt();
    final snapshot = await _firestore
        .collection(_collection)
        .where('isPublished', isEqualTo: true)
        .orderBy('sortOrder')
        .orderBy('createdAt', descending: true)
        .limit(cappedLimit)
        .get();

    return snapshot.docs
        .map((doc) => PromotionModel.fromFirestore(doc))
        .toList();
  }

  Future<PromotionModel?> getPromotion(String promotionId) async {
    final doc = await _firestore.collection(_collection).doc(promotionId).get();
    if (!doc.exists) return null;
    return PromotionModel.fromFirestore(doc);
  }
}
