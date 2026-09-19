import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('iOS deployment target is 15.0 or later for App Store uploads', () {
    final podfile = File('ios/Podfile').readAsStringSync();
    final appFrameworkInfo =
        File('ios/Flutter/AppFrameworkInfo.plist').readAsStringSync();
    final project = File('ios/Runner.xcodeproj/project.pbxproj')
        .readAsStringSync();

    expect(podfile, contains("platform :ios, '15.0'"));
    expect(
      podfile,
      contains("config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'"),
    );
    expect(appFrameworkInfo, contains('<string>15.0</string>'));
    expect(project, isNot(contains('IPHONEOS_DEPLOYMENT_TARGET = 13.0;')));
    expect(
      RegExp(r'IPHONEOS_DEPLOYMENT_TARGET = 15\.0;')
          .allMatches(project)
          .length,
      greaterThanOrEqualTo(3),
    );
  });
}
