import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/notification_service.dart';
import '../../utils/app_colors.dart';
import 'chat_screen.dart';
import 'encyclopedia_screen.dart';
import 'news_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final NotificationService _notificationService = NotificationService();
  bool _notificationsEnabled = true;
  int _currentIndex = 0;

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
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.background,
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
                color: AppColors.divider,
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
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: AppColors.textSecondary),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: AppColors.divider),
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
                        fontSize: 14,
                        color: AppColors.textPrimary,
                        height: 1.7,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 개인정보 보호
                    const Text(
                      '본 플랫폼을 통한 채팅 내용은 정보통신망 이용촉진 및 정보보호 등에 관한 법률 및 관련 개인정보 보호 법령에 따라 이용자와 상담자 간의 비공개를 원칙으로 하며, 운영자 또는 제3자에게 임의로 공개되지 않습니다.',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textPrimary,
                        height: 1.7,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 상담 가능 내용
                    const Text(
                      '채팅에서는 난임시술(인공수정, 체외수정시술 등)에 관한 의학적 정보 제공, 치료 과정 전반에 대한 이해를 돕기 위한 설명, 그리고 난임 과정에서 발생하는 일상적 고민과 감정에 대한 소통이 가능합니다.',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textPrimary,
                        height: 1.7,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 이용 제한 안내
                    Text(
                      '다만, 관련 법령에 위배되거나 공서양속을 해치는 내용, 성적·폭력적·모욕적 표현 등 플랫폼 운영 원칙에 반하는 대화는 사전 고지 없이 이용 제한 또는 강제 퇴장 조치가 이루어질 수 있습니다.',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary.withValues(alpha: 0.9),
                        height: 1.7,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 의료행위 면책
                    Text(
                      '아울러 본 플랫폼은 의료법상 의료행위 또는 진료를 제공하는 공간이 아니며, 특정 의료기관이나 특정 의료인을 소개·알선·유인하거나 이를 목적으로 하지 않습니다. 전국 각 지역의 난임 의료 환경과 제도, 진료 구조에 대한 일반적 정보 제공은 가능하나, 개별 병원이나 의료인에 대한 선택은 전적으로 이용자의 자율적 판단에 따릅니다.',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary.withValues(alpha: 0.9),
                        height: 1.7,
                      ),
                    ),
                    const SizedBox(height: 32),

                    // 자문위원단 섹션
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.inputBackground,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.divider),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.verified,
                                size: 18,
                                color: AppColors.textSecondary.withValues(alpha: 0.8),
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                '자문위원단',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '본 자문위원단은 난임 진료 및 생식의학 분야에서의 임상 경험과 전문성을 바탕으로, 본 플랫폼이 제공하는 정보의 의학적 정확성·공익성·중립성을 확보하기 위한 자문 및 검토 역할을 수행합니다.',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary.withValues(alpha: 0.9),
                              height: 1.6,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '다만, 자문위원의 참여는 개별 이용자에 대한 진료, 처방 또는 의료행위를 의미하지 않으며, 특정 의료기관이나 의료인을 추천·알선·유인하는 행위와는 무관함을 명확히 합니다.',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary.withValues(alpha: 0.9),
                              height: 1.6,
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Divider(color: AppColors.divider),
                          const SizedBox(height: 12),
                          // 의사 목록
                          ..._doctors.map((doctor) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              children: [
                                Text(
                                  '${doctor['name']} 원장',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    doctor['hospital']!,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textSecondary,
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

  void _showComingSoon(String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature 기능이 곧 출시됩니다!'),
        duration: const Duration(seconds: 2),
        backgroundColor: AppColors.textPrimary,
      ),
    );
  }

  Widget _buildHomeContent() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 서브타이틀
          const Center(
            child: Text(
              '난임, 무엇이든 물어보세요',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          const SizedBox(height: 24),

          // 채팅하기 배너
          _ChatBanner(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const ChatScreen(),
                ),
              );
            },
          ),
          const SizedBox(height: 32),

          // 4개 메뉴 그리드
          Row(
            children: [
              Expanded(
                child: _MenuButton(
                  title: '난임백과',
                  color: const Color(0xFFE8A838),
                  onTap: () {
                    setState(() => _currentIndex = 1);
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MenuButton(
                  title: '난임톡톡 소개',
                  color: const Color(0xFFADD8E6),
                  onTap: _showAboutSheet,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _MenuButton(
                  title: '난임&뉴스',
                  color: const Color(0xFFE8A838),
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
                              icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
                              onPressed: () => Navigator.pop(context),
                            ),
                            title: const Text(
                              '난임&뉴스',
                              style: TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 18,
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
                child: _MenuButton(
                  title: '정회원 무제한채팅',
                  subtitle: '6개월 1만원 / 1년 2만원',
                  color: const Color(0xFFD3D3D3),
                  onTap: () => _showComingSoon('정회원 무제한채팅'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEncyclopediaContent() {
    return const EncyclopediaScreen();
  }

  Widget _buildMyPageContent() {
    final authProvider = Provider.of<AuthProvider>(context);

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 프로필 섹션
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.inputBackground,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: const Color(0xFF6B4E71).withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.person,
                    size: 32,
                    color: Color(0xFF6B4E71),
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
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        authProvider.currentUser?.email ?? '',
                        style: const TextStyle(
                          fontSize: 13,
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
          _buildSettingItem(
            icon: _notificationsEnabled
                ? Icons.notifications_active
                : Icons.notifications_off_outlined,
            title: '알림 설정',
            trailing: Switch(
              value: _notificationsEnabled,
              onChanged: (_) => _toggleNotification(),
              activeColor: const Color(0xFF6B4E71),
            ),
          ),
          const Divider(height: 1, color: AppColors.divider),
          _buildSettingItem(
            icon: Icons.info_outline,
            title: '난임톡톡 소개',
            onTap: _showAboutSheet,
          ),
          const Divider(height: 1, color: AppColors.divider),
          _buildSettingItem(
            icon: Icons.logout,
            title: '로그아웃',
            onTap: () => authProvider.signOut(),
            textColor: Colors.red,
          ),
        ],
      ),
    );
  }

  Widget _buildSettingItem({
    required IconData icon,
    required String title,
    VoidCallback? onTap,
    Widget? trailing,
    Color? textColor,
  }) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: textColor ?? AppColors.textSecondary),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 15,
          color: textColor ?? AppColors.textPrimary,
        ),
      ),
      trailing: trailing ?? (onTap != null
          ? const Icon(Icons.chevron_right, color: AppColors.textSecondary)
          : null),
      onTap: onTap,
    );
  }

  Widget _buildNavItem(int index, IconData icon, IconData activeIcon) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () {
        if (index == 2) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const ChatScreen(),
            ),
          );
        } else {
          setState(() => _currentIndex = index);
        }
      },
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          shape: BoxShape.circle,
        ),
        child: Icon(
          isSelected ? activeIcon : icon,
          color: isSelected ? const Color(0xFF2C2C2C) : Colors.white54,
          size: 24,
        ),
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
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(
          _getAppBarTitle(),
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
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
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: const BoxDecoration(
          color: AppColors.background,
        ),
        child: Container(
          height: 64,
          decoration: BoxDecoration(
            color: const Color(0xFF2C2C2C),
            borderRadius: BorderRadius.circular(32),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildNavItem(0, Icons.home_outlined, Icons.home),
              _buildNavItem(1, Icons.grid_view_outlined, Icons.grid_view),
              _buildNavItem(2, Icons.chat_bubble_outline, Icons.chat_bubble),
              _buildNavItem(3, Icons.person_outline, Icons.person),
            ],
          ),
        ),
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
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF6B4E71), Color(0xFF8B6B8E)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF6B4E71).withValues(alpha: 0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '골통주부 이승주와',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    '채팅하기',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'start',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(width: 4),
                        Icon(
                          Icons.play_arrow,
                          size: 18,
                          color: Colors.white,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            // 이미지 영역 (나중에 실제 이미지로 교체)
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.chat_bubble_outline,
                size: 48,
                color: Colors.white54,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// 메뉴 버튼 위젯
class _MenuButton extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Color color;
  final VoidCallback onTap;

  const _MenuButton({
    required this.title,
    this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 100,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(
                subtitle!,
                style: TextStyle(
                  fontSize: 11,
                  color: AppColors.textPrimary.withValues(alpha: 0.7),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
