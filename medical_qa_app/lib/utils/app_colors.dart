import 'package:flutter/material.dart';

/// 웜그레이/아이보리 톤 - "말해도 되는 공간"
class AppColors {
  // 배경색 - 웜그레이/아이보리
  static const Color background = Color(0xFFF4F3F1);
  static const Color backgroundAlt = Color(0xFFEFEDE9);

  // 메시지 배경 - 같은 계열, 명도만 다름
  static const Color userMessage = Color(0xFFE8E6E2);      // 사용자 질문 (조금 진한 톤)
  static const Color adminMessage = Color(0xFFDCD9D4);     // 관리자 답변 (더 진한 톤)

  // 텍스트
  static const Color textPrimary = Color(0xFF3C3C3C);      // 본문
  static const Color textSecondary = Color(0xFF8A8A8A);    // 날짜, 라벨
  static const Color textTertiary = Color(0xFFB0B0B0);     // 안내 문구

  // 버튼 - 얇은 테두리
  static const Color buttonBorder = Color(0xFFD0CEC9);
  static const Color buttonText = Color(0xFF5A5A5A);

  // 구분선
  static const Color divider = Color(0xFFE0DED9);

  // 입력 필드
  static const Color inputBorder = Color(0xFFD8D6D1);
  static const Color inputBackground = Color(0xFFFAF9F7);
}
