import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('chat banner keeps a fixed cropped height', () {
    final source = File('lib/screens/user/home_screen.dart').readAsStringSync();

    expect(source, contains('height: 133'));
    expect(source, contains('fit: BoxFit.cover'));
  });
}
