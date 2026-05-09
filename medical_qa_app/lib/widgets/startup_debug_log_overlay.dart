import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../design/app_radii.dart';
import '../design/app_spacing.dart';
import '../utils/app_colors.dart';
import '../utils/startup_debug_log.dart';

class StartupDebugLogOverlay extends StatefulWidget {
  final Widget child;

  const StartupDebugLogOverlay({
    super.key,
    required this.child,
  });

  @override
  State<StartupDebugLogOverlay> createState() => _StartupDebugLogOverlayState();
}

class _StartupDebugLogOverlayState extends State<StartupDebugLogOverlay> {
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        Positioned(
          left: AppSpacing.sm,
          right: AppSpacing.sm,
          bottom: MediaQuery.of(context).padding.bottom + AppSpacing.sm,
          child: SafeArea(
            top: false,
            child: AnimatedBuilder(
              animation: StartupDebugLog.instance,
              builder: (context, _) {
                return _expanded
                    ? _buildExpandedPanel(context)
                    : _buildCollapsedButton();
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCollapsedButton() {
    return Align(
      alignment: Alignment.bottomRight,
      child: Material(
        color: AppColors.accent,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadii.pill),
          onTap: () => setState(() => _expanded = true),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            child: Text(
              'STARTUP LOG (${StartupDebugLog.instance.entries.length})',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildExpandedPanel(BuildContext context) {
    final entries = StartupDebugLog.instance.entries;

    return Material(
      elevation: 8,
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(AppRadii.md),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.45,
        ),
        decoration: BoxDecoration(
          color: AppColors.surface.withValues(alpha: 0.96),
          borderRadius: BorderRadius.circular(AppRadii.md),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildHeader(context, entries.length),
            const Divider(height: 1, color: AppColors.border),
            Flexible(
              child: entries.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(AppSpacing.md),
                      child: Text(
                        '아직 시작 로그가 없습니다',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    )
                  : ListView.builder(
                      reverse: true,
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      itemCount: entries.length,
                      itemBuilder: (context, index) {
                        final entry = entries[entries.length - 1 - index];
                        return Padding(
                          padding:
                              const EdgeInsets.only(bottom: AppSpacing.xxs),
                          child: SelectableText(
                            entry.line,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontFamily: 'monospace',
                              fontSize: 10,
                              height: 1.35,
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, int count) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.sm,
        AppSpacing.xs,
        AppSpacing.xs,
        AppSpacing.xs,
      ),
      child: Row(
        children: [
          const Icon(
            Icons.bug_report_rounded,
            size: 18,
            color: AppColors.accent,
          ),
          const SizedBox(width: AppSpacing.xs),
          Expanded(
            child: Text(
              'STARTUP LOG $count',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          IconButton(
            tooltip: '복사',
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.copy_rounded, size: 18),
            onPressed: () async {
              await Clipboard.setData(
                ClipboardData(text: StartupDebugLog.instance.dump()),
              );
              if (!context.mounted) return;
              ScaffoldMessenger.maybeOf(context)?.showSnackBar(
                const SnackBar(content: Text('시작 로그를 복사했습니다')),
              );
            },
          ),
          IconButton(
            tooltip: '지우기',
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.delete_outline_rounded, size: 18),
            onPressed: StartupDebugLog.instance.clear,
          ),
          IconButton(
            tooltip: '접기',
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.expand_more_rounded, size: 20),
            onPressed: () => setState(() => _expanded = false),
          ),
        ],
      ),
    );
  }
}
