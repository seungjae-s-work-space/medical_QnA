import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/subscription_provider.dart';
import '../../services/firestore_service.dart';
import '../../models/message_model.dart';
import '../../widgets/message_record.dart';
import '../../widgets/date_divider.dart';
import 'subscription_screen.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messageController = TextEditingController();
  final _firestoreService = FirestoreService();
  final _scrollController = ScrollController();
  String? _conversationId;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    _initializeConversation();
  }

  Future<void> _initializeConversation() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    if (authProvider.currentUser != null) {
      _conversationId = await _firestoreService.getOrCreateConversation(
        authProvider.currentUser!.userId,
        authProvider.currentUser!.name,
      );
      setState(() {});
    }
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;
    if (_conversationId == null) return;
    if (_isSending) return;

    // 구독 상태 확인
    final subscriptionProvider = Provider.of<SubscriptionProvider>(context, listen: false);
    if (!subscriptionProvider.hasActiveSubscription) {
      _showSubscriptionRequiredSheet();
      return;
    }

    setState(() => _isSending = true);

    await _firestoreService.sendMessage(
      conversationId: _conversationId!,
      text: _messageController.text.trim(),
    );

    _messageController.clear();
    setState(() => _isSending = false);
  }

  void _showSubscriptionRequiredSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(context).padding.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 드래그 핸들
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE0E0E0),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            // 아이콘
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFF0D8E8),
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(
                Icons.workspace_premium,
                size: 40,
                color: Color(0xFFB87BA8),
              ),
            ),
            const SizedBox(height: 20),
            // 제목
            const Text(
              '이용권이 필요해요',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFF333333),
              ),
            ),
            const SizedBox(height: 12),
            // 설명
            const Text(
              '메시지를 보내시려면\n이용권이 필요합니다.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Color(0xFF888888),
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            // 이용권 구매 버튼
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const SubscriptionScreen(),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFB87BA8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(28),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  '이용권 구매하기',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            // 나중에 버튼
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text(
                '나중에 할게요',
                style: TextStyle(
                  fontSize: 16,
                  color: Color(0xFF888888),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildMessagesWithDateDividers(List<MessageModel> messages, String currentUserId) {
    final List<Widget> widgets = [];

    for (int i = 0; i < messages.length; i++) {
      final message = messages[i];
      final messageDate = message.createdAt;

      // 먼저 메시지 추가
      widgets.add(MessageRecord(
        message: message,
        isUser: message.isMine(currentUserId),
      ));

      // 다음 메시지와 날짜가 다르거나 마지막 메시지면 구분선 추가
      final isLastMessage = i == messages.length - 1;
      if (isLastMessage) {
        widgets.add(DateDivider(date: messageDate));
      } else {
        final nextMessage = messages[i + 1];
        if (messageDate.year != nextMessage.createdAt.year ||
            messageDate.month != nextMessage.createdAt.month ||
            messageDate.day != nextMessage.createdAt.day) {
          widgets.add(DateDivider(date: messageDate));
        }
      }
    }

    return widgets;
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    // 채팅 화면 전용 색상
    const backgroundColor = Colors.white;
    const textPrimary = Color(0xFF333333);
    const textSecondary = Color(0xFF888888);
    const textTertiary = Color(0xFFAAAAAA);
    const accentColor = Color(0xFF5B8BA8);

    if (_conversationId == null) {
      return const Scaffold(
        backgroundColor: backgroundColor,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: backgroundColor,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFF0F0F0),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.arrow_back_ios_new_rounded,
              color: textSecondary,
              size: 18,
            ),
          ),
        ),
        title: const Text(
          '상담',
          style: TextStyle(
            color: textPrimary,
            fontSize: 19,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // 메시지 목록
          Expanded(
            child: StreamBuilder<List<MessageModel>>(
              stream: _firestoreService.getMessages(_conversationId!),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (!snapshot.hasData || snapshot.data!.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              color: const Color(0xFFB8D4E8),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Icon(
                              Icons.forum_outlined,
                              size: 32,
                              color: Color(0xFF5B8BA8),
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Text(
                            '궁금한 점이 있으신가요?',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w500,
                              color: textPrimary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '편하게 질문해주세요.\n빠른 시일 내에 답변드리겠습니다.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 16,
                              color: textSecondary.withValues(alpha: 0.8),
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                final messages = snapshot.data!;
                final widgets = _buildMessagesWithDateDividers(
                  messages,
                  authProvider.currentUser!.userId,
                );

                return ListView.builder(
                  controller: _scrollController,
                  reverse: true,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: widgets.length,
                  itemBuilder: (context, index) => widgets[index],
                );
              },
            ),
          ),

          // 입력 영역
          Container(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 12,
              bottom: MediaQuery.of(context).padding.bottom + 12,
            ),
            decoration: const BoxDecoration(
              color: backgroundColor,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F0F0),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: TextField(
                      controller: _messageController,
                      maxLines: 4,
                      minLines: 1,
                      style: const TextStyle(
                        fontSize: 17,
                        color: textPrimary,
                        height: 1.4,
                      ),
                      decoration: const InputDecoration(
                        hintText: '메시지를 입력하세요',
                        hintStyle: TextStyle(
                          color: textTertiary,
                          fontSize: 16,
                        ),
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 12,
                        ),
                        border: InputBorder.none,
                      ),
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  width: 46,
                  height: 46,
                  margin: const EdgeInsets.only(bottom: 2),
                  decoration: BoxDecoration(
                    color: _isSending
                        ? const Color(0xFFE0E0E0)
                        : accentColor,
                    borderRadius: BorderRadius.circular(23),
                  ),
                  child: IconButton(
                    onPressed: _isSending ? null : _sendMessage,
                    icon: _isSending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(
                            Icons.arrow_upward_rounded,
                            color: Colors.white,
                            size: 22,
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}
