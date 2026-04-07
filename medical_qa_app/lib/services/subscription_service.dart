import 'dart:async';
import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart';
import 'package:in_app_purchase_storekit/store_kit_wrappers.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';
import '../models/subscription_model.dart';

class SubscriptionService {
  static final SubscriptionService _instance = SubscriptionService._internal();
  factory SubscriptionService() => _instance;
  SubscriptionService._internal();

  final InAppPurchase _iap = InAppPurchase.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  StreamSubscription<List<PurchaseDetails>>? _subscription;
  List<ProductDetails> _products = [];
  bool _isAvailable = false;
  Future<void>? _initializeFuture;

  // 상품 ID 목록
  Set<String> get _productIds {
    if (Platform.isIOS) {
      return SubscriptionPlan.defaultPlans.map((p) => p.iosProductId).toSet();
    } else {
      return SubscriptionPlan.defaultPlans
          .map((p) => p.androidProductId)
          .toSet();
    }
  }

  // 초기화
  Future<void> initialize() async {
    _initializeFuture ??= _initializeInternal();
    await _initializeFuture;
  }

  Future<void> _initializeInternal() async {
    _isAvailable = await _iap.isAvailable();
    if (!_isAvailable) {
      debugPrint('In-app purchase is not available');
      return;
    }

    if (Platform.isIOS) {
      final InAppPurchaseStoreKitPlatformAddition iosPlatformAddition =
          _iap.getPlatformAddition<InAppPurchaseStoreKitPlatformAddition>();
      await iosPlatformAddition.setDelegate(ExamplePaymentQueueDelegate());
    }

    await loadProducts();
  }

  // 상품 정보 로드
  Future<void> loadProducts() async {
    debugPrint('=== Loading IAP Products ===');
    debugPrint('IAP Available: $_isAvailable');
    debugPrint('Product IDs to query: $_productIds');

    if (!_isAvailable) {
      debugPrint('IAP not available, skipping product load');
      return;
    }

    final ProductDetailsResponse response =
        await _iap.queryProductDetails(_productIds);

    debugPrint(
        'Query response - Found: ${response.productDetails.length}, Not found: ${response.notFoundIDs.length}');

    if (response.notFoundIDs.isNotEmpty) {
      debugPrint('Products NOT found: ${response.notFoundIDs}');
    }

    if (response.error != null) {
      debugPrint('Query error: ${response.error}');
    }

    _products = response.productDetails;
    for (final product in _products) {
      debugPrint(
          'Product loaded: ${product.id} - ${product.title} - ${product.price}');
    }
    debugPrint('=== Total ${_products.length} products loaded ===');
  }

  // 구매 스트림 리스닝 시작
  Future<void> startListening(
    FutureOr<void> Function(PurchaseDetails) onPurchaseUpdate,
  ) async {
    await _subscription?.cancel();
    _subscription = _iap.purchaseStream.listen(
      (List<PurchaseDetails> purchaseDetailsList) {
        for (final purchaseDetails in purchaseDetailsList) {
          onPurchaseUpdate(purchaseDetails);
        }
      },
      onDone: () {
        _subscription?.cancel();
      },
      onError: (error) {
        debugPrint('Purchase stream error: $error');
      },
    );
  }

  // 구매 스트림 리스닝 중지
  void stopListening() {
    _subscription?.cancel();
    _subscription = null;
  }

  // 상품 목록 가져오기
  List<ProductDetails> get products => _products;

  // 특정 플랜의 상품 정보 가져오기
  ProductDetails? getProductForPlan(SubscriptionPlan plan) {
    final productId =
        Platform.isIOS ? plan.iosProductId : plan.androidProductId;
    try {
      return _products.firstWhere((p) => p.id == productId);
    } catch (e) {
      return null;
    }
  }

  // 구매 시작
  Future<bool> purchaseSubscription(SubscriptionPlan plan) async {
    final product = getProductForPlan(plan);
    if (product == null) {
      debugPrint('Product not found for plan: ${plan.id}');
      return false;
    }

    final PurchaseParam purchaseParam = PurchaseParam(
      productDetails: product,
    );

    try {
      return await _iap.buyConsumable(
        purchaseParam: purchaseParam,
        autoConsume: Platform.isIOS,
      );
    } catch (e) {
      debugPrint('Purchase error: $e');
      return false;
    }
  }

