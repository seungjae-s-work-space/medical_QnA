import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/message_model.dart';
import '../utils/app_colors.dart';

/// 채팅이 아닌 "기록지" 형태의 메시지
/// - 말풍선 꼬리 없음
/// - 읽음 표시 없음
/// - 같은 색, 명도만 다름
class MessageRecord extends StatelessWidget {
  final MessageModel message;
  final bool isUser;

  const MessageRecord({
    super.key,
    required this.message,
    required this.isUser,
  });

  @override
  Widget build(BuildContext context) {
    // isUser는 생성자에서 받은 값 사용

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 라벨: "질문" 또는 "답변"
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Text(
              isUser ? '질문' : '답변',
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w400,
                letterSpacing: 0.5,
              ),
            ),
          ),

          // 메시지 내용 - 기록지처럼
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isUser ? AppColors.userMessage : AppColors.adminMessage,
              borderRadius: BorderRadius.circular(2), // 부드럽게, 너무 둥글지 않게
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 텍스트
                Text(
                  message.text,
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.6, // 행간 넉넉
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w400,
                  ),
                ),

                // 이미지가 있으면
                if (message.imageUrl != null) ...[
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: Image.network(
                      message.imageUrl!,
                      fit: BoxFit.cover,
                    ),
                  ),
                ],

                // 시간 (작고 조용하게)
                const SizedBox(height: 8),
                Text(
                  DateFormat('HH:mm').format(message.createdAt),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
