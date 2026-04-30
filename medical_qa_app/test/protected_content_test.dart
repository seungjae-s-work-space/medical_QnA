import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/widgets/protected_content.dart';

void main() {
  testWidgets('ProtectedContent disables text selection for its subtree',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ProtectedContent(
            child: Text('protected article body'),
          ),
        ),
      ),
    );

    final selectionContainer = tester.widget<SelectionContainer>(
      find.byType(SelectionContainer),
    );

    expect(selectionContainer.delegate, isNull);
    expect(find.text('protected article body'), findsOneWidget);
  });
}