  // 구매 완료 처리
  Future<void> completePurchase(PurchaseDetails purchaseDetails) async {
    final shouldConsumeOnAndroid = Platform.isAndroid &&
        (purchaseDetails.status == PurchaseStatus.purchased ||
            purchaseDetails.status == PurchaseStatus.restored);

    if (shouldConsumeOnAndroid) {
      try {
        final androidAddition =
            _iap.getPlatformAddition<InAppPurchaseAndroidPlatformAddition>();
        await androidAddition.consumePurchase(purchaseDetails);
        debugPrint(
            'Android: purchase consumed for ${purchaseDetails.productID}');
      } catch (e) {
        debugPrint('Android consume error: $e');
      }
    }

    try {
      if (purchaseDetails.pendingCompletePurchase) {
        await _iap.completePurchase(purchaseDetails);
        debugPrint('Purchase completed: ${purchaseDetails.productID}');
      }
    } catch (e) {
      debugPrint('completePurchase error: $e');
    }
  }

  // Android: 미처리 구매 복구
  Future<int> recoverPendingPurchases(
    FutureOr<void> Function(PurchaseDetails) onPurchaseUpdate,
  ) async {
    if (!Platform.isAndroid) return 0;

    var recoveredCount = 0;

    try {
      final androidAddition =
          _iap.getPlatformAddition<InAppPurchaseAndroidPlatformAddition>();
      final queryResult = await androidAddition.queryPastPurchases();

      for (final purchase in queryResult.pastPurchases) {
        if (!_productIds.contains(purchase.productID)) continue;

        debugPrint(
          'Recovering pending purchase: ${purchase.productID} (${purchase.purchaseID})',
        );
        await onPurchaseUpdate(purchase);
        recoveredCount++;
      }
    } catch (e) {
      debugPrint('Error recovering pending purchases: $e');
    }

    return recoveredCount;
  }

  // 구매 복원
  Future<void> restorePurchases() async {
    if (Platform.isIOS) {
      await _iap.restorePurchases();
    }
  }

  // Firestore에 구독 정보 저장
  Future<void> saveSubscription({
    required String userId,
    required SubscriptionPlan plan,
    required PurchaseDetails purchaseDetails,
  }) async {
    // 중복 구매 방지 - 본인 구독 범위에서만 동일 transactionId 확인
    // Firestore Rules상 subscriptions 조회는 userId로 범위를 제한해야 허용된다.
    if (purchaseDetails.purchaseID != null) {
      final existing = await _firestore
          .collection('subscriptions')
          .where('userId', isEqualTo: userId)
          .where('transactionId', isEqualTo: purchaseDetails.purchaseID)
          .limit(1)
          .get();
      if (existing.docs.isNotEmpty) {
        debugPrint(
            'Duplicate purchase detected, skipping: ${purchaseDetails.purchaseID}');
        return;
      }
    }

    final now = DateTime.now();

    // 기존 구독 확인 - 잔여 기간이 있으면 그 이후부터 추가
    final currentSubscription = await getCurrentSubscription(userId);
    DateTime baseDate = now;

    if (currentSubscription != null &&
        currentSubscription.endDate.isAfter(now)) {
      // 기존 구독의 만료일이 아직 남아있으면 그 날짜부터 추가
      baseDate = currentSubscription.endDate;
      debugPrint('Extending from existing subscription end date: $baseDate');
    }

    final endDate = baseDate.add(Duration(days: plan.durationMonths * 30));
    debugPrint('New subscription end date: $endDate');

    final docRef = _firestore.collection('subscriptions').doc();

    final subscription = SubscriptionModel(
      id: docRef.id,
      userId: userId,
      planId: plan.id,
      status: SubscriptionStatus.active,
      platform: Platform.isIOS ? 'ios' : 'android',
      platformProductId: purchaseDetails.productID,
      transactionId: purchaseDetails.purchaseID,
      originalTransactionId: _getOriginalTransactionId(purchaseDetails),
      startDate: now,
      endDate: endDate,
      createdAt: now,
      updatedAt: now,
    );

    final batch = _firestore.batch();
    batch.set(docRef, subscription.toMap());
    batch.update(_firestore.collection('users').doc(userId), {
      'subscriptionId': docRef.id,
      'subscriptionStatus': SubscriptionStatus.active.name,
      'subscriptionEndDate': Timestamp.fromDate(endDate),
    });
    await batch.commit();
  }

