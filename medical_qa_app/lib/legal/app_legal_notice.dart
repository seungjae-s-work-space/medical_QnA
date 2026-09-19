class AppLegalSection {
  final String title;
  final List<String> paragraphs;

  const AppLegalSection({
    required this.title,
    required this.paragraphs,
  });
}

class AppLegalNotice {
  AppLegalNotice._();

  static const String title = '이용약관 및 결제 안내';
  static const String supportPhone = '+821023852382';
  static const String supportEmail = 'devethanyoon@gmail.com';

  static const List<AppLegalSection> sections = [
    AppLegalSection(
      title: '서비스 이용약관',
      paragraphs: [
        '본 서비스는 난임 관련 정보, 상담, 공지, 뉴스, 영상 콘텐츠를 제공하는 회원제(무료) 서비스입니다.',
        '이용자는 관련 법령과 서비스 운영 정책을 준수해야 하며, 법령에 위배되거나 공서양속을 해치는 내용, 성적·폭력적·모욕적 표현 등 운영 원칙에 반하는 행위는 제한될 수 있습니다.',
      ],
    ),
    AppLegalSection(
      title: '결제 및 환불 안내',
      paragraphs: [
        '현재 본 서비스는 무료로 제공되며, 앱 내 유료 콘텐츠, 인앱결제, 정기결제, 유료 전환 기능을 제공하지 않습니다.',
        '따라서 현재 서비스에서는 결제, 환불, 부가가치세 포함 여부, 청약철회, 정기결제 해지 및 중도해지에 관한 사항이 현재 해당되지 않습니다.',
      ],
    ),
    AppLegalSection(
      title: '청약철회 및 유료 전환 안내',
      paragraphs: [
        '향후 유료서비스 또는 결제 기능을 제공하는 경우, 이용자가 결제 전에 가격, 결제 방법, 부가가치세 포함 여부, 환불 기준, 청약철회 가능 여부 및 방법, 정기결제 해지 방법 등을 명확히 확인할 수 있도록 사전에 고지하고 관련 약관을 개정합니다.',
      ],
    ),
    AppLegalSection(
      title: '문의',
      paragraphs: [
        '서비스 이용 문의는 아래 연락처 또는 앱 내 상담 채널을 통해 접수할 수 있습니다.',
        '전화번호: +821023852382',
        '이메일: devethanyoon@gmail.com',
      ],
    ),
  ];
}
