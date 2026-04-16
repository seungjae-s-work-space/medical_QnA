import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
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
                Text(
                  provider.hasActiveSubscription ? '추가 구매' : '구독 플랜 선택',
                  style: const TextStyle(
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

                const SizedBox(height: 24),

                // 이용 안내
                _buildInfoSection(),

                if (kDebugMode) ...[
                  const SizedBox(height: 24),

                  // 디버그 빌드에서만 노출
                  _buildDiagnosticPanel(provider),
                ],
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
                  color: hasActive
                      ? const Color(0xFFB87BA8)
                      : AppColors.textSecondary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                hasActive ? '프리미엄 구독 중' : '무료 사용자',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: hasActive
                      ? const Color(0xFFB87BA8)
                      : AppColors.textPrimary,
                ),
              ),
            ],
          ),
          if (hasActive && subscription != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.72),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.8),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '남은 기간',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: const Color(
                                  0xFFB87BA8,
                                ).withValues(alpha: 0.75),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${provider.remainingDays}일',
                              style: const TextStyle(
                                fontSize: 30,
                                height: 1,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFFB87BA8),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      _buildHistoryAction(provider),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    '만료일 ${DateFormat('yyyy년 M월 d일').format(subscription.endDate)}',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textSecondary.withValues(alpha: 0.9),
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
                color:
                    isSelected ? const Color(0xFFB87BA8) : Colors.transparent,
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
          _buildInfoItem('구독은 계정에 연결되어 같은 계정으로 로그인하면 자동 적용됩니다.'),
          _buildInfoItem('문의사항은 고객센터로 연락해 주세요.'),
          const SizedBox(height: 16),
          const Divider(height: 1, color: Color(0xFFE0E0E0)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildLinkButton('이용약관',
                  'https://sensational-baklava-76afbf.netlify.app/terms/gukitso'),
              const SizedBox(width: 24),
              _buildLinkButton('개인정보처리방침',
                  'https://sensational-baklava-76afbf.netlify.app/privacy/gukitso'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDiagnosticPanel(SubscriptionProvider provider) {
    final logs = provider.debugLogs.reversed.toList();
    final linesToCopy = <String>[
      'isAvailable=${provider.isAvailable}',
      'isPurchasing=${provider.isPurchasing}',
      'hasActiveSubscription=${provider.hasActiveSubscription}',
      'productCount=${provider.products.length}',
      'error=${provider.errorMessage ?? '-'}',
      'currentEndDate=${provider.currentSubscription?.endDate.toIso8601String() ?? '-'}',
      '',
      ...logs,
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111111),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.bug_report_outlined,
                color: Colors.greenAccent,
                size: 20,
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  '결제 진단 로그',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              _buildDebugAction(
                label: '복사',
                onTap: () async {
                  await Clipboard.setData(
                    ClipboardData(text: linesToCopy.join('\n')),
                  );
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('진단 로그를 복사했습니다.')),
                  );
                },
              ),
              const SizedBox(width: 8),
              _buildDebugAction(
                label: '초기화',
                onTap: () {
                  provider.clearDebugLogs();
                  provider.clearError();
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            '배포 앱에서도 최근 결제 흐름을 이 화면에서 바로 확인할 수 있습니다.',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 12,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildStatusChip(
                label: provider.isAvailable ? '스토어 연결됨' : '스토어 미연결',
                color: provider.isAvailable
                    ? Colors.greenAccent
                    : Colors.redAccent,
              ),
              _buildStatusChip(
                label: provider.isPurchasing ? '구매 진행중' : '대기중',
                color: provider.isPurchasing
                    ? Colors.orangeAccent
                    : Colors.blueGrey,
              ),
              _buildStatusChip(
                label: provider.hasActiveSubscription ? '이용권 활성' : '이용권 없음',
                color: provider.hasActiveSubscription
                    ? const Color(0xFFB87BA8)
                    : Colors.blueGrey,
              ),
              _buildStatusChip(
                label: '상품 ${provider.products.length}개',
                color: Colors.tealAccent,
              ),
            ],
          ),
          if (provider.errorMessage != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.redAccent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.redAccent.withValues(alpha: 0.5),
                ),
              ),
              child: Text(
                '최근 오류: ${provider.errorMessage}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  height: 1.4,
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.08),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '만료일: ${provider.currentSubscription != null ? DateFormat('yyyy-MM-dd HH:mm:ss').format(provider.currentSubscription!.endDate) : '-'}',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                    fontFamily: 'monospace',
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '남은 일수: ${provider.remainingDays}',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            constraints: const BoxConstraints(minHeight: 120, maxHeight: 260),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.28),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.08),
              ),
            ),
            child: logs.isEmpty
                ? const Text(
                    '아직 기록이 없습니다.\n구독 화면 진입이나 구매 시 로그가 여기에 쌓입니다.',
                    style: TextStyle(
                      color: Colors.white54,
                      fontSize: 12,
                      height: 1.5,
                    ),
                  )
                : ListView.separated(
                    itemCount: logs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 6),
                    itemBuilder: (context, index) {
                      return SelectableText(
                        logs[index],
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          height: 1.4,
                          fontFamily: 'monospace',
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildDebugAction({
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip({
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildLinkButton(String text, String url) {
    return GestureDetector(
      onTap: () async {
        final messenger = ScaffoldMessenger.of(context);
        final uri = Uri.parse(url);

        try {
          final launched = await launchUrl(
            uri,
            mode: LaunchMode.externalApplication,
          );
          if (!launched && mounted) {
            messenger.showSnackBar(
              const SnackBar(content: Text('외부 페이지를 열 수 없습니다.')),
            );
          }
        } catch (_) {
          if (mounted) {
            messenger.showSnackBar(
              const SnackBar(content: Text('외부 페이지를 열 수 없습니다.')),
            );
          }
        }
      },
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 14,
          color: Color(0xFFB87BA8),
          decoration: TextDecoration.underline,
          decorationColor: Color(0xFFB87BA8),
        ),
      ),
    );
  }

  Widget _buildHistoryAction(SubscriptionProvider provider) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _showPurchaseHistorySheet(provider),
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFFB87BA8).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(999),
          ),
          child: const Text(
            '기록 보기',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: Color(0xFFB87BA8),
              letterSpacing: -0.1,
            ),
          ),
        ),
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

  Future<void> _showPurchaseHistorySheet(SubscriptionProvider provider) async {
    final historyFuture = provider.getSubscriptionHistory();

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return SafeArea(
          top: false,
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.78,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: FutureBuilder<List<SubscriptionModel>>(
              future: historyFuture,
              builder: (context, snapshot) {
                return Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 44,
                          height: 4,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE6E6E6),
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        '결제 기록',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '언제 어떤 기간이 추가되었는지 확인할 수 있어요.',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondary.withValues(alpha: 0.9),
                        ),
                      ),
                      const SizedBox(height: 20),
                      if (snapshot.connectionState == ConnectionState.waiting)
                        const Expanded(
                          child: Center(
                            child: CircularProgressIndicator(
                              color: Color(0xFFB87BA8),
                            ),
                          ),
                        )
                      else if (snapshot.hasError)
                        Expanded(
                          child: _buildHistoryEmptyState(
                            title: '결제 기록을 불러오지 못했어요',
                            message: '잠시 후 다시 시도해 주세요.',
                            icon: Icons.error_outline,
                          ),
                        )
                      else if (!snapshot.hasData || snapshot.data!.isEmpty)
                        Expanded(
                          child: _buildHistoryEmptyState(
                            title: '아직 결제 기록이 없어요',
                            message: '첫 이용권 결제를 완료하면 여기에서 확인할 수 있어요.',
                            icon: Icons.receipt_long_outlined,
                          ),
                        )
                      else
                        Expanded(
                          child: ListView.separated(
                            itemCount: snapshot.data!.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final history = snapshot.data![index];
                              return _buildHistoryCard(provider, history);
                            },
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildHistoryEmptyState({
    required String title,
    required String message,
    required IconData icon,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 42,
              color: const Color(0xFFB87BA8).withValues(alpha: 0.75),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                height: 1.5,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryCard(
    SubscriptionProvider provider,
    SubscriptionModel history,
  ) {
    final plan = provider.getPlanById(history.planId);
    final planName = _getHistoryTitle(plan);
    final recordDate =
        history.sourceType == 'admin' ? history.updatedAt : history.createdAt;
    final recordDateLabel = DateFormat('yyyy년 M월 d일').format(recordDate);
    final endDate = DateFormat('yyyy년 M월 d일').format(history.endDate);
    final addedDaysLabel = _getHistoryAddedDaysLabel(history, plan);
    final badgeColor = _getHistoryBadgeColor(plan);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFAFAFA),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFECECEC)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      planName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '기록일 $recordDateLabel',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: badgeColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  addedDaysLabel,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: badgeColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _buildHistoryInfoRow('적용 종료일', endDate),
          if ((history.transactionId ?? '').isNotEmpty) ...[
            const SizedBox(height: 8),
            _buildHistoryInfoRow(
              '거래 ID',
              history.transactionId!,
              isMonospace: true,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildHistoryInfoRow(
    String label,
    String value, {
    bool isMonospace = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 72,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 13,
              height: 1.45,
              color: AppColors.textPrimary,
              fontFamily: isMonospace ? 'monospace' : null,
            ),
          ),
        ),
      ],
    );
  }

  String _getHistoryTitle(SubscriptionPlan? plan) {
    return plan?.name ?? '관리자 부여';
  }

  String _getHistoryAddedDaysLabel(
    SubscriptionModel history,
    SubscriptionPlan? plan,
  ) {
    final addedDays = _getHistoryAddedDays(history, plan);
    if (addedDays > 0) {
      return '+$addedDays일';
    }
    return plan == null ? '관리자 부여' : '기간 추가';
  }

  int _getHistoryAddedDays(
    SubscriptionModel history,
    SubscriptionPlan? plan,
  ) {
    if ((history.grantedDays ?? 0) > 0) {
      return history.grantedDays!;
    }

    if (plan != null) {
      return plan.durationMonths * 30;
    }

    final totalDays = history.endDate.difference(history.startDate).inDays;
    if (totalDays > 0) {
      return totalDays;
    }

    final createdToEndDays =
        history.endDate.difference(history.createdAt).inDays;
    return createdToEndDays > 0 ? createdToEndDays : 0;
  }

  Color _getHistoryBadgeColor(SubscriptionPlan? plan) {
    if (plan == null) {
      return const Color(0xFF8D8D8D);
    }
    return const Color(0xFFB87BA8);
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