  // 원본 거래 ID 추출 (iOS)
  String? _getOriginalTransactionId(PurchaseDetails purchaseDetails) {
    if (Platform.isIOS && purchaseDetails is AppStorePurchaseDetails) {
      return purchaseDetails
          .skPaymentTransaction.originalTransaction?.transactionIdentifier;
    }
    return null;
  }

  // 사용자의 구독 정보 실시간 리스닝
  Stream<SubscriptionModel?> subscriptionStream(String userId) {
    return _firestore
        .collection('subscriptions')
        .where('userId', isEqualTo: userId)
        .snapshots()
        .map((snapshot) {
      if (snapshot.docs.isEmpty) return null;

      final validSubs = snapshot.docs
          .map((doc) => SubscriptionModel.fromFirestore(doc))
          .where((sub) =>
              sub.status == SubscriptionStatus.active ||
              sub.status == SubscriptionStatus.cancelled)
          .toList();

      if (validSubs.isEmpty) return null;

      validSubs.sort((a, b) => b.endDate.compareTo(a.endDate));
      return validSubs.first;
    });
  }

  // 사용자의 현재 구독 정보 가져오기
  Future<SubscriptionModel?> getCurrentSubscription(String userId) async {
    try {
      // 해당 사용자의 모든 구독 가져오기 (복합 인덱스 문제 회피)
      final querySnapshot = await _firestore
          .collection('subscriptions')
          .where('userId', isEqualTo: userId)
          .get();

      if (querySnapshot.docs.isEmpty) {
        debugPrint('No subscriptions found for user: $userId');
        return null;
      }

      // 활성/취소 상태인 구독 중 만료일이 가장 늦은 것 선택
      final validSubs = querySnapshot.docs
          .map((doc) => SubscriptionModel.fromFirestore(doc))
          .where((sub) =>
              sub.status == SubscriptionStatus.active ||
              sub.status == SubscriptionStatus.cancelled)
          .toList();

      if (validSubs.isEmpty) {
        debugPrint('No active/cancelled subscriptions for user: $userId');
        return null;
      }

      // 만료일 기준 내림차순 정렬 후 첫 번째 선택
      validSubs.sort((a, b) => b.endDate.compareTo(a.endDate));

      debugPrint(
          'Found subscription: ${validSubs.first.planId}, endDate: ${validSubs.first.endDate}');
      return validSubs.first;
    } catch (e) {
      debugPrint('Error fetching subscription: $e');
      return null;
    }
  }

  // 구독 상태 확인 및 업데이트
  Future<void> checkAndUpdateSubscriptionStatus(String userId) async {
    final subscription = await getCurrentSubscription(userId);
    if (subscription == null) return;

    final now = DateTime.now();
    if (subscription.endDate.isBefore(now) &&
        subscription.status != SubscriptionStatus.expired) {
      // 구독 만료 처리
      await _firestore.collection('subscriptions').doc(subscription.id).update({
        'status': SubscriptionStatus.expired.name,
        'updatedAt': Timestamp.fromDate(now),
      });

      await _firestore.collection('users').doc(userId).update({
        'subscriptionStatus': SubscriptionStatus.expired.name,
      });
    }
  }

  // 구독 플랜 정보 가져오기
  SubscriptionPlan? getPlanById(String planId) {
    try {
      return SubscriptionPlan.defaultPlans.firstWhere((p) => p.id == planId);
    } catch (e) {
      return null;
    }
  }

  // 사용 가능 여부
  bool get isAvailable => _isAvailable;

  // 리소스 정리
  void dispose() {
    stopListening();
    if (Platform.isIOS) {
      final InAppPurchaseStoreKitPlatformAddition iosPlatformAddition =
          _iap.getPlatformAddition<InAppPurchaseStoreKitPlatformAddition>();
      iosPlatformAddition.setDelegate(null);
    }
  }
}

// iOS 결제 대리자
class ExamplePaymentQueueDelegate implements SKPaymentQueueDelegateWrapper {
  @override
  bool shouldContinueTransaction(
    SKPaymentTransactionWrapper transaction,
    SKStorefrontWrapper storefront,
  ) {
    return true;
  }

  @override
  bool shouldShowPriceConsent() {
    return false;
  }
}
