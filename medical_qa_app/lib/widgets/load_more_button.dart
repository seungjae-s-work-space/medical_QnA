import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

class LoadMoreButton extends StatelessWidget {
  final bool isLoading;
  final VoidCallback? onPressed;
  final Color accentColor;

  const LoadMoreButton({
    super.key,
    required this.isLoading,
    required this.onPressed,
    this.accentColor = AppColors.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: isLoading ? null : onPressed,
          icon: isLoading
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.expand_more_rounded, size: 20),
          label: Text(isLoading ? '불러오는 중' : '더보기'),
          style: ElevatedButton.styleFrom(
            backgroundColor: accentColor,
            disabledBackgroundColor: AppColors.inputBackground,
            disabledForegroundColor: AppColors.textSecondary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 13),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
            ),
            textStyle: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
