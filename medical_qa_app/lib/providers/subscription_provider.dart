import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import '../models/subscription_model.dart';
import '../services/subscription_service.dart';

class SubscriptionProvider with ChangeNotifier {
  final SubscriptionService _service = SubscriptionService();
  StreamSubscription<SubscriptionModel?>? _subscriptionStreamSub;

  SubscriptionModel? _currentSubscription;
  List<ProductDetails> _products = [];
  bool _isLoading = false;
  bool _isPurchasing = false;
  String? _errorMessage;
  String? _userId;

  // 디버그 로그 (UI 표시용)
  final List<String> debugLogs = [];
  void _log(String msg) {
    debugPrint('[IAP] $msg');
    debugLogs.add('[${DateTime.now().toString().substring(11, 19)}] $msg');
    if (debugLogs.length > 50) debugLogs.removeAt(0);
    notifyListeners();
  }

  SubscriptionModel? get currentSubscription => _currentSubscription;
  List<ProductDetails> get products => _products;
  bool get isLoading => _isLoading;
  bool get isPurchasing => _isPurchasing;
  String? get errorMessage => _errorMessage;

  // 구독 활성 여부
  bool get hasActiveSubscription {
    if (_currentSubscription == null) return false;
    return _currentSubscription!.isValid;
  }

  // 남은 일수
  int get remainingDays {
    if (_currentSubscription == null) return 0;
    return _currentSubscription!.remainingDays;
  }

  // 초기화
  Future<void> initialize(String userId) async {
    _userId = userId;
    _isLoading = true;
    notifyListeners();

    try {
      await _service.initialize();
      _products = _service.products;

      // 구매 이벤트 리스닝
      await _service.startListening(_handlePurchaseUpdate);

      // 현재 구독 정보 로드 + 실시간 리스닝
      await loadCurrentSubscription();
      _startSubscriptionListener(userId);

      // 미처리 구매 복구
      await _service.recoverPendingPurchases(_handlePurchaseUpdate);

      // 구독 상태 확인
      await _service.checkAndUpdateSubscriptionStatus(userId);
    } catch (e) {
      debugPrint('Subscription initialization error: $e');
      _errorMessage = '구독 정보를 불러오는데 실패했습니다.';
    }

    _isLoading = false;
    notifyListeners();
  }

  // 구독 정보 실시간 리스닝
  void _startSubscriptionListener(String userId) {
    _subscriptionStreamSub?.cancel();
    _subscriptionStreamSub = _service.subscriptionStream(userId).listen(
      (subscription) {
        _currentSubscription = subscription;
        notifyListeners();
      },
      onError: (e) {
        debugPrint('Subscription stream error: $e');
      },
    );
  }

  // 현재 구독 정보 로드
  Future<void> loadCurrentSubscription() async {
    if (_userId == null) return;

    _currentSubscription = await _service.getCurrentSubscription(_userId!);
    notifyListeners();
  }

  // 구매 이벤트 처리
  Future<void> _handlePurchaseUpdate(PurchaseDetails purchaseDetails) async {
    _log(
        'purchaseUpdate: ${purchaseDetails.status} / ${purchaseDetails.productID}');

    switch (purchaseDetails.status) {
      case PurchaseStatus.pending:
        _log('상태: pending');
        _isPurchasing = true;
        notifyListeners();
        break;

      case PurchaseStatus.purchased:
      case PurchaseStatus.restored:
        _log('상태: ${purchaseDetails.status} → 검증 시작');
        await _verifyAndDeliverPurchase(purchaseDetails);
        _isPurchasing = false;
        notifyListeners();
        break;

      case PurchaseStatus.error:
        _log('상태: error → ${purchaseDetails.error?.message}');
        _isPurchasing = false;
        _errorMessage = purchaseDetails.error?.message ?? '구매 중 오류가 발생했습니다.';
        await _service.completePurchase(purchaseDetails);
        notifyListeners();
        break;

      case PurchaseStatus.canceled:
        _log('상태: canceled');
        _isPurchasing = false;
        await _service.completePurchase(purchaseDetails);
        notifyListeners();
        break;
    }
  }

  // 구매 검증 및 처리
  Future<void> _verifyAndDeliverPurchase(
      PurchaseDetails purchaseDetails) async {
    _log(
        '검증 시작: userId=$_userId, productID=${purchaseDetails.productID}, purchaseID=${purchaseDetails.purchaseID}');

    if (_userId == null) {
      _log('❌ userId가 null → 저장 건너뜀');
      return;
    }

    try {
      final plan = _findPlanByProductId(purchaseDetails.productID);
      if (plan == null) {
        _log('❌ 플랜 못 찾음: ${purchaseDetails.productID}');
        _errorMessage = '구독 플랜을 찾을 수 없습니다.';
        return;
      }
      _log('✅ 플랜 찾음: ${plan.id} (${plan.name})');

      _log('Firestore 저장 시작...');
      await _service.saveSubscription(
        userId: _userId!,
        plan: plan,
        purchaseDetails: purchaseDetails,
      );
      _log('✅ Firestore 저장 완료');

      await _service.completePurchase(purchaseDetails);
      _log('✅ completePurchase 완료');

      await loadCurrentSubscription();
      _log('✅ 구독 정보 리로드 완료 (endDate: ${_currentSubscription?.endDate})');

      _errorMessage = null;
    } catch (e) {
      _log('❌ 에러: $e');
      _errorMessage = '구매 처리 중 오류: $e';
    }
  }

  // 상품 ID로 플랜 찾기
  SubscriptionPlan? _findPlanByProductId(String productId) {
    try {
      return SubscriptionPlan.defaultPlans.firstWhere(
        (plan) =>
            plan.iosProductId == productId ||
            plan.androidProductId == productId,
      );
    } catch (e) {
      return null;
    }
  }

  // 구독 구매
  Future<bool> purchaseSubscription(SubscriptionPlan plan) async {
    _isPurchasing = true;
    _errorMessage = null;
    notifyListeners();

    final success = await _service.purchaseSubscription(plan);
    if (!success) {
      _isPurchasing = false;
      _errorMessage = '구매를 시작할 수 없습니다.';
      notifyListeners();
    }

    return success;
  }

  // 구매 복원
  Future<void> restorePurchases() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _service.restorePurchases();
    } catch (e) {
      _errorMessage = '구매 복원 중 오류가 발생했습니다.';
    }

    _isLoading = false;
    notifyListeners();
  }

  // 특정 플랜의 가격 정보 가져오기
  String? getPriceForPlan(SubscriptionPlan plan) {
    final product = _service.getProductForPlan(plan);
    return product?.price;
  }

  // 에러 메시지 초기화
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  // 사용 가능 여부
  bool get isAvailable => _service.isAvailable;

  // 리소스 정리
  @override
  void dispose() {
    _subscriptionStreamSub?.cancel();
    _service.dispose();
    super.dispose();
  }
}
