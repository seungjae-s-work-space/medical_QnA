import 'package:flutter/material.dart';
import '../../services/notification_service.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  final NotificationService _service = NotificationService();

  bool _masterEnabled = true;
  bool _chatEnabled = true;
  bool _contentEnabled = true;
  bool _subscriptionEnabled = true;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final settings = await _service.getNotificationSettings();
    if (!mounted) return;
    setState(() {
      _masterEnabled = settings['notificationsEnabled'] ?? true;
      _chatEnabled = settings['notificationChat'] ?? true;
      _contentEnabled = settings['notificationContent'] ?? true;
      _subscriptionEnabled = settings['notificationSubscription'] ?? true;
      _loading = false;
    });
  }

  Future<void> _toggleMaster(bool value) async {
    setState(() => _masterEnabled = value);
    await _service.setNotificationEnabled(value);
  }

  Future<void> _toggleCategory(String key, bool value) async {
    setState(() {
      switch (key) {
        case 'notificationChat':
          _chatEnabled = value;
          break;
        case 'notificationContent':
          _contentEnabled = value;
          break;
        case 'notificationSubscription':
          _subscriptionEnabled = value;
          break;
      }
    });
    await _service.setCategoryNotification(key, value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFDF6F9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          '알림 설정',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Color(0xFF333333),
          ),
        ),
        iconTheme: const IconThemeData(color: Color(0xFF333333)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFB87BA8)))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // 마스터 스위치
                _buildCard(
                  children: [
                    _buildTile(
                      icon: Icons.notifications_active_outlined,
                      iconColor: const Color(0xFFB87BA8),
                      title: '전체 알림',
                      subtitle: '알림을 모두 끄려면 비활성화하세요',
                      value: _masterEnabled,
                      onChanged: _toggleMaster,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // 카테고리별 설정
                Opacity(
                  opacity: _masterEnabled ? 1.0 : 0.4,
                  child: IgnorePointer(
                    ignoring: !_masterEnabled,
                    child: _buildCard(
                      children: [
                        _buildTile(
                          icon: Icons.chat_bubble_outline,
                          iconColor: const Color(0xFF5B8BA8),
                          title: '상담 알림',
                          subtitle: '상담사의 답변 알림',
                          value: _chatEnabled,
                          onChanged: (v) => _toggleCategory('notificationChat', v),
                        ),
                        const Divider(height: 1, indent: 60),
                        _buildTile(
                          icon: Icons.article_outlined,
                          iconColor: const Color(0xFF7B9B8A),
                          title: '콘텐츠 알림',
                          subtitle: '새 뉴스, 공지사항, 백과, 영상 등록 알림',
                          value: _contentEnabled,
                          onChanged: (v) => _toggleCategory('notificationContent', v),
                        ),
                        const Divider(height: 1, indent: 60),
                        _buildTile(
                          icon: Icons.card_membership_outlined,
                          iconColor: const Color(0xFFB8A05B),
                          title: '구독 알림',
                          subtitle: '결제 완료, 만료 임박, 만료 알림',
                          value: _subscriptionEnabled,
                          onChanged: (v) => _toggleCategory('notificationSubscription', v),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildCard({required List<Widget> children}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(children: children),
    );
  }

  Widget _buildTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF333333),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF888888),
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: const Color(0xFFB87BA8),
          ),
        ],
      ),
    );
  }
}
