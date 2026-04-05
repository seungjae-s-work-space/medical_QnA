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

  // 상품 ID 목록
  Set<String> get _productIds {
    if (Platform.isIOS) {
      return SubscriptionPlan.defaultPlans
          .map((p) => p.iosProductId)
          .toSet();
    } else {
      return SubscriptionPlan.defaultPlans
          .map((p) => p.androidProductId)
          .toSet();
    }
  }

  // 초기화
  Future<void> initialize() async {
    _isAvailable = await _iap.isAvailable();
    if (!_isAvailable) {
      debugPrint('In-app purchase is not available');
      return;
    }

    // iOS에서 과거 거래 완료 처리
    if (Platform.isIOS) {
      final InAppPurchaseStoreKitPlatformAddition iosPlatformAddition =
          _iap.getPlatformAddition<InAppPurchaseStoreKitPlatformAddition>();
      await iosPlatformAddition.setDelegate(ExamplePaymentQueueDelegate());
    }

    // 상품 정보 로드
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

    debugPrint('Query response - Found: ${response.productDetails.length}, Not found: ${response.notFoundIDs.length}');

    if (response.notFoundIDs.isNotEmpty) {
      debugPrint('Products NOT found: ${response.notFoundIDs}');
    }

    if (response.error != null) {
      debugPrint('Query error: ${response.error}');
    }

    _products = response.productDetails;
    for (final product in _products) {
      debugPrint('Product loaded: ${product.id} - ${product.title} - ${product.price}');
    }
    debugPrint('=== Total ${_products.length} products loaded ===');
  }

  // 구매 스트림 리스닝 시작
  void startListening(Function(PurchaseDetails) onPurchaseUpdate) {
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
    final productId = Platform.isIOS ? plan.iosProductId : plan.androidProductId;
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
      // 소모품(Consumable)으로 설정된 경우 buyConsumable 사용
      // autoConsume: false로 설정하여 직접 소비 처리 (Firestore 저장 후)
      return await _iap.buyConsumable(
        purchaseParam: purchaseParam,
        autoConsume: false,
      );
    } catch (e) {
      debugPrint('Purchase error: $e');
      return false;
    }
  }

  // 구매 완료 처리
  Future<void> completePurchase(PurchaseDetails purchaseDetails) async {
    // iOS/Android 모두 무조건 completePurchase 호출 (트랜잭션 finish)
    try {
      await _iap.completePurchase(purchaseDetails);
      debugPrint('Purchase completed: ${purchaseDetails.productID}');
    } catch (e) {
      debugPrint('completePurchase error: $e');
    }

    // Android: 소모품 consume 처리 (재구매 가능하게)
    if (Platform.isAndroid) {
      try {
        final androidAddition =
            _iap.getPlatformAddition<InAppPurchaseAndroidPlatformAddition>();
        await androidAddition.consumePurchase(purchaseDetails);
        debugPrint('Android: purchase consumed for ${purchaseDetails.productID}');
      } catch (e) {
        debugPrint('Android consume error: $e');
      }
    }
  }

  // 구매 복원
  Future<void> restorePurchases() async {
    await _iap.restorePurchases();
  }

  // Firestore에 구독 정보 저장
  Future<void> saveSubscription({
    required String userId,
    required SubscriptionPlan plan,
    required PurchaseDetails purchaseDetails,
  }) async {
    // 중복 구매 방지 - 동일 transactionId가 이미 저장되어 있으면 스킵
    if (purchaseDetails.purchaseID != null) {
      final existing = await _firestore
          .collection('subscriptions')
          .where('transactionId', isEqualTo: purchaseDetails.purchaseID)
          .limit(1)
          .get();
      if (existing.docs.isNotEmpty) {
        debugPrint('Duplicate purchase detected, skipping: ${purchaseDetails.purchaseID}');
        return;
      }
    }

    final now = DateTime.now();

    // 기존 구독 확인 - 잔여 기간이 있으면 그 이후부터 추가
    final currentSubscription = await getCurrentSubscription(userId);
    DateTime baseDate = now;

    if (currentSubscription != null && currentSubscription.endDate.isAfter(now)) {
      // 기존 구독의 만료일이 아직 남아있으면 그 날짜부터 추가
      baseDate = currentSubscription.endDate;
      debugPrint('Extending from existing subscription end date: $baseDate');
    }

    final endDate = baseDate.add(Duration(days: plan.durationMonths * 30));
    debugPrint('New subscription end date: $endDate');

    final subscription = SubscriptionModel(
      id: '', // Firestore에서 자동 생성
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

    // 구독 정보 저장
    final docRef = await _firestore
        .collection('subscriptions')
        .add(subscription.toMap());

    // 사용자 문서 업데이트
    await _firestore.collection('users').doc(userId).update({
      'subscriptionId': docRef.id,
      'subscriptionStatus': SubscriptionStatus.active.name,
      'subscriptionEndDate': Timestamp.fromDate(endDate),
    });
  }

  // 원본 거래 ID 추출 (iOS)
  String? _getOriginalTransactionId(PurchaseDetails purchaseDetails) {
    if (Platform.isIOS && purchaseDetails is AppStorePurchaseDetails) {
      return purchaseDetails.skPaymentTransaction.originalTransaction
          ?.transactionIdentifier;
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
          .where((sub) => sub.status == SubscriptionStatus.active ||
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
          .where((sub) => sub.status == SubscriptionStatus.active ||
                          sub.status == SubscriptionStatus.cancelled)
          .toList();

      if (validSubs.isEmpty) {
        debugPrint('No active/cancelled subscriptions for user: $userId');
        return null;
      }

      // 만료일 기준 내림차순 정렬 후 첫 번째 선택
      validSubs.sort((a, b) => b.endDate.compareTo(a.endDate));

      debugPrint('Found subscription: ${validSubs.first.planId}, endDate: ${validSubs.first.endDate}');
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
      await _firestore
          .collection('subscriptions')
          .doc(subscription.id)
          .update({
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
