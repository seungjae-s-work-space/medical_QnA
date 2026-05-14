import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';
import '../../models/conversation_model.dart';
import '../../models/message_model.dart';
import '../../widgets/message_record.dart';
import '../../widgets/date_divider.dart';
import '../../utils/app_colors.dart';

class AdminChatScreen extends StatefulWidget {
  final ConversationModel conversation;

  const AdminChatScreen({super.key, required this.conversation});

  @override
  State<AdminChatScreen> createState() => _AdminChatScreenState();
}

class _AdminChatScreenState extends State<AdminChatScreen> {
  static const int _messagePageSize = FirestoreService.defaultMessagePageSize;
  final _messageController = TextEditingController();
  final _firestoreService = FirestoreService();
  final _scrollController = ScrollController();
  final List<MessageModel> _olderMessages = [];
  List<MessageModel> _visibleMessages = [];
  bool _isLoadingOlderMessages = false;
  bool _hasOlderMessages = true;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_maybeLoadOlderMessages);
  }

  void _maybeLoadOlderMessages() {
    if (!_scrollController.hasClients) return;

    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 120) {
      _loadOlderMessages();
    }
  }

  List<MessageModel> _mergeMessages(
    List<MessageModel> liveMessages,
    List<MessageModel> olderMessages,
  ) {
    final byId = <String, MessageModel>{};

    for (final message in [...liveMessages, ...olderMessages]) {
      byId.putIfAbsent(message.messageId, () => message);
    }

    return byId.values.toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  Future<void> _loadOlderMessages() async {
    if (_isLoadingOlderMessages ||
        !_hasOlderMessages ||
        _visibleMessages.isEmpty) {
      return;
    }

    final oldestMessage = _visibleMessages.last;
    setState(() => _isLoadingOlderMessages = true);

    try {
      final result = await _firestoreService.getOlderMessagesPage(
        conversationId: widget.conversation.conversationId,
        startAfter: oldestMessage.createdAt,
        pageSize: _messagePageSize,
      );

      if (!mounted) return;

      setState(() {
        final existingIds = _olderMessages.map((m) => m.messageId).toSet();
        _olderMessages.addAll(
          result.items
              .where((message) => !existingIds.contains(message.messageId)),
        );
        _hasOlderMessages = result.hasMore;
        _isLoadingOlderMessages = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingOlderMessages = false);
      }
    }
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;

    await _firestoreService.sendMessage(
      conversationId: widget.conversation.conversationId,
      text: _messageController.text.trim(),
    );

    _messageController.clear();
  }

  /// 메시지를 날짜별로 그룹화하여 DateDivider와 함께 렌더링
  List<Widget> _buildMessagesWithDateDividers(
      List<MessageModel> messages, String currentUserId) {
    final List<Widget> widgets = [];
    DateTime? lastDate;

    for (int i = 0; i < messages.length; i++) {
      final message = messages[i];
      final messageDate = message.createdAt;

      // 날짜가 바뀌면 DateDivider 추가
      if (lastDate == null ||
          lastDate.year != messageDate.year ||
          lastDate.month != messageDate.month ||
          lastDate.day != messageDate.day) {
        widgets.add(DateDivider(date: messageDate));
        lastDate = messageDate;
      }

      // 메시지 레코드 추가 - 관리자 입장에서는 자신의 메시지가 admin role
      widgets.add(MessageRecord(
        message: message,
        isUser: message.senderRole != 'admin', // admin이 아니면 사용자 메시지
      ));
    }

    return widgets;
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
        title: Text(
          widget.conversation.userName,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w500,
          ),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // 메시지 목록
          Expanded(
            child: StreamBuilder<List<MessageModel>>(
              stream: _firestoreService
                  .getMessages(widget.conversation.conversationId),
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
                          Icons.chat_bubble_outline,
                          size: 48,
                          color: AppColors.textSecondary.withValues(alpha: 0.3),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          '아직 기록이 없습니다',
                          style: TextStyle(
                            fontSize: 16,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                final messages = _mergeMessages(snapshot.data!, _olderMessages);
                _visibleMessages = messages;
                final widgets = _buildMessagesWithDateDividers(
                  messages,
                  authProvider.currentUser!.userId,
                );
                if (_isLoadingOlderMessages) {
                  widgets.add(
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Center(
                        child: SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      ),
                    ),
                  );
                }

                return ListView.builder(
                  controller: _scrollController,
                  reverse: true,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: widgets.length,
                  itemBuilder: (context, index) => widgets[index],
                );
              },
            ),
          ),

          // 답변 입력 영역
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: AppColors.backgroundAlt,
              border: Border(
                top: BorderSide(
                  color: AppColors.buttonBorder,
                  width: 1,
                ),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    maxLines: null,
                    style: const TextStyle(
                      fontSize: 17,
                      height: 1.6,
                      color: AppColors.textPrimary,
                    ),
                    decoration: InputDecoration(
                      hintText: '답변 입력',
                      hintStyle: const TextStyle(
                        color: AppColors.textSecondary,
                      ),
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(
                          color: AppColors.buttonBorder,
                          width: 1,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(
                          color: AppColors.buttonBorder,
                          width: 1,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(
                          color: AppColors.textSecondary,
                          width: 1,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 12,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send),
                  color: AppColors.textPrimary,
                  onPressed: _sendMessage,
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.adminMessage,
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
    _scrollController.removeListener(_maybeLoadOlderMessages);
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}
