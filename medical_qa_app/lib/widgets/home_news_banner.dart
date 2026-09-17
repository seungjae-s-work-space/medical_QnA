import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

class HomeNewsBanner extends StatelessWidget {
  const HomeNewsBanner({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '난임뉴스',
      child: Material(
        color: AppColors.newsSurfaceSoft,
        borderRadius: BorderRadius.circular(20),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(
            width: double.infinity,
            height: 100,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  const Icon(Icons.newspaper_rounded,
                      color: AppColors.info, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      '난임뉴스',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                  const Icon(Icons.arrow_forward_rounded,
                      color: AppColors.info),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
