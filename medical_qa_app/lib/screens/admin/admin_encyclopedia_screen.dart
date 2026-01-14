import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
import '../../models/encyclopedia_model.dart';
import '../../providers/auth_provider.dart';
import '../../services/encyclopedia_service.dart';
import '../../utils/app_colors.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';

class AdminEncyclopediaScreen extends StatefulWidget {
  const AdminEncyclopediaScreen({super.key});

  @override
  State<AdminEncyclopediaScreen> createState() => _AdminEncyclopediaScreenState();
}

class _AdminEncyclopediaScreenState extends State<AdminEncyclopediaScreen> {
  final EncyclopediaService _service = EncyclopediaService();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        StreamBuilder<List<EncyclopediaModel>>(
        stream: _service.getAllArticles(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final articles = snapshot.data ?? [];

          if (articles.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.article_outlined,
                    size: 64,
                    color: AppColors.textSecondary,
                  ),
                  SizedBox(height: 16),
                  Text(
                    '등록된 글이 없습니다',
                    style: TextStyle(
                      fontSize: 16,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    '+ 버튼을 눌러 새 글을 작성하세요',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textTertiary,
                    ),
                  ),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: articles.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final article = articles[index];
              return _AdminArticleCard(
                article: article,
                onEdit: () => _editArticle(article),
                onDelete: () => _confirmDelete(article),
                onTogglePublish: () => _togglePublish(article),
              );
            },
          );
        },
      ),
        Positioned(
          right: 16,
          bottom: 16,
          child: FloatingActionButton(
            onPressed: _createArticle,
            backgroundColor: const Color(0xFF6B4E71),
            child: const Icon(Icons.add, color: Colors.white),
          ),
        ),
      ],
    );
  }

  void _createArticle() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const ArticleEditScreen(),
      ),
    );
  }

  void _editArticle(EncyclopediaModel article) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ArticleEditScreen(article: article),
      ),
    );
  }

  void _confirmDelete(EncyclopediaModel article) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('삭제 확인'),
        content: Text('"${article.title}" 글을 삭제하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _deleteArticle(article);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('삭제'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteArticle(EncyclopediaModel article) async {
    try {
      await _service.deleteArticle(article.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('글이 삭제되었습니다'),
            backgroundColor: AppColors.textPrimary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('삭제 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _togglePublish(EncyclopediaModel article) async {
    try {
      final updated = article.copyWith(isPublished: !article.isPublished);
      await _service.updateArticle(updated);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(updated.isPublished ? '글이 공개되었습니다' : '글이 비공개되었습니다'),
            backgroundColor: AppColors.textPrimary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('변경 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

class _AdminArticleCard extends StatelessWidget {
  final EncyclopediaModel article;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onTogglePublish;

  const _AdminArticleCard({
    required this.article,
    required this.onEdit,
    required this.onDelete,
    required this.onTogglePublish,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.inputBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: article.isPublished ? AppColors.divider : Colors.orange.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // 공개 상태
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: article.isPublished
                      ? Colors.green.withValues(alpha: 0.1)
                      : Colors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  article.isPublished ? '공개' : '비공개',
                  style: TextStyle(
                    fontSize: 11,
                    color: article.isPublished ? Colors.green : Colors.orange,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const Spacer(),
              // 메뉴 버튼
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, color: AppColors.textSecondary),
                onSelected: (value) {
                  switch (value) {
                    case 'edit':
                      onEdit();
                      break;
                    case 'toggle':
                      onTogglePublish();
                      break;
                    case 'delete':
                      onDelete();
                      break;
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'edit',
                    child: Row(
                      children: [
                        Icon(Icons.edit, size: 18),
                        SizedBox(width: 8),
                        Text('수정'),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'toggle',
                    child: Row(
                      children: [
                        Icon(
                          article.isPublished ? Icons.visibility_off : Icons.visibility,
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                        Text(article.isPublished ? '비공개로 전환' : '공개로 전환'),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete, size: 18, color: Colors.red),
                        SizedBox(width: 8),
                        Text('삭제', style: TextStyle(color: Colors.red)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          // 제목
          Text(
            article.title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          // 내용 미리보기
          Text(
            article.content,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 12),
          // 메타 정보
          Row(
            children: [
              Text(
                DateFormat('yyyy.MM.dd HH:mm').format(article.createdAt),
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textTertiary,
                ),
              ),
              const Spacer(),
              Icon(
                Icons.visibility_outlined,
                size: 14,
                color: AppColors.textTertiary,
              ),
              const SizedBox(width: 4),
              Text(
                '${article.viewCount}',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textTertiary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// 글 작성/수정 화면
class ArticleEditScreen extends StatefulWidget {
  final EncyclopediaModel? article;

  const ArticleEditScreen({super.key, this.article});

  @override
  State<ArticleEditScreen> createState() => _ArticleEditScreenState();
}

class _ArticleEditScreenState extends State<ArticleEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  final EncyclopediaService _service = EncyclopediaService();
  final ImagePicker _imagePicker = ImagePicker();

  bool _isPublished = true;
  bool _isLoading = false;
  File? _selectedImage;
  String? _existingImageUrl;
  bool _isUploadingImage = false;

  bool get _isEditing => widget.article != null;

  @override
  void initState() {
    super.initState();
    if (widget.article != null) {
      _titleController.text = widget.article!.title;
      _contentController.text = widget.article!.content;
      _isPublished = widget.article!.isPublished;
      _existingImageUrl = widget.article!.imageUrl;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    try {
      final pickedFile = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );
      if (pickedFile != null) {
        setState(() {
          _selectedImage = File(pickedFile.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('이미지 선택 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<String?> _uploadImage() async {
    if (_selectedImage == null) return _existingImageUrl;

    setState(() => _isUploadingImage = true);

    try {
      final fileName = '${const Uuid().v4()}.jpg';
      final ref = FirebaseStorage.instance
          .ref()
          .child('encyclopedia_images')
          .child(fileName);

      await ref.putFile(_selectedImage!);
      final downloadUrl = await ref.getDownloadURL();
      return downloadUrl;
    } catch (e) {
      debugPrint('Image upload error: $e');
      return null;
    } finally {
      if (mounted) {
        setState(() => _isUploadingImage = false);
      }
    }
  }

  void _removeImage() {
    setState(() {
      _selectedImage = null;
      _existingImageUrl = null;
    });
  }

  Widget _buildImageSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '대표 이미지',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        if (_selectedImage != null)
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(
                  _selectedImage!,
                  width: double.infinity,
                  height: 200,
                  fit: BoxFit.cover,
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: GestureDetector(
                  onTap: _removeImage,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.black54,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ),
            ],
          )
        else if (_existingImageUrl != null)
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  _existingImageUrl!,
                  width: double.infinity,
                  height: 200,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 200,
                    color: AppColors.divider,
                    child: const Center(
                      child: Icon(Icons.image_not_supported, size: 48),
                    ),
                  ),
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: GestureDetector(
                  onTap: _removeImage,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.black54,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ),
            ],
          )
        else
          GestureDetector(
            onTap: _pickImage,
            child: Container(
              width: double.infinity,
              height: 150,
              decoration: BoxDecoration(
                color: AppColors.inputBackground,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.inputBorder,
                  style: BorderStyle.solid,
                ),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.add_photo_alternate_outlined,
                    size: 48,
                    color: AppColors.textSecondary,
                  ),
                  SizedBox(height: 8),
                  Text(
                    '이미지 추가',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        if (_selectedImage != null || _existingImageUrl != null) ...[
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: _pickImage,
            icon: const Icon(Icons.refresh, size: 18),
            label: const Text('이미지 변경'),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF6B4E71),
            ),
          ),
        ],
        const SizedBox(height: 24),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          _isEditing ? '글 수정' : '새 글 작성',
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _saveArticle,
            child: Text(
              _isEditing ? '수정' : '등록',
              style: TextStyle(
                color: _isLoading ? AppColors.textTertiary : const Color(0xFF6B4E71),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(),
                  if (_isUploadingImage) ...[
                    const SizedBox(height: 16),
                    const Text(
                      '이미지 업로드 중...',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ],
                ],
              ),
            )
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  // 이미지
                  _buildImageSection(),
                  // 제목
                  const Text(
                    '제목',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _titleController,
                    decoration: InputDecoration(
                      hintText: '제목을 입력하세요',
                      hintStyle: const TextStyle(color: AppColors.textTertiary),
                      filled: true,
                      fillColor: AppColors.inputBackground,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.inputBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.inputBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFF6B4E71)),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return '제목을 입력해주세요';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),

                  // 내용
                  const Text(
                    '내용',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _contentController,
                    maxLines: 15,
                    decoration: InputDecoration(
                      hintText: '내용을 입력하세요',
                      hintStyle: const TextStyle(color: AppColors.textTertiary),
                      filled: true,
                      fillColor: AppColors.inputBackground,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.inputBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.inputBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFF6B4E71)),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return '내용을 입력해주세요';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),

                  // 공개 설정
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        '바로 공개',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Switch(
                        value: _isPublished,
                        onChanged: (value) {
                          setState(() => _isPublished = value);
                        },
                        activeColor: const Color(0xFF6B4E71),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }

  Future<void> _saveArticle() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final user = authProvider.currentUser;

      // 이미지 업로드
      final imageUrl = await _uploadImage();

      if (_isEditing) {
        final updated = widget.article!.copyWith(
          title: _titleController.text.trim(),
          content: _contentController.text.trim(),
          imageUrl: imageUrl,
          isPublished: _isPublished,
          updatedAt: DateTime.now(),
        );
        await _service.updateArticle(updated);
      } else {
        final newArticle = EncyclopediaModel(
          id: '',
          title: _titleController.text.trim(),
          content: _contentController.text.trim(),
          imageUrl: imageUrl,
          authorId: user?.userId ?? '',
          authorName: user?.name ?? '관리자',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          isPublished: _isPublished,
        );
        await _service.createArticle(newArticle);
      }

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isEditing ? '글이 수정되었습니다' : '글이 등록되었습니다'),
            backgroundColor: AppColors.textPrimary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('저장 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}
