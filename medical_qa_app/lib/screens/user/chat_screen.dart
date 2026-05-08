import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../../providers/auth_provider.dart';
import '../../services/app_access_policy.dart';
import '../../services/firestore_service.dart';
import '../../services/storage_service.dart';
import '../../models/message_model.dart';
import '../../widgets/message_record.dart';
import '../../widgets/date_divider.dart';
import '../../design/app_radii.dart';
import '../../design/app_spacing.dart';
import '../../utils/app_colors.dart';

class ChatScreen extends StatefulWidget {
  final String? initialConversationId;

  const ChatScreen({super.key, this.initialConversationId});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messageController = TextEditingController();
  final _firestoreService = FirestoreService();
  final _storageService = StorageService();
  final _scrollController = ScrollController();
  final _imagePicker = ImagePicker();
  String? _conversationId;
  bool _isSending = false;
  final List<_PendingAttachment> _pendingAttachments = [];

  @override
  void initState() {
    super.initState();
    _initializeConversation();
  }

  Future<void> _initializeConversation() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    if (authProvider.currentUser != null) {
      _conversationId = widget.initialConversationId ??
          await _firestoreService.getOrCreateConversation(
            authProvider.currentUser!.userId,
            authProvider.currentUser!.name,
          );
      setState(() {});
    }
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadii.xl)),
      ),
      builder: (context) {
        final textTheme = Theme.of(context).textTheme;

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.borderStrong,
                    borderRadius: BorderRadius.circular(AppSpacing.xxs / 2),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  '첨부하기',
                  style: textTheme.titleMedium?.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildAttachmentOption(
                      icon: Icons.camera_alt_rounded,
                      label: '카메라',
                      color: AppColors.info,
                      onTap: () {
                        Navigator.pop(context);
                        _pickFromCamera();
                      },
                    ),
                    _buildAttachmentOption(
                      icon: Icons.photo_library_rounded,
                      label: '갤러리',
                      color: AppColors.accent,
                      onTap: () {
                        Navigator.pop(context);
                        _pickFromGallery();
                      },
                    ),
                    _buildAttachmentOption(
                      icon: Icons.videocam_rounded,
                      label: '동영상',
                      color: AppColors.error,
                      onTap: () {
                        Navigator.pop(context);
                        _pickVideo();
                      },
                    ),
                    _buildAttachmentOption(
                      icon: Icons.attach_file_rounded,
                      label: '파일',
                      color: AppColors.success,
                      onTap: () {
                        Navigator.pop(context);
                        _pickFile();
                      },
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAttachmentOption({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickFromCamera() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
      );
      if (image != null) {
        _addPendingAttachment(
            File(image.path), AttachmentType.image, image.name);
      }
    } catch (e) {
      _showErrorSnackBar('카메라를 열 수 없습니다');
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final List<XFile> images = await _imagePicker.pickMultiImage(
        imageQuality: 80,
        limit: 5,
      );
      for (final image in images) {
        _addPendingAttachment(
            File(image.path), AttachmentType.image, image.name);
      }
    } catch (e) {
      _showErrorSnackBar('갤러리를 열 수 없습니다');
    }
  }

  Future<void> _pickVideo() async {
    try {
      final XFile? video = await _imagePicker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(minutes: 5),
      );
      if (video != null) {
        final file = File(video.path);
        final fileSize = await file.length();
        // 100MB 제한
        if (fileSize > 100 * 1024 * 1024) {
          _showErrorSnackBar('동영상은 100MB 이하만 첨부할 수 있습니다');
          return;
        }
        _addPendingAttachment(file, AttachmentType.video, video.name);
      }
    } catch (e) {
      _showErrorSnackBar('동영상을 선택할 수 없습니다');
    }
  }

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        type: FileType.custom,
        allowedExtensions: [
          'pdf',
          'doc',
          'docx',
          'xls',
          'xlsx',
          'ppt',
          'pptx',
          'txt',
          'zip'
        ],
      );
      if (result != null) {
        for (final file in result.files) {
          if (file.path != null) {
            final fileObj = File(file.path!);
            // 50MB 제한
            if (file.size > 50 * 1024 * 1024) {
              _showErrorSnackBar('파일은 50MB 이하만 첨부할 수 있습니다');
              continue;
            }
            _addPendingAttachment(fileObj, AttachmentType.file, file.name);
          }
        }
      }
    } catch (e) {
      _showErrorSnackBar('파일을 선택할 수 없습니다');
    }
  }

  void _addPendingAttachment(File file, AttachmentType type, String fileName) {
    if (_pendingAttachments.length >= 5) {
      _showErrorSnackBar('최대 5개까지 첨부할 수 있습니다');
      return;
    }
    setState(() {
      _pendingAttachments.add(_PendingAttachment(
        file: file,
        type: type,
        fileName: fileName,
      ));
    });
  }

  void _removePendingAttachment(int index) {
    setState(() {
      _pendingAttachments.removeAt(index);
    });
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.sm),
        ),
      ),
    );
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty && _pendingAttachments.isEmpty) return;
    if (_conversationId == null) return;
    if (_isSending) return;

    if (!AppAccessPolicy.canOpen(AppAccessFeature.chat)) {
      _showErrorSnackBar('지금은 채팅을 이용할 수 없습니다');
      return;
    }

    setState(() => _isSending = true);

    try {
      // 첨부파일 업로드
      List<AttachmentModel> attachments = [];
      for (final pending in _pendingAttachments) {
        final attachment = await _storageService.uploadAttachment(
          file: pending.file,
          type: pending.type,
          originalFileName: pending.fileName,
        );
        attachments.add(attachment);
      }

      // 메시지 전송
      await _firestoreService.sendMessage(
        conversationId: _conversationId!,
        text: text,
        attachments: attachments.isNotEmpty ? attachments : null,
      );

      _messageController.clear();
      _pendingAttachments.clear();
    } catch (e) {
      _showErrorSnackBar('메시지 전송에 실패했습니다');
    }

    setState(() => _isSending = false);
  }

  List<Widget> _buildMessagesWithDateDividers(
      List<MessageModel> messages, String currentUserId) {
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

  Widget _buildPendingAttachmentsPreview() {
    if (_pendingAttachments.isEmpty) return const SizedBox.shrink();

    final hasVideo =
        _pendingAttachments.any((a) => a.type == AttachmentType.video);
    final expiryText =
        hasVideo ? '동영상 7일, 이미지/문서 30일 후 자동 삭제' : '이미지/문서는 30일 후 자동 삭제됩니다';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: const BoxDecoration(
        color: AppColors.surfaceMuted,
        border: Border(
          bottom: BorderSide(color: AppColors.borderStrong, width: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(_pendingAttachments.length, (index) {
                final attachment = _pendingAttachments[index];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Stack(
                    children: [
                      Container(
                        width: 70,
                        height: 70,
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(AppRadii.sm),
                          border: Border.all(color: AppColors.borderStrong),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(AppRadii.sm - 1),
                          child: _buildAttachmentPreview(attachment),
                        ),
                      ),
                      Positioned(
                        top: -4,
                        right: -4,
                        child: GestureDetector(
                          onTap: () => _removePendingAttachment(index),
                          child: Container(
                            width: 22,
                            height: 22,
                            decoration: const BoxDecoration(
                              color: AppColors.error,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.close,
                              color: Colors.white,
                              size: 14,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            expiryText,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textTertiary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttachmentPreview(_PendingAttachment attachment) {
    switch (attachment.type) {
      case AttachmentType.image:
        return Image.file(
          attachment.file,
          fit: BoxFit.cover,
          width: 70,
          height: 70,
        );
      case AttachmentType.video:
        return Container(
          color: AppColors.errorSoft,
          child: const Center(
            child: Icon(
              Icons.videocam_rounded,
              color: AppColors.error,
              size: 28,
            ),
          ),
        );
      case AttachmentType.file:
        return Container(
          color: AppColors.successSoft,
          padding: const EdgeInsets.all(6),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.insert_drive_file_rounded,
                color: AppColors.success,
                size: 24,
              ),
              const SizedBox(height: 2),
              Text(
                attachment.fileName,
                style: const TextStyle(
                  fontSize: 9,
                  color: AppColors.textSecondary,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final textTheme = Theme.of(context).textTheme;

    // 채팅 화면 전용 색상
    const backgroundColor = AppColors.background;
    const textPrimary = AppColors.textPrimary;
    const textSecondary = AppColors.textSecondary;
    const textTertiary = AppColors.textTertiary;
    const accentColor = AppColors.accent;

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
              color: AppColors.inputBackground,
              borderRadius: BorderRadius.circular(AppRadii.sm),
            ),
            child: const Icon(
              Icons.arrow_back_ios_new_rounded,
              color: textSecondary,
              size: 18,
            ),
          ),
        ),
        title: Text(
          '상담',
          style: textTheme.titleLarge?.copyWith(
            color: textPrimary,
            fontWeight: FontWeight.w700,
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
                              color: AppColors.accentSoft,
                              borderRadius: BorderRadius.circular(AppRadii.lg),
                            ),
                            child: const Icon(
                              Icons.forum_outlined,
                              size: 32,
                              color: AppColors.accentDeep,
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
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: widgets.length,
                  itemBuilder: (context, index) => widgets[index],
                );
              },
            ),
          ),

          // 첨부파일 미리보기
          _buildPendingAttachmentsPreview(),

          // 입력 영역
          Container(
            padding: EdgeInsets.only(
              left: AppSpacing.sm,
              right: AppSpacing.md,
              top: AppSpacing.sm,
              bottom: MediaQuery.of(context).padding.bottom + AppSpacing.sm,
            ),
            decoration: const BoxDecoration(
              color: backgroundColor,
              border: Border(
                top: BorderSide(color: AppColors.border, width: 1),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                // 첨부 버튼
                Container(
                  width: 42,
                  height: 42,
                  margin: const EdgeInsets.only(bottom: 4, right: 8),
                  decoration: BoxDecoration(
                    color: AppColors.inputBackground,
                    borderRadius: BorderRadius.circular(21),
                  ),
                  child: IconButton(
                    onPressed: _showAttachmentOptions,
                    icon: const Icon(
                      Icons.add_rounded,
                      color: AppColors.textSecondary,
                      size: 24,
                    ),
                  ),
                ),
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.inputBackground,
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
                    color: _isSending ? AppColors.borderStrong : accentColor,
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

// 첨부 대기 중인 파일 모델
class _PendingAttachment {
  final File file;
  final AttachmentType type;
  final String fileName;

  _PendingAttachment({
    required this.file,
    required this.type,
    required this.fileName,
  });
}
