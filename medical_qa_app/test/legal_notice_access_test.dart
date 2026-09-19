import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('my page exposes the legal and payment notice', () {
    final source = File('lib/screens/user/home_screen.dart').readAsStringSync();

    expect(source, contains("import '../../legal/app_legal_notice.dart';"));
    expect(source, contains('void _showLegalNoticeSheet()'));
    expect(source, contains('Icons.policy_outlined'));
    expect(source, contains('AppLegalNotice.title'));
    expect(source, contains('onTap: _showLegalNoticeSheet'));
    expect(source, isNot(contains('Widget _buildLegalNoticeFooter()')));
    expect(source, isNot(contains('_buildLegalNoticeFooter(),')));
  });
}
