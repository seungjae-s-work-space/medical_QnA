import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// 날짜 구분선 - 모던하고 깔끔한 디자인
class DateDivider extends StatelessWidget {
  final DateTime date;

  // 채팅 화면 전용 색상
  static const Color _dividerColor = Color(0xFFE8E8E8);
  static const Color _textColor = Color(0xFF999999);

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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: Container(
              height: 1,
              color: _dividerColor,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              _formatDate(date),
              style: const TextStyle(
                fontSize: 12,
                color: _textColor,
                fontWeight: FontWeight.w500,
              ),
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
