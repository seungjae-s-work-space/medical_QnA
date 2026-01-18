import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/message_model.dart';

/// 메시지 버블 - 모던하고 깔끔한 디자인
class MessageRecord extends StatelessWidget {
  final MessageModel message;
  final bool isUser;

  // 채팅 전용 색상
  static const Color _userBubbleColor = Color(0xFF5B8BA8);  // 파란색 (사용자)
  static const Color _adminBubbleColor = Color(0xFFF0F0F0); // 밝은 회색 (관리자)
  static const Color _adminIconBg = Color(0xFFE8F4FC);      // 아이콘 배경
  static const Color _adminIconColor = Color(0xFF5B8BA8);   // 아이콘 색상

  const MessageRecord({
    super.key,
    required this.message,
    required this.isUser,
  });

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            // 상담사 아이콘
            Container(
              width: 32,
              height: 32,
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: _adminIconBg,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.support_agent,
                size: 18,
                color: _adminIconColor,
              ),
            ),
          ],
          // 말풍선
          Flexible(
            child: Container(
              constraints: BoxConstraints(maxWidth: screenWidth * 0.7),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isUser ? _userBubbleColor : _adminBubbleColor,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: Radius.circular(isUser ? 18 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 18),
                ),
              ),
              child: IntrinsicWidth(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // 텍스트
                    Text(
                      message.text,
                      style: TextStyle(
                        fontSize: 17,
                        height: 1.5,
                        color: isUser ? Colors.white : const Color(0xFF333333),
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
                          fontSize: 12,
                          color: isUser
                              ? Colors.white.withValues(alpha: 0.7)
                              : const Color(0xFF999999),
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
