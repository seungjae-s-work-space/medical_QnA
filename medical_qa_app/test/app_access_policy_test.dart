import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/services/app_access_policy.dart';

void main() {
  test('allows every app content area without a subscription', () {
    for (final feature in AppAccessFeature.values) {
      expect(
        AppAccessPolicy.canOpen(feature),
        isTrue,
        reason: '${feature.name} should be accessible while IAP is disabled',
      );
    }
  });

  test('hides the in-app purchase entry point', () {
    expect(AppAccessPolicy.showInAppPurchaseEntryPoint, isFalse);
  });
}
