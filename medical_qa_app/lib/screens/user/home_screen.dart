import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/notification_service.dart';
import '../../services/notice_service.dart';
import '../../models/notice_model.dart';
import '../../utils/app_colors.dart';
import 'chat_screen.dart';
import 'encyclopedia_screen.dart';
import 'news_screen.dart';
import 'notice_screen.dart';
import 'video_screen.dart';
import 'subscription_screen.dart';
import '../../providers/subscription_provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final NotificationService _notificationService = NotificationService();
  final NoticeService _noticeService = NoticeService();
  bool _notificationsEnabled = true;
  int _currentIndex = 0;
  DateTime? _lastBackPressTime;
  NoticeModel? _latestNotice;
  StreamSubscription? _noticeSubscription;

  /// 게스트 모드에서 로그인 필요 기능 접근 시 로그인 유도 다이얼로그
  void _showLoginRequiredDialog(String feature) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: const Text(
          '로그인이 필요합니다',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: Color(0xFF333333),
          ),
        ),
        content: Text(
          '$feature 기능을 이용하시려면\n로그인이 필요합니다.',
          style: const TextStyle(
            fontSize: 16,
            color: Color(0xFF666666),
            height: 1.5,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              '취소',
              style: TextStyle(
                fontSize: 16,
                color: Color(0xFF888888),
              ),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              final authProvider =
                  Provider.of<AuthProvider>(context, listen: false);
              authProvider.exitGuestMode();
            },
            child: const Text(
              '로그인하기',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFFB87BA8),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 게스트 모드 체크 후 기능 실행
  bool _checkGuestAndShowLogin(String feature) {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    if (authProvider.isGuest) {
      _showLoginRequiredDialog(feature);
      return true; // 게스트임
    }
    return false; // 게스트 아님
  }

  // 추천 전문의 리스트
  final List<Map<String, String>> _doctors = const [
    {'name': '허창영', 'hospital': '마리아에스'},
    {'name': '정재훈', 'hospital': '마리아플러스'},
    {'name': '이성구', 'hospital': '대구마리아'},
    {'name': '김명신', 'hospital': '아이오라여성의원'},
    {'name': '문경용', 'hospital': '아이오라여성의원'},
    {'name': '조정현', 'hospital': '사랑아이여성의원'},
    {'name': '원형재', 'hospital': '사랑아이여성의원'},
    {'name': '정다정', 'hospital': '에이치아이여성의원'},
    {'name': '김나영', 'hospital': '에이치아이여성의원'},
    {'name': '정미경', 'hospital': '서울라헬여성의원'},
    {'name': '양광문', 'hospital': '수지마리아'},
    {'name': '조재동', 'hospital': '엘르메디산부인과'},
    {'name': '김광례', 'hospital': '인천아인병원'},
    {'name': '김미경', 'hospital': '사랑아이여성의원'},
    {'name': '이윤태', 'hospital': '전 수목여성의원'},
    {'name': '백은찬', 'hospital': '분당제일여성병원'},
    {'name': '최범채', 'hospital': '시엘병원'},
    {'name': '정현정', 'hospital': '서울라헬여성의원'},
    {'name': '이희선', 'hospital': '서울라헬여성의원'},
    {'name': '서주태', 'hospital': '서주태비뇨의학과'},
    {'name': '박정원', 'hospital': '원탑비뇨기과'},
    {'name': '한지은', 'hospital': '미래연여성의원'},
    {'name': '강진희', 'hospital': '미래연여성의원'},
    {'name': '석현하', 'hospital': '미래연여성의원'},
    {'name': '이상찬', 'hospital': '부산세화병원'},
    {'name': '김진영', 'hospital': '베스트오브미'},
    {'name': '구화선', 'hospital': '베스트오브미'},
    {'name': '송인옥', 'hospital': '베스트오브미'},
    {'name': '김주영', 'hospital': '새란병원'},
    {'name': '서영석', 'hospital': '대전미즈의원'},
    {'name': '서동호', 'hospital': '동탄제일아이희망클리닉'},
    {'name': '유소은', 'hospital': '춘천아름다운산부인과'},
  ];

  @override
  void initState() {
    super.initState();
    _loadNotificationSetting();
    _loadLatestNotice();
  }

  @override
  void dispose() {
    _noticeSubscription?.cancel();
    super.dispose();
  }

  void _loadLatestNotice() {
    _noticeSubscription = _noticeService.getPublishedNotices().listen(
      (notices) {
        if (mounted && notices.isNotEmpty) {
          setState(() {
            _latestNotice = notices.first;
          });
        }
      },
      onError: (e) {
        debugPrint('Notice stream error: $e');
      },
    );
  }

  Future<void> _loadNotificationSetting() async {
    final enabled = await _notificationService.getNotificationEnabled();
    if (mounted) {
      setState(() {
        _notificationsEnabled = enabled;
      });
    }
  }

  Future<void> _toggleNotification() async {
    final newValue = !_notificationsEnabled;
    setState(() {
      _notificationsEnabled = newValue;
    });
    await _notificationService.setNotificationEnabled(newValue);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(newValue ? '알림이 켜졌습니다' : '알림이 꺼졌습니다'),
          duration: const Duration(seconds: 2),
          backgroundColor: AppColors.textPrimary,
        ),
      );
    }
  }

  void _showAboutSheet() {
    // 바텀시트 전용 색상
    const sheetBg = Colors.white;
    const textPrimary = Color(0xFF333333);
    const textSecondary = Color(0xFF888888);
    const dividerColor = Color(0xFFE8E8E8);
    const accentColor = Color(0xFF5B8BA8);
    const cardBg = Color(0xFFF8F8F8);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: sheetBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            // 드래그 핸들
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: dividerColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // 헤더
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    '난임톡톡 소개',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: textPrimary,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: textSecondary),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: dividerColor),
            // 내용
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 서비스 소개
                    const Text(
                      '〈골통주부의 난임&상담톡〉은 『임신의 기술』, 『난임의사에게 속지 않는 법』의 저자이자 난임 전문 기자인 이승주가, 국내 난임 분야에서 임상 경험과 전문성을 인정받은 26인의 의료진의 자문과 협력을 바탕으로 개설한 난임 정보·상담 중심의 채팅 플랫폼입니다.',
                      style: TextStyle(
                        fontSize: 16,
                        color: textPrimary,
                        height: 1.7,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 개인정보 보호
                    const Text(
                      '본 플랫폼을 통한 채팅 내용은 정보통신망 이용촉진 및 정보보호 등에 관한 법률 및 관련 개인정보 보호 법령에 따라 이용자와 상담자 간의 비공개를 원칙으로 하며, 운영자 또는 제3자에게 임의로 공개되지 않습니다.',
                      style: TextStyle(
                        fontSize: 16,
                        color: textPrimary,
                        height: 1.7,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 상담 가능 내용
                    const Text(
                      '채팅에서는 난임시술(인공수정, 체외수정시술 등)에 관한 의학적 정보 제공, 치료 과정 전반에 대한 이해를 돕기 위한 설명, 그리고 난임 과정에서 발생하는 일상적 고민과 감정에 대한 소통이 가능합니다.',
                      style: TextStyle(
                        fontSize: 16,
                        color: textPrimary,
                        height: 1.7,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 이용 제한 안내
                    Text(
                      '다만, 관련 법령에 위배되거나 공서양속을 해치는 내용, 성적·폭력적·모욕적 표현 등 플랫폼 운영 원칙에 반하는 대화는 사전 고지 없이 이용 제한 또는 강제 퇴장 조치가 이루어질 수 있습니다.',
                      style: TextStyle(
                        fontSize: 16,
                        color: textSecondary.withValues(alpha: 0.9),
                        height: 1.7,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 의료행위 면책
                    Text(
                      '아울러 본 플랫폼은 의료법상 의료행위 또는 진료를 제공하는 공간이 아니며, 특정 의료기관이나 특정 의료인을 소개·알선·유인하거나 이를 목적으로 하지 않습니다. 전국 각 지역의 난임 의료 환경과 제도, 진료 구조에 대한 일반적 정보 제공은 가능하나, 개별 병원이나 의료인에 대한 선택은 전적으로 이용자의 자율적 판단에 따릅니다.',
                      style: TextStyle(
                        fontSize: 16,
                        color: textSecondary.withValues(alpha: 0.9),
                        height: 1.7,
                      ),
                    ),
                    const SizedBox(height: 32),

                    // 자문위원단 섹션
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.verified,
                                size: 18,
                                color: accentColor,
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                '자문위원단',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: textPrimary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '본 자문위원단은 난임 진료 및 생식의학 분야에서의 임상 경험과 전문성을 바탕으로, 본 플랫폼이 제공하는 정보의 의학적 정확성·공익성·중립성을 확보하기 위한 자문 및 검토 역할을 수행합니다.',
                            style: TextStyle(
                              fontSize: 15,
                              color: textSecondary.withValues(alpha: 0.9),
                              height: 1.6,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '다만, 자문위원의 참여는 개별 이용자에 대한 진료, 처방 또는 의료행위를 의미하지 않으며, 특정 의료기관이나 의료인을 추천·알선·유인하는 행위와는 무관함을 명확히 합니다.',
                            style: TextStyle(
                              fontSize: 15,
                              color: textSecondary.withValues(alpha: 0.9),
                              height: 1.6,
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Divider(color: dividerColor),
                          const SizedBox(height: 12),
                          // 의사 목록
                          ..._doctors.map((doctor) => Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Row(
                                  children: [
                                    Text(
                                      '${doctor['name']} 원장',
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w500,
                                        color: textPrimary,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        doctor['hospital']!,
                                        style: const TextStyle(
                                          fontSize: 15,
                                          color: textSecondary,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              )),
                        ],
                      ),
                    ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openSubscriptionScreen() {
    if (_checkGuestAndShowLogin('무제한 상담')) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final subscriptionProvider =
        Provider.of<SubscriptionProvider>(context, listen: false);

    // 구독 프로바이더 초기화
    if (authProvider.currentUser != null) {
      subscriptionProvider.initialize(authProvider.currentUser!.userId);
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const SubscriptionScreen(),
      ),
    );
  }

  Widget _buildHomeContent() {
    return SingleChildScrollView(
      padding: const EdgeInsets.only(left: 20, right: 20, top: 16, bottom: 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // 앱바 이미지
          Image.asset(
            'assets/images/appbar_section4xreal.png',
            height: 65,
            fit: BoxFit.contain,
          ),
          const SizedBox(height: 16),
          // 채팅하기 배너 (이미지로 대체 예정)
          _ChatBanner(
            onTap: _navigateToChat,
          ),

          // 로고 영역
          _buildLogoSection(),
          const SizedBox(height: 24),

          // 공지사항 배너
          _buildNoticeBanner(),
          const SizedBox(height: 12),

          // 상단 2개 메뉴 (난임백과, 난임톡톡 소개)
          Row(
            children: [
              Expanded(
                child: _NewMenuCard(
                  title: '난임뉴스',
                  titleColor: const Color(0xFFBC843D),
                  icon: Icons.public,
                  color: const Color(0xFFFBF2D1),
                  iconColor: const Color(0xFFBC843D),
                  buttonBorderColor: const Color(0xFFBC843D),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => Scaffold(
                          backgroundColor: AppColors.background,
                          appBar: AppBar(
                            backgroundColor: AppColors.background,
                            elevation: 0,
                            leading: IconButton(
                              icon: const Icon(Icons.arrow_back,
                                  color: AppColors.textPrimary),
                              onPressed: () => Navigator.pop(context),
                            ),
                            title: const Text(
                              '난임뉴스',
                              style: TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 20,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            centerTitle: true,
                          ),
                          body: const NewsScreen(),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _NewMenuCard(
                  title: '난임톡톡 소개',
                  titleColor: const Color(0xFF5288B1),
                  icon: Icons.assignment_outlined,
                  color: const Color(0xFFDCEFFF),
                  iconColor: const Color(0xFF5288B1),
                  buttonBorderColor: const Color(0xFF5288B1),
                  onTap: _showAboutSheet,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // 난임뉴스 (왼쪽) + 아기성공TV, 무제한상담 (오른쪽 Column)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 왼쪽: 난임뉴스 (큰 카드)
              Expanded(
                child: _NewMenuCard(
                  title: '난임백과',
                  titleColor: const Color(0xFF5288B1),
                  icon: Icons.menu_book_rounded,
                  color: const Color(0xFFDCEFFF),
                  iconColor: const Color(0xFF5288B1),
                  buttonBorderColor: const Color(0xFF5288B1),
                  onTap: () => setState(() => _currentIndex = 1),
                ),
              ),
              const SizedBox(width: 12),
              // 오른쪽: 아기성공TV + 무제한상담 (Column)
              Expanded(
                child: Column(
                  children: [
                    _MiniMenuCard(
                      title: '아기성공TV',
                      icon: Icons.play_circle_filled,
                      color: const Color(0xFFFFCDD2),
                      iconColor: const Color(0xFFE62B83),
                      textColor: const Color(0xFFE62B83),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => Scaffold(
                              backgroundColor: AppColors.background,
                              appBar: AppBar(
                                backgroundColor: AppColors.background,
                                elevation: 0,
                                leading: IconButton(
                                  icon: const Icon(Icons.arrow_back,
                                      color: AppColors.textPrimary),
                                  onPressed: () => Navigator.pop(context),
                                ),
                                title: const Text(
                                  '아기성공TV',
                                  style: TextStyle(
                                    color: AppColors.textPrimary,
                                    fontSize: 20,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                centerTitle: true,
                              ),
                              body: const VideoScreen(),
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 8),
                    _MiniMenuCard(
                      title: '무제한 상담',
                      icon: Icons.coffee_outlined,
                      color: const Color(0xFFECC2E3),
                      iconColor: const Color(0xFF8A5B80),
                      textColor: const Color(0xFF8A5B80),
                      onTap: () => _openSubscriptionScreen(),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLogoSection() {
    return Image.asset(
      'assets/images/loggo_section4x.png',
      width: double.infinity,
      fit: BoxFit.contain,
    );
  }

  Widget _buildNoticeBanner() {
    return GestureDetector(
      onTap: () {
        if (_checkGuestAndShowLogin('공지사항')) return;
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => Scaffold(
              backgroundColor: AppColors.background,
              appBar: AppBar(
                backgroundColor: AppColors.background,
                elevation: 0,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back,
                      color: AppColors.textPrimary),
                  onPressed: () => Navigator.pop(context),
                ),
                title: const Text(
                  '공지사항',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                centerTitle: true,
              ),
              body: const NoticeScreen(),
            ),
          ),
        );
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFFFCF8ED),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.campaign_rounded,
                color: Color(0xffE62B83),
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                _latestNotice?.content ?? '공지사항을 확인해주세요',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF696969),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: Color(0xFF696969),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEncyclopediaContent() {
    return const EncyclopediaScreen();
  }

  Widget _buildMyPageContent() {
    final authProvider = Provider.of<AuthProvider>(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.only(left: 20, right: 20, top: 20, bottom: 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 프로필 섹션
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFF0D8E8),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Row(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    color: Color(0xFFB87BA8),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.person,
                    size: 32,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        authProvider.currentUser?.name ?? '사용자',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        authProvider.currentUser?.email ?? '',
                        style: const TextStyle(
                          fontSize: 15,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 설정 메뉴
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFFAFAFA),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              children: [
                _buildSettingItem(
                  icon: _notificationsEnabled
                      ? Icons.notifications_active
                      : Icons.notifications_off_outlined,
                  title: '알림 설정',
                  iconColor: const Color(0xFF5B8BA8),
                  trailing: Switch(
                    value: _notificationsEnabled,
                    onChanged: (_) => _toggleNotification(),
                    activeColor: const Color(0xFF5B8BA8),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Divider(height: 1, color: Color(0xFFE8E8E8)),
                ),
                _buildSettingItem(
                  icon: Icons.info_outline,
                  title: '난임톡톡 소개',
                  iconColor: const Color(0xFFD4A853),
                  onTap: _showAboutSheet,
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Divider(height: 1, color: Color(0xFFE8E8E8)),
                ),
                _buildSettingItem(
                  icon: Icons.logout,
                  title: '로그아웃',
                  iconColor: Colors.red.shade300,
                  onTap: () => authProvider.signOut(),
                  textColor: Colors.red.shade400,
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Divider(height: 1, color: Color(0xFFE8E8E8)),
                ),
                _buildSettingItem(
                  icon: Icons.person_remove_outlined,
                  title: '회원 탈퇴',
                  iconColor: Colors.grey.shade400,
                  onTap: () => _showDeleteAccountDialog(authProvider),
                  textColor: Colors.grey.shade500,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog(AuthProvider authProvider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: const Text(
          '회원 탈퇴',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: Color(0xFF333333),
          ),
        ),
        content: const Text(
          '정말 탈퇴하시겠습니까?\n\n'
          '탈퇴 시 모든 데이터(상담 내역, 구독 정보 등)가 삭제되며 복구할 수 없습니다.',
          style: TextStyle(
            fontSize: 16,
            color: Color(0xFF666666),
            height: 1.5,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              '취소',
              style: TextStyle(
                fontSize: 16,
                color: Color(0xFF888888),
              ),
            ),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              _handleDeleteAccount(authProvider);
            },
            child: Text(
              '탈퇴하기',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.red.shade400,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleDeleteAccount(AuthProvider authProvider) async {
    // 로딩 다이얼로그 표시
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    final success = await authProvider.deleteAccount();

    if (mounted) {
      Navigator.pop(context); // 로딩 다이얼로그 닫기

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('회원 탈퇴가 완료되었습니다.'),
            backgroundColor: Color(0xFF333333),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.errorMessage ?? '탈퇴에 실패했습니다.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildSettingItem({
    required IconData icon,
    required String title,
    VoidCallback? onTap,
    Widget? trailing,
    Color? textColor,
    Color? iconColor,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: (iconColor ?? AppColors.textSecondary).withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child:
            Icon(icon, color: iconColor ?? AppColors.textSecondary, size: 22),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w500,
          color: textColor ?? AppColors.textPrimary,
        ),
      ),
      trailing: trailing ??
          (onTap != null
              ? Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8E8E8),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.chevron_right,
                      color: AppColors.textSecondary, size: 20),
                )
              : null),
      onTap: onTap,
    );
  }

  void _navigateToChat() {
    if (_checkGuestAndShowLogin('채팅')) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const ChatScreen(),
      ),
    );
  }

  String _getAppBarTitle() {
    switch (_currentIndex) {
      case 0:
        return '난임상담톡';
      case 1:
        return '난임백과';
      case 2:
        return '채팅';
      case 3:
        return '마이페이지';
      default:
        return '난임상담톡';
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (_currentIndex != 0) {
          // 다른 탭에서는 홈으로 이동
          setState(() => _currentIndex = 0);
        } else {
          // 홈 탭에서는 더블탭으로 종료
          final now = DateTime.now();
          if (_lastBackPressTime == null ||
              now.difference(_lastBackPressTime!) >
                  const Duration(seconds: 2)) {
            _lastBackPressTime = now;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('뒤로가기를 한 번 더 누르면 종료됩니다'),
                duration: Duration(seconds: 2),
                backgroundColor: Color(0xFF333333),
              ),
            );
          } else {
            Navigator.of(context).pop();
          }
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        extendBody: true,
        appBar: _currentIndex != 0
            ? AppBar(
                backgroundColor: AppColors.background,
                elevation: 0,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
                  onPressed: () => setState(() => _currentIndex = 0),
                ),
                title: Text(
                  _getAppBarTitle(),
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                centerTitle: true,
              )
            : null,
        body: SafeArea(
          bottom: false,
          child: IndexedStack(
            index: _currentIndex == 2 ? 0 : _currentIndex, // 채팅은 별도 화면으로 이동
            children: [
              _buildHomeContent(),
              _buildEncyclopediaContent(),
              _buildHomeContent(), // placeholder (채팅은 Navigator로 이동)
              _buildMyPageContent(),
            ],
          ),
        ),
        floatingActionButton: _currentIndex == 0
            ? FloatingActionButton(
                onPressed: () {
                  if (_checkGuestAndShowLogin('마이페이지')) return;
                  setState(() => _currentIndex = 3);
                },
                backgroundColor: const Color(0xFF2C2C2C),
                child: const Icon(Icons.person_outline, color: Colors.white),
              )
            : null,
        // bottomNavigationBar: Container(
        //   padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        //   decoration: const BoxDecoration(
        //     color: Colors.transparent,
        //   ),
        //   child: Container(
        //     height: 64,
        //     decoration: BoxDecoration(
        //       color: const Color(0xFF2C2C2C),
        //       borderRadius: BorderRadius.circular(32),
        //     ),
        //     child: Row(
        //       mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        //       children: [
        //         _buildNavItem(0, Icons.home_outlined, Icons.home),
        //         _buildNavItem(1, Icons.grid_view_outlined, Icons.grid_view),
        //         _buildNavItem(2, Icons.chat_bubble_outline, Icons.chat_bubble),
        //         _buildNavItem(3, Icons.person_outline, Icons.person),
        //       ],
        //     ),
        //   ),
        // ),

      ),
    );
  }
}

// 채팅하기 배너 위젯
class _ChatBanner extends StatelessWidget {
  final VoidCallback onTap;

  const _ChatBanner({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Image.asset(
          'assets/images/chatting4xreal.png',
          width: double.infinity,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}

// 새 메뉴 카드 (난임백과, 난임톡톡 소개)
class _NewMenuCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final Color iconColor;
  final Color buttonBorderColor;
  final Color titleColor;
  final VoidCallback onTap;

  const _NewMenuCard({
    required this.title,
    required this.icon,
    required this.color,
    required this.iconColor,
    required this.buttonBorderColor,
    this.titleColor = AppColors.textPrimary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 137,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 아이콘
            Icon(
              icon,
              size: 28,
              color: iconColor,
            ),
            const Spacer(),
            // 타이틀
            Text(
              title,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: titleColor,
              ),
            ),
            const SizedBox(height: 10),
            // view 버튼 (테두리 스타일)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.transparent,
                border: Border.all(color: buttonBorderColor, width: 1.5),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                'view',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: buttonBorderColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// 미니 메뉴 카드 (오른쪽 Column용)
class _MiniMenuCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final Color iconColor;
  final Color textColor;
  final VoidCallback onTap;

  const _MiniMenuCard({
    required this.title,
    required this.icon,
    required this.color,
    required this.iconColor,
    required this.textColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 64,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 20,
              color: iconColor,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: textColor,
                ),
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: iconColor,
              size: 18,
            ),
          ],
        ),
      ),
    );
  }
}
