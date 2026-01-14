import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';
import '../../services/notification_service.dart';
import '../../models/conversation_model.dart';
import '../../widgets/conversation_tile.dart';
import '../../utils/app_colors.dart';
import 'admin_chat_screen.dart';
import 'admin_encyclopedia_screen.dart';
import 'admin_news_screen.dart';

class AdminConversationsScreen extends StatefulWidget {
  const AdminConversationsScreen({super.key});

  @override
  State<AdminConversationsScreen> createState() => _AdminConversationsScreenState();
}

class _AdminConversationsScreenState extends State<AdminConversationsScreen> {
  final NotificationService _notificationService = NotificationService();
  bool _notificationsEnabled = true;
  int _currentIndex = 0;

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

  String _getAppBarTitle() {
    switch (_currentIndex) {
      case 0:
        return '질문 목록';
      case 1:
        return '난임백과 관리';
      case 2:
        return '뉴스 관리';
      case 3:
        return '설정';
      default:
        return '관리자';
    }
  }

  Widget _buildConversationsContent() {
    final firestoreService = FirestoreService();

    return StreamBuilder<List<ConversationModel>>(
      stream: firestoreService.getAllConversations(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.inbox_outlined,
                  size: 48,
                  color: AppColors.textSecondary.withValues(alpha: 0.3),
                ),
                const SizedBox(height: 16),
                const Text(
                  '아직 질문이 없습니다',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          );
        }

        final conversations = snapshot.data!;

        return ListView.builder(
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: conversations.length,
          itemBuilder: (context, index) {
            final conversation = conversations[index];
            return ConversationTile(
              conversation: conversation,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => AdminChatScreen(
                      conversation: conversation,
                    ),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildEncyclopediaContent() {
    return const AdminEncyclopediaListContent();
  }

  Widget _buildNewsContent() {
    return const AdminNewsScreen();
  }

  Widget _buildSettingsContent() {
    final authProvider = Provider.of<AuthProvider>(context);

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
                    Icons.admin_panel_settings,
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
                        authProvider.currentUser?.name ?? '관리자',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        '관리자 계정',
                        style: TextStyle(
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
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              _notificationsEnabled
                  ? Icons.notifications_active
                  : Icons.notifications_off_outlined,
              color: AppColors.textSecondary,
            ),
            title: const Text(
              '알림 설정',
              style: TextStyle(fontSize: 15, color: AppColors.textPrimary),
            ),
            trailing: Switch(
              value: _notificationsEnabled,
              onChanged: (_) => _toggleNotification(),
              activeColor: const Color(0xFF6B4E71),
            ),
          ),
          const Divider(height: 1, color: AppColors.divider),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text(
              '로그아웃',
              style: TextStyle(fontSize: 15, color: Colors.red),
            ),
            onTap: () => authProvider.signOut(),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, IconData activeIcon) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () {
        setState(() => _currentIndex = index);
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
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: IndexedStack(
          index: _currentIndex,
          children: [
            _buildConversationsContent(),
            _buildEncyclopediaContent(),
            _buildNewsContent(),
            _buildSettingsContent(),
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
              _buildNavItem(0, Icons.chat_bubble_outline, Icons.chat_bubble),
              _buildNavItem(1, Icons.menu_book_outlined, Icons.menu_book),
              _buildNavItem(2, Icons.newspaper_outlined, Icons.newspaper),
              _buildNavItem(3, Icons.settings_outlined, Icons.settings),
            ],
          ),
        ),
      ),
    );
  }
}

// 난임백과 관리 목록 컨텐츠 (네비게이션 내에서 사용)
class AdminEncyclopediaListContent extends StatelessWidget {
  const AdminEncyclopediaListContent({super.key});

  @override
  Widget build(BuildContext context) {
    return const AdminEncyclopediaScreen();
  }
}
