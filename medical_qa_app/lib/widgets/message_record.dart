import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../design/app_radii.dart';
import '../design/app_spacing.dart';
import '../models/message_model.dart';
import '../services/download_service.dart';
import '../utils/app_colors.dart';
import '../utils/chat_attachment_retention.dart';

/// 메시지 버블 - 모던하고 깔끔한 디자인
class MessageRecord extends StatefulWidget {
  final MessageModel message;
  final bool isUser;

  const MessageRecord({
    super.key,
    required this.message,
    required this.isUser,
  });

  @override
  State<MessageRecord> createState() => _MessageRecordState();
}

class _MessageRecordState extends State<MessageRecord> {
  // 채팅 전용 색상
  static const Color _userBubbleColor = AppColors.chatUserBubble;
  static const Color _adminBubbleColor = AppColors.chatAdminBubble;
  static const Color _adminIconBg = AppColors.chatAgentBadgeBackground;
  static const Color _adminIconColor = AppColors.chatAgentBadgeForeground;

  final DownloadService _downloadService = DownloadService();

  // 파일별 다운로드 상태 관리 (파일 URL을 키로 사용)
  final Set<String> _downloadingUrls = {};
  final Map<String, double> _progressByUrl = {};

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final attachmentsExpired =
        ChatAttachmentRetention.isExpired(widget.message.createdAt);
    final hasStructuredAttachments = widget.message.attachments.isNotEmpty;
    final hasLegacyImage =
        widget.message.imageUrl != null && widget.message.attachments.isEmpty;
    final hasChatAttachment = hasStructuredAttachments || hasLegacyImage;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      child: Row(
        mainAxisAlignment:
            widget.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!widget.isUser) ...[
            // 상담사 아이콘 + 이름
            Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: _adminIconBg,
                    borderRadius: BorderRadius.circular(AppRadii.md),
                  ),
                  child: const Icon(
                    Icons.support_agent,
                    size: 18,
                    color: _adminIconColor,
                  ),
                ),
                const SizedBox(height: 2),
                const Text(
                  '이승주',
                  style: TextStyle(
                    fontSize: 10,
                    color: AppColors.textTertiary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 8),
          ],
          // 말풍선
          Flexible(
            child: Container(
              constraints: BoxConstraints(maxWidth: screenWidth * 0.7),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: widget.isUser ? _userBubbleColor : _adminBubbleColor,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(AppRadii.lg),
                  topRight: const Radius.circular(AppRadii.lg),
                  bottomLeft: Radius.circular(
                    widget.isUser ? AppRadii.lg : AppSpacing.xxs,
                  ),
                  bottomRight: Radius.circular(
                    widget.isUser ? AppSpacing.xxs : AppRadii.lg,
                  ),
                ),
              ),
              child: IntrinsicWidth(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // 텍스트
                    if (widget.message.text.isNotEmpty)
                      Text(
                        widget.message.text,
                        style: TextStyle(
                          fontSize: 17,
                          height: 1.5,
                          color: widget.isUser
                              ? Colors.white
                              : AppColors.textPrimary,
                          fontWeight: FontWeight.w400,
                        ),
                      ),

                    // 첨부파일들
                    if (hasChatAttachment) ...[
                      if (widget.message.text.isNotEmpty)
                        const SizedBox(height: 10),
                      if (attachmentsExpired)
                        _buildExpiredAttachmentNotice()
                      else if (hasStructuredAttachments)
                        _buildAttachments(context)
                      else
                        _buildLegacyImage(context),
                    ],

                    // 시간
                    const SizedBox(height: 4),
                    Align(
                      alignment: Alignment.bottomRight,
                      child: Text(
                        DateFormat('HH:mm').format(widget.message.createdAt),
                        style: TextStyle(
                          fontSize: 12,
                          color: widget.isUser
                              ? Colors.white.withValues(alpha: 0.7)
                              : AppColors.textTertiary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegacyImage(BuildContext context) {
    return GestureDetector(
      onTap: () =>
          _showFullScreenImage(context, widget.message.imageUrl!, null),
      onLongPress: () =>
          _showImageOptions(context, widget.message.imageUrl!, null),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppSpacing.xs),
        child: CachedNetworkImage(
          imageUrl: widget.message.imageUrl!,
          fit: BoxFit.cover,
          placeholder: (context, url) => Container(
            height: 150,
            color: AppColors.surfaceRaised,
            child: const Center(
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
          errorWidget: (context, url, error) => Container(
            height: 100,
            color: AppColors.surfaceRaised,
            child: const Icon(
              Icons.error,
              color: AppColors.textTertiary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildExpiredAttachmentNotice() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: widget.isUser
            ? Colors.white.withValues(alpha: 0.15)
            : AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.xs),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.schedule_rounded,
            size: 20,
            color: widget.isUser
                ? Colors.white.withValues(alpha: 0.8)
                : AppColors.textSecondary,
          ),
          const SizedBox(width: AppSpacing.xs),
          Flexible(
            child: Text(
              '첨부파일 보관 기간이 만료되었습니다',
              style: TextStyle(
                fontSize: 13,
                color: widget.isUser
                    ? Colors.white.withValues(alpha: 0.9)
                    : AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttachments(BuildContext context) {
    // 이미지와 다른 파일 분리
    final images = widget.message.attachments
        .where((a) => a.type == AttachmentType.image)
        .toList();
    final others = widget.message.attachments
        .where((a) => a.type != AttachmentType.image)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 이미지 그리드
        if (images.isNotEmpty) _buildImageGrid(context, images),
        // 동영상 및 파일
        ...others.map((attachment) {
          switch (attachment.type) {
            case AttachmentType.video:
              return _buildVideoAttachment(context, attachment);
            case AttachmentType.file:
              return _buildFileAttachment(context, attachment);
            default:
              return const SizedBox.shrink();
          }
        }),
      ],
    );
  }

  // 카카오톡 스타일 이미지 그리드
  Widget _buildImageGrid(BuildContext context, List<AttachmentModel> images) {
    final count = images.length;
    const gridSize = 200.0;
    const gap = 2.0;

    if (count == 1) {
      return _buildSingleImage(context, images[0], images);
    }

    if (count == 2) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: SizedBox(
          width: gridSize,
          height: gridSize / 2,
          child: Row(
            children: [
              Expanded(child: _buildGridImage(context, images[0], 0, images)),
              const SizedBox(width: gap),
              Expanded(child: _buildGridImage(context, images[1], 1, images)),
            ],
          ),
        ),
      );
    }

    if (count == 3) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: SizedBox(
          width: gridSize,
          height: gridSize * 0.75,
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: _buildGridImage(context, images[0], 0, images),
              ),
              const SizedBox(width: gap),
              Expanded(
                child: Column(
                  children: [
                    Expanded(
                        child: _buildGridImage(context, images[1], 1, images)),
                    const SizedBox(height: gap),
                    Expanded(
                        child: _buildGridImage(context, images[2], 2, images)),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (count == 4) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: SizedBox(
          width: gridSize,
          height: gridSize,
          child: Column(
            children: [
              Expanded(
                child: Row(
                  children: [
                    Expanded(
                        child: _buildGridImage(context, images[0], 0, images)),
                    const SizedBox(width: gap),
                    Expanded(
                        child: _buildGridImage(context, images[1], 1, images)),
                  ],
                ),
              ),
              const SizedBox(height: gap),
              Expanded(
                child: Row(
                  children: [
                    Expanded(
                        child: _buildGridImage(context, images[2], 2, images)),
                    const SizedBox(width: gap),
                    Expanded(
                        child: _buildGridImage(context, images[3], 3, images)),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    // 5개 이상: 2x2 + 마지막에 "+N" 오버레이
    final remaining = count - 4;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SizedBox(
        width: gridSize,
        height: gridSize,
        child: Column(
          children: [
            Expanded(
              child: Row(
                children: [
                  Expanded(
                      child: _buildGridImage(context, images[0], 0, images)),
                  const SizedBox(width: gap),
                  Expanded(
                      child: _buildGridImage(context, images[1], 1, images)),
                ],
              ),
            ),
            const SizedBox(height: gap),
            Expanded(
              child: Row(
                children: [
                  Expanded(
                      child: _buildGridImage(context, images[2], 2, images)),
                  const SizedBox(width: gap),
                  Expanded(
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        _buildGridImage(context, images[3], 3, images),
                        GestureDetector(
                          onTap: () => _showImageGallery(context, images, 3),
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.5),
                              borderRadius:
                                  BorderRadius.circular(AppSpacing.xxs),
                            ),
                            child: Center(
                              child: Text(
                                '+$remaining',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSingleImage(BuildContext context, AttachmentModel attachment,
      List<AttachmentModel> allImages) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: () => _showImageGallery(context, allImages, 0),
        onLongPress: () =>
            _showImageOptions(context, attachment.url, attachment.fileName),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppSpacing.xs),
          child: CachedNetworkImage(
            imageUrl: attachment.url,
            fit: BoxFit.cover,
            placeholder: (context, url) => Container(
              height: 150,
              color: AppColors.surfaceRaised,
              child: const Center(
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
            errorWidget: (context, url, error) => Container(
              height: 100,
              color: AppColors.surfaceRaised,
              child: const Icon(
                Icons.error,
                color: AppColors.textTertiary,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGridImage(BuildContext context, AttachmentModel attachment,
      int index, List<AttachmentModel> allImages) {
    return GestureDetector(
      onTap: () => _showImageGallery(context, allImages, index),
      onLongPress: () =>
          _showImageOptions(context, attachment.url, attachment.fileName),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppSpacing.xxs),
        child: CachedNetworkImage(
          imageUrl: attachment.url,
          fit: BoxFit.cover,
          placeholder: (context, url) => Container(
            color: AppColors.surfaceRaised,
            child: const Center(
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
          errorWidget: (context, url, error) => Container(
            color: AppColors.surfaceRaised,
            child: const Icon(
              Icons.error,
              size: 20,
              color: AppColors.textTertiary,
            ),
          ),
        ),
      ),
    );
  }

  // 이미지 갤러리 (스와이프)
  void _showImageGallery(
      BuildContext context, List<AttachmentModel> images, int initialIndex) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => _ImageGalleryView(
          images: images,
          initialIndex: initialIndex,
          downloadService: _downloadService,
        ),
      ),
    );
  }

  Widget _buildVideoAttachment(
      BuildContext context, AttachmentModel attachment) {
    final isDownloading = _downloadingUrls.contains(attachment.url);
    final progress = _progressByUrl[attachment.url] ?? 0.0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: () => _showVideoOptions(context, attachment),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: widget.isUser
                ? Colors.white.withValues(alpha: 0.15)
                : AppColors.surface,
            borderRadius: BorderRadius.circular(AppSpacing.xs),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.errorSoft,
                  borderRadius: BorderRadius.circular(AppSpacing.xs),
                ),
                child: isDownloading
                    ? Padding(
                        padding: const EdgeInsets.all(8),
                        child: CircularProgressIndicator(
                          value: progress > 0 ? progress : null,
                          strokeWidth: 2,
                          color: AppColors.error,
                        ),
                      )
                    : const Icon(
                        Icons.play_circle_fill_rounded,
                        color: AppColors.error,
                        size: 24,
                      ),
              ),
              const SizedBox(width: 10),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      attachment.fileName ?? '동영상',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: widget.isUser
                            ? Colors.white
                            : AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (attachment.fileSize != null)
                      Text(
                        attachment.fileSizeString,
                        style: TextStyle(
                          fontSize: 12,
                          color: widget.isUser
                              ? Colors.white.withValues(alpha: 0.7)
                              : AppColors.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.download_rounded,
                size: 20,
                color: widget.isUser
                    ? Colors.white.withValues(alpha: 0.7)
                    : AppColors.textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFileAttachment(
      BuildContext context, AttachmentModel attachment) {
    final isDownloading = _downloadingUrls.contains(attachment.url);
    final progress = _progressByUrl[attachment.url] ?? 0.0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: () => _downloadAndOpenFile(context, attachment),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: widget.isUser
                ? Colors.white.withValues(alpha: 0.15)
                : AppColors.surface,
            borderRadius: BorderRadius.circular(AppSpacing.xs),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.successSoft,
                  borderRadius: BorderRadius.circular(AppSpacing.xs),
                ),
                child: isDownloading
                    ? Padding(
                        padding: const EdgeInsets.all(8),
                        child: CircularProgressIndicator(
                          value: progress > 0 ? progress : null,
                          strokeWidth: 2,
                          color: AppColors.success,
                        ),
                      )
                    : Icon(
                        _getFileIcon(attachment.fileName),
                        color: AppColors.success,
                        size: 22,
                      ),
              ),
              const SizedBox(width: 10),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      attachment.fileName ?? '파일',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: widget.isUser
                            ? Colors.white
                            : AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (attachment.fileSize != null)
                      Text(
                        attachment.fileSizeString,
                        style: TextStyle(
                          fontSize: 12,
                          color: widget.isUser
                              ? Colors.white.withValues(alpha: 0.7)
                              : AppColors.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.download_rounded,
                size: 20,
                color: widget.isUser
                    ? Colors.white.withValues(alpha: 0.7)
                    : AppColors.textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getFileIcon(String? fileName) {
    if (fileName == null) return Icons.insert_drive_file_rounded;

    final extension = fileName.split('.').last.toLowerCase();
    switch (extension) {
      case 'pdf':
        return Icons.picture_as_pdf_rounded;
      case 'doc':
      case 'docx':
        return Icons.description_rounded;
      case 'xls':
      case 'xlsx':
        return Icons.table_chart_rounded;
      case 'ppt':
      case 'pptx':
        return Icons.slideshow_rounded;
      case 'zip':
      case 'rar':
        return Icons.folder_zip_rounded;
      case 'txt':
        return Icons.article_rounded;
      default:
        return Icons.insert_drive_file_rounded;
    }
  }

  // 이미지 옵션 (길게 누르기)
  void _showImageOptions(BuildContext context, String url, String? fileName) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadii.xl)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
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
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(
                  Icons.save_alt_rounded,
                  color: AppColors.accent,
                ),
                title: const Text('갤러리에 저장'),
                onTap: () {
                  Navigator.pop(context);
                  _saveImageToGallery(context, url, fileName);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 동영상 옵션
  void _showVideoOptions(BuildContext context, AttachmentModel attachment) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadii.xl)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
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
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(
                  Icons.save_alt_rounded,
                  color: AppColors.error,
                ),
                title: const Text('갤러리에 저장'),
                onTap: () {
                  Navigator.pop(context);
                  _saveVideoToGallery(context, attachment);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 이미지 갤러리 저장
  Future<void> _saveImageToGallery(
      BuildContext context, String url, String? fileName) async {
    setState(() => _downloadingUrls.add(url));

    final name =
        fileName ?? 'image_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final result = await _downloadService.saveImageToGallery(url, name);

    setState(() => _downloadingUrls.remove(url));

    if (context.mounted) {
      _showResultSnackBar(context, result);
    }
  }

  // 동영상 갤러리 저장
  Future<void> _saveVideoToGallery(
      BuildContext context, AttachmentModel attachment) async {
    final url = attachment.url;
    setState(() {
      _downloadingUrls.add(url);
      _progressByUrl[url] = 0;
    });

    final name = attachment.fileName ??
        'video_${DateTime.now().millisecondsSinceEpoch}.mp4';
    final result = await _downloadService.saveVideoToGallery(
      url,
      name,
      onProgress: (progress) {
        setState(() => _progressByUrl[url] = progress);
      },
    );

    setState(() {
      _downloadingUrls.remove(url);
      _progressByUrl.remove(url);
    });

    if (context.mounted) {
      _showResultSnackBar(context, result);
    }
  }

  // 파일 다운로드 및 열기
  Future<void> _downloadAndOpenFile(
      BuildContext context, AttachmentModel attachment) async {
    final url = attachment.url;
    setState(() {
      _downloadingUrls.add(url);
      _progressByUrl[url] = 0;
    });

    final name =
        attachment.fileName ?? 'file_${DateTime.now().millisecondsSinceEpoch}';
    final result = await _downloadService.downloadFile(
      url,
      name,
      onProgress: (progress) {
        setState(() => _progressByUrl[url] = progress);
      },
    );

    setState(() {
      _downloadingUrls.remove(url);
      _progressByUrl.remove(url);
    });

    if (context.mounted) {
      if (result.success && result.filePath != null) {
        // 다운로드 성공 시 파일 열기
        await _downloadService.openFile(result.filePath!);
      } else {
        _showResultSnackBar(context, result);
      }
    }
  }

  void _showResultSnackBar(BuildContext context, DownloadResult result) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(result.message),
        backgroundColor: result.success ? AppColors.success : AppColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.sm),
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showFullScreenImage(
      BuildContext context, String imageUrl, String? fileName) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => _FullScreenImageView(
          imageUrl: imageUrl,
          fileName: fileName,
          downloadService: _downloadService,
        ),
      ),
    );
  }
}

// 전체화면 이미지 뷰어 (저장 버튼 포함)
class _FullScreenImageView extends StatefulWidget {
  final String imageUrl;
  final String? fileName;
  final DownloadService downloadService;

  const _FullScreenImageView({
    required this.imageUrl,
    this.fileName,
    required this.downloadService,
  });

  @override
  State<_FullScreenImageView> createState() => _FullScreenImageViewState();
}

class _FullScreenImageViewState extends State<_FullScreenImageView> {
  bool _isSaving = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
        actions: [
          IconButton(
            onPressed: _isSaving ? null : _saveImage,
            icon: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.download_rounded),
          ),
        ],
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.5,
          maxScale: 4.0,
          child: CachedNetworkImage(
            imageUrl: widget.imageUrl,
            fit: BoxFit.contain,
            placeholder: (context, url) => const Center(
              child: CircularProgressIndicator(color: Colors.white),
            ),
            errorWidget: (context, url, error) => const Icon(
              Icons.error,
              color: Colors.white,
              size: 50,
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _saveImage() async {
    setState(() => _isSaving = true);

    final name =
        widget.fileName ?? 'image_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final result =
        await widget.downloadService.saveImageToGallery(widget.imageUrl, name);

    setState(() => _isSaving = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message),
          backgroundColor: result.success ? AppColors.success : AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.sm),
          ),
        ),
      );
    }
  }
}

// 이미지 갤러리 뷰어 (스와이프)
class _ImageGalleryView extends StatefulWidget {
  final List<AttachmentModel> images;
  final int initialIndex;
  final DownloadService downloadService;

  const _ImageGalleryView({
    required this.images,
    required this.initialIndex,
    required this.downloadService,
  });

  @override
  State<_ImageGalleryView> createState() => _ImageGalleryViewState();
}

class _ImageGalleryViewState extends State<_ImageGalleryView> {
  late PageController _pageController;
  late int _currentIndex;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
        title: widget.images.length > 1
            ? Text(
                '${_currentIndex + 1} / ${widget.images.length}',
                style: const TextStyle(color: Colors.white, fontSize: 16),
              )
            : null,
        centerTitle: true,
        actions: [
          IconButton(
            onPressed: _isSaving ? null : _saveCurrentImage,
            icon: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.download_rounded),
          ),
        ],
      ),
      body: PageView.builder(
        controller: _pageController,
        itemCount: widget.images.length,
        onPageChanged: (index) {
          setState(() => _currentIndex = index);
        },
        itemBuilder: (context, index) {
          return InteractiveViewer(
            minScale: 0.5,
            maxScale: 4.0,
            child: Center(
              child: CachedNetworkImage(
                imageUrl: widget.images[index].url,
                fit: BoxFit.contain,
                placeholder: (context, url) => const Center(
                  child: CircularProgressIndicator(color: Colors.white),
                ),
                errorWidget: (context, url, error) => const Icon(
                  Icons.error,
                  color: Colors.white,
                  size: 50,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _saveCurrentImage() async {
    setState(() => _isSaving = true);

    final image = widget.images[_currentIndex];
    final name =
        image.fileName ?? 'image_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final result =
        await widget.downloadService.saveImageToGallery(image.url, name);

    setState(() => _isSaving = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message),
          backgroundColor: result.success ? AppColors.success : AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.sm),
          ),
        ),
      );
    }
  }
}
