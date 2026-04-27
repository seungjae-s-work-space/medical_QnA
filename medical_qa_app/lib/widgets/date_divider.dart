import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../design/app_spacing.dart';
import '../utils/app_colors.dart';

/// 날짜 구분선 - 모던하고 깔끔한 디자인
class DateDivider extends StatelessWidget {
  final DateTime date;

  // 채팅 화면 전용 색상
  static const Color _dividerColor = AppColors.border;
  static const Color _textColor = AppColors.textTertiary;

  const DateDivider({super.key, required this.date});

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final targetDate = DateTime(date.year, date.month, date.day);

    if (targetDate == today) {
      return '오늘';
    } else if (targetDate == yesterday) {
      return '어제';
    } else {
      return DateFormat('M월 d일').format(date);
    }
  }

  @override
  Widget build(BuildContext context) {
    final labelStyle = Theme.of(context).textTheme.labelSmall?.copyWith(
          color: _textColor,
          fontWeight: FontWeight.w600,
        );

    return Padding(
      padding: const EdgeInsets.symmetric(
        vertical: AppSpacing.lg,
        horizontal: AppSpacing.md,
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              height: 1,
              color: _dividerColor,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Text(
              _formatDate(date),
              style: labelStyle,
            ),
          ),
          Expanded(
            child: Container(
              height: 1,
              color: _dividerColor,
            ),
          ),
        ],
      ),
    );
  }
}
