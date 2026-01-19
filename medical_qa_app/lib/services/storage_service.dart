import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:uuid/uuid.dart';
import 'package:path/path.dart' as path;
import '../models/message_model.dart';

class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final Uuid _uuid = const Uuid();

  // 이미지 업로드
  Future<String> uploadImage(File file, String folder) async {
    try {
      String fileName = '${_uuid.v4()}.jpg';
      String filePath = '$folder/$fileName';

      Reference ref = _storage.ref().child(filePath);
      UploadTask uploadTask = ref.putFile(file);

      TaskSnapshot snapshot = await uploadTask;
      String downloadUrl = await snapshot.ref.getDownloadURL();

      return downloadUrl;
    } catch (e) {
      print('이미지 업로드 오류: $e');
      rethrow;
    }
  }

  // 채팅 이미지 업로드
  Future<String> uploadChatImage(File file) async {
    return await uploadImage(file, 'chat_images');
  }

  // 프로필 이미지 업로드
  Future<String> uploadProfileImage(File file) async {
    return await uploadImage(file, 'profile_images');
  }

  // 채팅 영상 업로드
  Future<String> uploadChatVideo(File file) async {
    try {
      String extension = path.extension(file.path).toLowerCase();
      if (extension.isEmpty) extension = '.mp4';

      String fileName = '${_uuid.v4()}$extension';
      String filePath = 'chat_videos/$fileName';

      Reference ref = _storage.ref().child(filePath);

      // 영상 파일의 메타데이터 설정
      SettableMetadata metadata = SettableMetadata(
        contentType: _getVideoMimeType(extension),
      );

      UploadTask uploadTask = ref.putFile(file, metadata);

      TaskSnapshot snapshot = await uploadTask;
      String downloadUrl = await snapshot.ref.getDownloadURL();

      return downloadUrl;
    } catch (e) {
      print('영상 업로드 오류: $e');
      rethrow;
    }
  }

  // 채팅 파일 업로드
  Future<String> uploadChatFile(File file, String originalFileName) async {
    try {
      String extension = path.extension(originalFileName).toLowerCase();
      String fileName = '${_uuid.v4()}$extension';
      String filePath = 'chat_files/$fileName';

      Reference ref = _storage.ref().child(filePath);

      // 파일의 메타데이터 설정 (원본 파일명 저장)
      SettableMetadata metadata = SettableMetadata(
        contentType: _getFileMimeType(extension),
        customMetadata: {
          'originalFileName': originalFileName,
        },
      );

      UploadTask uploadTask = ref.putFile(file, metadata);

      TaskSnapshot snapshot = await uploadTask;
      String downloadUrl = await snapshot.ref.getDownloadURL();

      return downloadUrl;
    } catch (e) {
      print('파일 업로드 오류: $e');
      rethrow;
    }
  }

  // 첨부파일 업로드 (통합 메서드)
  Future<AttachmentModel> uploadAttachment({
    required File file,
    required AttachmentType type,
    String? originalFileName,
  }) async {
    try {
      String fileName = originalFileName ?? path.basename(file.path);
      int fileSize = await file.length();
      String url;
      String? mimeType;
      String? thumbnailUrl;

      switch (type) {
        case AttachmentType.image:
          url = await uploadChatImage(file);
          mimeType = _getImageMimeType(path.extension(file.path).toLowerCase());
          break;
        case AttachmentType.video:
          url = await uploadChatVideo(file);
          mimeType = _getVideoMimeType(path.extension(file.path).toLowerCase());
          break;
        case AttachmentType.file:
          url = await uploadChatFile(file, fileName);
          mimeType = _getFileMimeType(path.extension(fileName).toLowerCase());
          break;
      }

      return AttachmentModel(
        url: url,
        type: type,
        fileName: fileName,
        fileSize: fileSize,
        mimeType: mimeType,
        thumbnailUrl: thumbnailUrl,
      );
    } catch (e) {
      print('첨부파일 업로드 오류: $e');
      rethrow;
    }
  }

  // 이미지 삭제
  Future<void> deleteImage(String imageUrl) async {
    try {
      Reference ref = _storage.refFromURL(imageUrl);
      await ref.delete();
    } catch (e) {
      print('이미지 삭제 오류: $e');
      // 이미지 삭제 실패는 크리티컬하지 않으므로 에러를 던지지 않음
    }
  }

  // 파일 삭제 (일반)
  Future<void> deleteFile(String fileUrl) async {
    try {
      Reference ref = _storage.refFromURL(fileUrl);
      await ref.delete();
    } catch (e) {
      print('파일 삭제 오류: $e');
    }
  }

  // 영상 MIME 타입 반환
  String _getVideoMimeType(String extension) {
    switch (extension) {
      case '.mp4':
        return 'video/mp4';
      case '.mov':
        return 'video/quicktime';
      case '.avi':
        return 'video/x-msvideo';
      case '.mkv':
        return 'video/x-matroska';
      case '.webm':
        return 'video/webm';
      default:
        return 'video/mp4';
    }
  }

  // 이미지 MIME 타입 반환
  String _getImageMimeType(String extension) {
    switch (extension) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      case '.webp':
        return 'image/webp';
      case '.heic':
        return 'image/heic';
      default:
        return 'image/jpeg';
    }
  }

  // 파일 MIME 타입 반환
  String _getFileMimeType(String extension) {
    switch (extension) {
      case '.pdf':
        return 'application/pdf';
      case '.doc':
        return 'application/msword';
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.xls':
        return 'application/vnd.ms-excel';
      case '.xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case '.ppt':
        return 'application/vnd.ms-powerpoint';
      case '.pptx':
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case '.txt':
        return 'text/plain';
      case '.zip':
        return 'application/zip';
      case '.rar':
        return 'application/x-rar-compressed';
      default:
        return 'application/octet-stream';
    }
  }
}
