import 'package:flutter/material.dart';
import '../design/app_radii.dart';
import '../design/app_spacing.dart';
import '../utils/app_colors.dart';

class MembershipRequiredDialog extends StatelessWidget {
  final VoidCallback onContinuePressed;
  final VoidCallback onLoginPressed;

  const MembershipRequiredDialog({
    super.key,
    required this.onContinuePressed,
    required this.onLoginPressed,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadii.lg),
      ),
      title: const Text(
        '로그인이 필요합니다',
        style: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
      ),
      content: const Text(
        '본 서비스는 회원제(무료)로 운영됩니다.',
        style: TextStyle(
          fontSize: 16,
          color: AppColors.textSecondary,
          height: 1.5,
        ),
      ),
      actionsPadding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        0,
        AppSpacing.md,
        AppSpacing.md,
      ),
      actions: [
        TextButton(
          onPressed: onContinuePressed,
          child: const Text(
            '계속 보기',
            style: TextStyle(
              fontSize: 16,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        TextButton(
          onPressed: onLoginPressed,
          child: const Text(
            '로그인하러가기',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.accent,
            ),
          ),
        ),
      ],
    );
  }
}
