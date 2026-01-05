import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/notification_service.dart';
import '../../utils/app_colors.dart';
import 'chat_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ScrollController _scrollController = ScrollController();
  Timer? _autoScrollTimer;
  final NotificationService _notificationService = NotificationService();
  bool _notificationsEnabled = true;

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
    _startAutoScroll();
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

  @override
  void dispose() {
    _autoScrollTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  void _startAutoScroll() {
    _autoScrollTimer = Timer.periodic(const Duration(milliseconds: 30), (timer) {
      if (_scrollController.hasClients) {
        final maxScroll = _scrollController.position.maxScrollExtent;
        final currentScroll = _scrollController.offset;

        if (currentScroll >= maxScroll) {
          // 끝에 도달하면 처음으로 (부드럽게)
          _scrollController.jumpTo(0);
        } else {
          _scrollController.jumpTo(currentScroll + 0.5);
        }
      }
    });
  }

  void _pauseAutoScroll() {
    _autoScrollTimer?.cancel();
  }

  void _resumeAutoScroll() {
    _startAutoScroll();
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
                    '서비스 소개',
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

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.info_outline, color: AppColors.textSecondary),
          onPressed: _showAboutSheet,
        ),
        title: const Text(
          '난임&상담톡',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w500,
            letterSpacing: 1,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(
              _notificationsEnabled
                  ? Icons.notifications_active
                  : Icons.notifications_off_outlined,
              color: AppColors.textSecondary,
            ),
            onPressed: _toggleNotification,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.textSecondary),
            onPressed: () => authProvider.signOut(),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(flex: 2),

            // 메인 메시지
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                children: [
                  // 헤드라인
                  const Text(
                    '난임시술을 앞두고 있는 당신에게',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // 공감 메시지
                  Text(
                    '의사의 어려운 설명,\n간호사의 어설픈 설명,\nAI의 교과서 같은 설명…\n그동안 답답하셨죠.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w400,
                      color: AppColors.textSecondary.withValues(alpha: 0.9),
                      height: 1.8,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 위로 메시지
                  const Text(
                    '오늘의 채팅은\n조금 후련해지는 시간이 될 겁니다.\n난임시술,\n이제 혼자 고민하지 않아도 됩니다.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w400,
                      color: AppColors.textPrimary,
                      height: 1.8,
                    ),
                  ),
                ],
              ),
            ),

            const Spacer(flex: 2),

            // 채팅하기 버튼
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const ChatScreen(),
                      ),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textPrimary,
                    side: const BorderSide(
                      color: AppColors.buttonBorder,
                      width: 1,
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '채팅하기',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 1,
                        ),
                      ),
                      SizedBox(width: 6),
                      Icon(Icons.arrow_downward, size: 18),
                    ],
                  ),
                ),
              ),
            ),

            const Spacer(flex: 1),

            // 추천 전문의 섹션
            Container(
              padding: const EdgeInsets.symmetric(vertical: 20),
              decoration: const BoxDecoration(
                border: Border(
                  top: BorderSide(color: AppColors.divider, width: 1),
                ),
              ),
              child: Column(
                children: [
                  // 헤더
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.verified,
                          size: 16,
                          color: AppColors.textSecondary.withValues(alpha: 0.7),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '${_doctors.length}명의 전문의가 추천합니다',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary.withValues(alpha: 0.8),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 자동 스크롤 캐러셀
                  SizedBox(
                    height: 70,
                    child: GestureDetector(
                      onPanDown: (_) => _pauseAutoScroll(),
                      onPanEnd: (_) => _resumeAutoScroll(),
                      onPanCancel: () => _resumeAutoScroll(),
                      child: ListView.builder(
                        controller: _scrollController,
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _doctors.length * 3, // 무한 스크롤 효과
                        itemBuilder: (context, index) {
                          final doctor = _doctors[index % _doctors.length];
                          return _DoctorCard(
                            name: doctor['name']!,
                            hospital: doctor['hospital']!,
                            onTap: _showAboutSheet,
                          );
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _DoctorCard extends StatelessWidget {
  final String name;
  final String hospital;
  final VoidCallback? onTap;

  const _DoctorCard({
    required this.name,
    required this.hospital,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 100,
        margin: const EdgeInsets.only(right: 12),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.inputBackground,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: AppColors.divider,
            width: 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '$name 원장',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              hospital,
              style: const TextStyle(
                fontSize: 10,
                color: AppColors.textSecondary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
