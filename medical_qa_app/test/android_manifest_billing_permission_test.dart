import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Android manifest does not request Play Billing permission', () {
    final manifest = File('android/app/src/main/AndroidManifest.xml');

    expect(manifest.readAsStringSync(), isNot(contains('com.android.vending.BILLING')));
  });
}
