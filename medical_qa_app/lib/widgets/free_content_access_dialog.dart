import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

class FreeContentAccessDialog extends StatelessWidget {
  const FreeContentAccessDialog({
    super.key,
    required this.remainingViews,
    required this.limit,
  });

  final int remainingViews;
  final int limit;

  @override
  Widget build(BuildContext context) {
    final usedViews = math.max(limit - remainingViews, 0);
    final isLastFreeView = remainingViews == 0;

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: const Color(0xFFF6EEE5),
                borderRadius: BorderRadius.circular(28),
              ),
              child: const Icon(
                Icons.visibility_rounded,
                size: 42,
                color: AppColors.premium,
              ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF6DA),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '무료 열람 $usedViews/$limit',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF8A6A12),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              isLastFreeView ? '이번이 마지막 무료 열람이에요' : '무료 열람이 적용되었어요',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              isLastFreeView
                  ? '총 $limit번의 무료 열람 중 $usedViews번째 기회를 사용했어요.\n이번 열람까지 이용 가능하며, 다음부터는 이용권이 필요합니다.'
                  : '총 $limit번의 무료 열람 중 $usedViews번째 기회를 사용했어요.\n앞으로 $remainingViews번 더 볼 수 있습니다.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 15,
                color: AppColors.textSecondary,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: _InfoCard(
                    label: '이번까지 사용',
                    value: '$usedViews/$limit',
                    backgroundColor: AppColors.backgroundAlt,
                    valueColor: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _InfoCard(
                    label: '앞으로 남은 횟수',
                    value: '$remainingViews회',
                    backgroundColor: const Color(0xFFFFF6DA),
                    valueColor: const Color(0xFF8A6A12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.premium,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),
                child: const Text(
                  '계속 보기',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.label,
    required this.value,
    required this.backgroundColor,
    required this.valueColor,
  });

  final String label;
  final String value;
  final Color backgroundColor;
  final Color valueColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        children: [
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }
}
