import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/message_model.dart';
import '../utils/app_colors.dart';

/// 메시지 버블 - 따뜻하고 세련된 디자인
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
    final screenWidth = MediaQuery.of(context).size.width;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            // 상담사 아이콘
            Container(
              width: 30,
              height: 30,
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: AppColors.adminMessage,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: AppColors.divider,
                  width: 1,
                ),
              ),
              child: Icon(
                Icons.support_agent,
                size: 16,
                color: AppColors.textSecondary.withValues(alpha: 0.8),
              ),
            ),
          ],
          // 말풍선
          Flexible(
            child: Container(
              constraints: BoxConstraints(maxWidth: screenWidth * 0.7),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isUser ? AppColors.userMessage : AppColors.inputBackground,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: Radius.circular(isUser ? 18 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 18),
                ),
                border: isUser
                    ? null
                    : Border.all(color: AppColors.divider, width: 1),
              ),
              child: IntrinsicWidth(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // 텍스트
                    Text(
                      message.text,
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.5,
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w400,
                      ),
                    ),

                    // 이미지가 있으면
                    if (message.imageUrl != null) ...[
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          message.imageUrl!,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ],

                    // 시간
                    const SizedBox(height: 4),
                    Align(
                      alignment: Alignment.bottomRight,
                      child: Text(
                        DateFormat('HH:mm').format(message.createdAt),
                        style: TextStyle(
                          fontSize: 10,
                          color: AppColors.textTertiary.withValues(alpha: 0.7),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
