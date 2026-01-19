import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/subscription_model.dart';
import '../../providers/subscription_provider.dart';
import '../../utils/app_colors.dart';
import 'package:intl/intl.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  SubscriptionPlan? _selectedPlan;

  @override
  void initState() {
    super.initState();
    // 12개월 플랜을 기본 선택 (최고 할인율)
    _selectedPlan = SubscriptionPlan.defaultPlans.last;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          '구독 관리',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: Consumer<SubscriptionProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 현재 구독 상태
                _buildCurrentSubscriptionCard(provider),
                const SizedBox(height: 24),

                // 구독 플랜 선택
                if (!provider.hasActiveSubscription) ...[
                  const Text(
                    '구독 플랜 선택',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ...SubscriptionPlan.defaultPlans.map(
                    (plan) => _buildPlanCard(plan, provider),
                  ),
                  const SizedBox(height: 24),

                  // 구매 버튼
                  _buildPurchaseButton(provider),
                  const SizedBox(height: 16),

                  // 구매 복원 버튼
                  _buildRestoreButton(provider),
                ],

                const SizedBox(height: 24),

                // 이용 안내
                _buildInfoSection(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildCurrentSubscriptionCard(SubscriptionProvider provider) {
    final subscription = provider.currentSubscription;
    final hasActive = provider.hasActiveSubscription;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: hasActive ? const Color(0xFFF0D8E8) : const Color(0xFFFAFAFA),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: hasActive
                      ? const Color(0xFFB87BA8).withValues(alpha: 0.2)
                      : const Color(0xFFE0E0E0),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  hasActive ? Icons.workspace_premium : Icons.person_outline,
                  color: hasActive ? const Color(0xFFB87BA8) : AppColors.textSecondary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                hasActive ? '프리미엄 구독 중' : '무료 사용자',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: hasActive ? const Color(0xFFB87BA8) : AppColors.textPrimary,
                ),
              ),
            ],
          ),
          if (hasActive && subscription != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '남은 기간: ${provider.remainingDays}일',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFFB87BA8),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '만료일: ${DateFormat('yyyy년 M월 d일').format(subscription.endDate)}',
                    style: const TextStyle(
                      fontSize: 15,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            const SizedBox(height: 12),
            const Text(
              '프리미엄 구독으로 모든 기능을 이용하세요',
              style: TextStyle(
                fontSize: 16,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPlanCard(SubscriptionPlan plan, SubscriptionProvider provider) {
    final isSelected = _selectedPlan?.id == plan.id;
    final price = provider.getPriceForPlan(plan) ??
        '${NumberFormat('#,###').format(plan.price)}원';

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedPlan = plan;
        });
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF0D8E8) : const Color(0xFFFAFAFA),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFFB87BA8) : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            // 라디오 버튼
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected ? const Color(0xFFB87BA8) : Colors.transparent,
                border: Border.all(
                  color: isSelected
                      ? const Color(0xFFB87BA8)
                      : AppColors.textSecondary,
                  width: 2,
                ),
              ),
              child: isSelected
                  ? const Center(
                      child: Icon(
                        Icons.check,
                        size: 14,
                        color: Colors.white,
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 16),

            // 플랜 정보
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    plan.name,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: isSelected
                          ? const Color(0xFFB87BA8)
                          : AppColors.textPrimary,
                    ),
                  ),
                  if (plan.description != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      plan.description!,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // 가격
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFFB87BA8).withValues(alpha: 0.15)
                    : const Color(0xFFE8E8E8),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                price,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isSelected
                      ? const Color(0xFFB87BA8)
                      : AppColors.textPrimary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPurchaseButton(SubscriptionProvider provider) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: provider.isPurchasing || _selectedPlan == null
            ? null
            : () => _handlePurchase(provider),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFB87BA8),
          disabledBackgroundColor: const Color(0xFFE0E0E0),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          elevation: 0,
        ),
        child: provider.isPurchasing
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : const Text(
                '구독하기',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
      ),
    );
  }

  Widget _buildRestoreButton(SubscriptionProvider provider) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: TextButton(
        onPressed: provider.isLoading
            ? null
            : () => provider.restorePurchases(),
        child: const Text(
          '이전 구매 복원',
          style: TextStyle(
            fontSize: 16,
            color: AppColors.textSecondary,
          ),
        ),
      ),
    );
  }

  Widget _buildInfoSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFAFAFA),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '이용 안내',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          _buildInfoItem('구독은 자동으로 갱신되지 않습니다.'),
          _buildInfoItem('구매 후 환불은 각 앱스토어 정책을 따릅니다.'),
          _buildInfoItem('구독 기간 중 기기 변경 시 구매 복원을 이용하세요.'),
          _buildInfoItem('문의사항은 고객센터로 연락해 주세요.'),
        ],
      ),
    );
  }

  Widget _buildInfoItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '• ',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handlePurchase(SubscriptionProvider provider) async {
    if (_selectedPlan == null) return;

    final success = await provider.purchaseSubscription(_selectedPlan!);
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.errorMessage ?? '구매를 시작할 수 없습니다.'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
