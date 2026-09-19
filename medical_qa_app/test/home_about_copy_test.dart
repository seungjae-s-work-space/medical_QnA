import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('home about copy uses the information-talk app name', () {
    final source = File('lib/screens/user/home_screen.dart').readAsStringSync();
    final appSource = File('lib/main.dart').readAsStringSync();
    final notificationSource =
        File('lib/services/notification_service.dart').readAsStringSync();

    expect(source, contains('〈골통주부의 난임&정보톡〉'));
    expect(source, contains("return '난임정보톡';"));
    expect(source, isNot(contains('난임&상담톡')));
    expect(source, isNot(contains("return '난임상담톡';")));
    expect(appSource, contains('골통주부의 난임&정보톡'));
    expect(appSource, isNot(contains('골통주부의 난임&상담톡')));
    expect(notificationSource, contains("appName: '난임&정보톡'"));
    expect(notificationSource, isNot(contains("appName: '난임&상담톡'")));
  });
}
