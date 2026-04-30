import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/screenshot_protection_service.dart';

class ScreenshotWarningListener extends StatefulWidget {
  ScreenshotWarningListener({
    super.key,
    required this.contentType,
    required this.contentId,
    required this.contentTitle,
    required this.child,
    ScreenshotProtectionService? service,
  }) : service = service ?? ScreenshotProtectionService.instance;

  final String contentType;
  final String contentId;
  final String contentTitle;
  final Widget child;
  final ScreenshotProtectionService service;

  @override
  State<ScreenshotWarningListener> createState() =>
      _ScreenshotWarningListenerState();
}

class _ScreenshotWarningListenerState extends State<ScreenshotWarningListener> {
  StreamSubscription<void>? _subscription;

  @override
  void initState() {
    super.initState();
    _subscription = widget.service.screenshots.listen((_) {
      _handleScreenshot();
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  void _handleScreenshot() {
    if (!mounted) return;

    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      const SnackBar(
        content: Text(ScreenshotProtectionService.warningMessage),
      ),
    );

    final user = context.read<AuthProvider>().currentUser;
    unawaited(
      widget.service.recordScreenshotAttempt(
        contentType: widget.contentType,
        contentId: widget.contentId,
        contentTitle: widget.contentTitle,
        userId: user?.userId,
        userName: user?.name,
        userEmail: user?.email,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
