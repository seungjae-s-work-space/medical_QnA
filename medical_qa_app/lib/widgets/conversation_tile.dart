import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/conversation_model.dart';
import '../utils/app_colors.dart';

class ConversationTile extends StatelessWidget {
  final ConversationModel conversation;
  final VoidCallback onTap;

  const ConversationTile({
    super.key,
    required this.conversation,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    bool hasUnread = conversation.unreadByAdmin > 0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.backgroundAlt,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: hasUnread
              ? AppColors.textSecondary.withValues(alpha: 0.3)
              : AppColors.buttonBorder,
          width: 1,
        ),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 40,
          height: 40,
          decoration: const BoxDecoration(
            color: AppColors.adminMessage,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              conversation.userName[0].toUpperCase(),
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
        title: Text(
          conversation.userName,
          style: TextStyle(
            fontSize: 15,
            color: AppColors.textPrimary,
            fontWeight: hasUnread ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            conversation.lastMessage,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 14,
              height: 1.4,
              color: AppColors.textSecondary,
              fontWeight: hasUnread ? FontWeight.w500 : FontWeight.w400,
            ),
          ),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              DateFormat('MM/dd HH:mm').format(conversation.lastMessageAt),
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textSecondary,
                letterSpacing: 0.3,
              ),
            ),
            if (hasUnread) ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.adminMessage,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  conversation.unreadByAdmin.toString(),
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
