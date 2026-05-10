import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/widgets/membership_required_dialog.dart';

void main() {
  testWidgets(
    'MembershipRequiredDialog explains free membership and offers content continuation',
    (tester) async {
      var continuePressed = false;
      var loginPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (_) => MembershipRequiredDialog(
                      onContinuePressed: () {
                        continuePressed = true;
                      },
                      onLoginPressed: () {
                        loginPressed = true;
                      },
                    ),
                  );
                },
                child: const Text('open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();

      expect(find.text('본 서비스는 회원제(무료)로 운영됩니다.'), findsOneWidget);
      expect(find.text('계속 보기'), findsOneWidget);
      expect(find.text('로그인하러가기'), findsOneWidget);

      await tester.tap(find.text('계속 보기'));
      await tester.pumpAndSettle();

      expect(continuePressed, isTrue);
      expect(loginPressed, isFalse);
    },
  );

  testWidgets(
    'MembershipRequiredDialog runs login action',
    (tester) async {
      var loginPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (_) => MembershipRequiredDialog(
                      onContinuePressed: () {},
                      onLoginPressed: () {
                        loginPressed = true;
                      },
                    ),
                  );
                },
                child: const Text('open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('로그인하러가기'));
      await tester.pumpAndSettle();

      expect(loginPressed, isTrue);
    },
  );
}
