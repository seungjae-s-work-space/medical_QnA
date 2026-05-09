import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/utils/startup_debug_log.dart';

void main() {
  group('StartupDebugLog', () {
    test('keeps only the newest entries within the limit', () {
      final log = StartupDebugLog(maxEntries: 2);

      log.add('first');
      log.add('second');
      log.add('third');

      expect(log.entries.map((entry) => entry.message), ['second', 'third']);
    });

    test('masks long identifiers for on-screen diagnostics', () {
      expect(
        StartupDebugLog.maskIdentifier('abcdefghijklmnopqrstuvwxyz'),
        'abcdef...wxyz',
      );
      expect(StartupDebugLog.maskIdentifier(null), 'null');
      expect(StartupDebugLog.maskIdentifier(''), 'empty');
    });
  });
}
