import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/models/user_model.dart';

void main() {
  test('serializes users without legacy subscription or free-view fields', () {
    final user = UserModel(
      userId: 'user-1',
      role: 'user',
      name: '테스트 사용자',
      email: 'user@example.com',
      createdAt: DateTime(2026),
    );

    final data = user.toMap();

    expect(data, isNot(containsPair('subscriptionId', anything)));
    expect(data, isNot(containsPair('subscriptionStatus', anything)));
    expect(data, isNot(containsPair('subscriptionEndDate', anything)));
    expect(data, isNot(containsPair('freeContentViewLimit', anything)));
    expect(data, isNot(containsPair('freeContentViewUsed', anything)));
  });
}
