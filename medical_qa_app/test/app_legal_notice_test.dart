import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/legal/app_legal_notice.dart';

void main() {
  test('legal notice states payment-related items are not applicable', () {
    expect(AppLegalNotice.title, '이용약관 및 결제 안내');
    expect(AppLegalNotice.supportPhone, '+821023852382');
    expect(AppLegalNotice.supportEmail, 'devethanyoon@gmail.com');

    final body = AppLegalNotice.sections
        .expand((section) => [section.title, ...section.paragraphs])
        .join('\n');

    expect(body, contains('무료로 제공'));
    expect(body, contains('앱 내 유료 콘텐츠'));
    expect(body, contains('인앱결제'));
    expect(body, contains('정기결제'));
    expect(body, contains('유료 전환'));
    expect(body, contains('결제, 환불, 부가가치세 포함 여부, 청약철회'));
    expect(body, contains('현재 해당되지 않습니다'));
    expect(body, contains('향후 유료서비스 또는 결제 기능을 제공하는 경우'));
    expect(body, contains('전화번호: +821023852382'));
    expect(body, contains('이메일: devethanyoon@gmail.com'));
  });

  test('contact wording does not imply active payment support', () {
    final body = AppLegalNotice.sections
        .expand((section) => [section.title, ...section.paragraphs])
        .join('\n');

    expect(body, contains('서비스 이용 문의'));
    expect(body, isNot(contains('결제 관련 문의')));
  });
}
