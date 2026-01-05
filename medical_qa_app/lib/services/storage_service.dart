import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:uuid/uuid.dart';

class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final Uuid _uuid = const Uuid();

  // 이미지 업로드
  Future<String> uploadImage(File file, String folder) async {
    try {
      String fileName = '${_uuid.v4()}.jpg';
      String path = '$folder/$fileName';

      Reference ref = _storage.ref().child(path);
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
}
