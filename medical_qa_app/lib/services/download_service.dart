import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:image_gallery_saver_plus/image_gallery_saver_plus.dart';
import 'package:open_filex/open_filex.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/foundation.dart';

class DownloadService {
  final Dio _dio = Dio();

  /// 이미지를 갤러리에 저장
  Future<DownloadResult> saveImageToGallery(String url, String fileName) async {
    try {
      // 갤러리 저장 권한 확인 (이미지/동영상용)
      if (!await _requestGalleryPermission()) {
        return DownloadResult(success: false, message: '사진 라이브러리 접근 권한이 필요합니다');
      }

      // 다운로드
      final response = await _dio.get(
        url,
        options: Options(responseType: ResponseType.bytes),
      );

      // 갤러리에 저장
      final result = await ImageGallerySaverPlus.saveImage(
        response.data,
        quality: 100,
        name: fileName,
      );

      if (result['isSuccess'] == true) {
        return DownloadResult(success: true, message: '갤러리에 저장되었습니다');
      } else {
        return DownloadResult(success: false, message: '저장에 실패했습니다');
      }
    } catch (e) {
      debugPrint('이미지 저장 오류: $e');
      return DownloadResult(success: false, message: '다운로드 실패');
    }
  }

  /// 동영상을 갤러리에 저장
  Future<DownloadResult> saveVideoToGallery(
    String url,
    String fileName, {
    Function(double)? onProgress,
  }) async {
    try {
      // 갤러리 저장 권한 확인
      if (!await _requestGalleryPermission()) {
        return DownloadResult(success: false, message: '사진 라이브러리 접근 권한이 필요합니다');
      }

      // 임시 디렉토리에 다운로드
      final tempDir = await getTemporaryDirectory();
      final tempPath = '${tempDir.path}/$fileName';

      await _dio.download(
        url,
        tempPath,
        onReceiveProgress: (received, total) {
          if (total != -1 && onProgress != null) {
            onProgress(received / total);
          }
        },
      );

      // 갤러리에 저장
      final result = await ImageGallerySaverPlus.saveFile(tempPath);

      // 임시 파일 삭제
      final tempFile = File(tempPath);
      if (await tempFile.exists()) {
        await tempFile.delete();
      }

      if (result['isSuccess'] == true) {
        return DownloadResult(success: true, message: '갤러리에 저장되었습니다');
      } else {
        return DownloadResult(success: false, message: '저장에 실패했습니다');
      }
    } catch (e) {
      debugPrint('동영상 저장 오류: $e');
      return DownloadResult(success: false, message: '다운로드 실패');
    }
  }

  /// 파일(PDF, 문서 등)을 다운로드하고 바로 열기
  /// iOS: 앱 Documents 폴더에 저장 (권한 불필요)
  /// Android: 앱 전용 저장소에 저장 (권한 불필요)
  Future<DownloadResult> downloadFile(
    String url,
    String fileName, {
    Function(double)? onProgress,
    bool openAfterDownload = true,
  }) async {
    try {
      // 앱 전용 디렉토리에 저장 (권한 불필요)
      final downloadDir = await _getAppDocumentsDirectory();

      if (downloadDir == null) {
        return DownloadResult(success: false, message: '저장 경로를 찾을 수 없습니다');
      }

      // 파일명 중복 방지
      final safeFileName = _getSafeFileName(fileName);
      final filePath = '${downloadDir.path}/$safeFileName';

      // 다운로드
      await _dio.download(
        url,
        filePath,
        onReceiveProgress: (received, total) {
          if (total != -1 && onProgress != null) {
            onProgress(received / total);
          }
        },
      );

      // 다운로드 후 바로 열기
      if (openAfterDownload) {
        await openFile(filePath);
      }

      return DownloadResult(
        success: true,
        message: '다운로드 완료',
        filePath: filePath,
      );
    } catch (e) {
      debugPrint('파일 다운로드 오류: $e');
      return DownloadResult(success: false, message: '다운로드 실패');
    }
  }

  /// 파일 열기 (시스템 기본 앱으로)
  Future<OpenResult> openFile(String filePath) async {
    return await OpenFilex.open(filePath);
  }

  /// URL에서 직접 열기 (다운로드 없이)
  Future<DownloadResult> openFileFromUrl(String url, String fileName) async {
    try {
      // 임시 디렉토리에 다운로드 후 열기
      final tempDir = await getTemporaryDirectory();
      final safeFileName = _getSafeFileName(fileName);
      final tempPath = '${tempDir.path}/$safeFileName';

      await _dio.download(url, tempPath);

      final result = await OpenFilex.open(tempPath);

      if (result.type == ResultType.done) {
        return DownloadResult(success: true, message: '파일 열기 성공', filePath: tempPath);
      } else {
        return DownloadResult(success: false, message: '파일을 열 수 없습니다: ${result.message}');
      }
    } catch (e) {
      debugPrint('파일 열기 오류: $e');
      return DownloadResult(success: false, message: '파일 열기 실패');
    }
  }

  /// 앱 Documents 디렉토리 가져오기 (권한 불필요)
  Future<Directory?> _getAppDocumentsDirectory() async {
    try {
      if (Platform.isIOS) {
        return await getApplicationDocumentsDirectory();
      } else if (Platform.isAndroid) {
        // Android: 앱 전용 외부 저장소 사용 (권한 불필요)
        return await getApplicationDocumentsDirectory();
      }
      return await getApplicationDocumentsDirectory();
    } catch (e) {
      debugPrint('디렉토리 가져오기 오류: $e');
      return null;
    }
  }

  /// 파일명에서 안전하지 않은 문자 제거
  String _getSafeFileName(String fileName) {
    // 타임스탬프 추가로 중복 방지
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final extension = fileName.contains('.')
        ? '.${fileName.split('.').last}'
        : '';
    final baseName = fileName.contains('.')
        ? fileName.substring(0, fileName.lastIndexOf('.'))
        : fileName;

    // 안전한 문자만 유지
    final safeName = baseName.replaceAll(RegExp(r'[^\w\s\-.]'), '_');

    return '${safeName}_$timestamp$extension';
  }

  /// 갤러리 저장 권한 요청 (이미지/동영상 저장용)
  Future<bool> _requestGalleryPermission() async {
    if (Platform.isIOS) {
      // iOS: 사진 라이브러리 추가 권한 필요
      final status = await Permission.photosAddOnly.request();
      if (status.isGranted || status.isLimited) {
        return true;
      }
      // photosAddOnly가 안되면 photos 시도
      final photosStatus = await Permission.photos.request();
      return photosStatus.isGranted || photosStatus.isLimited;
    }

    if (Platform.isAndroid) {
      // Android 버전에 따른 권한 처리
      final androidInfo = await _getAndroidSdkVersion();

      if (androidInfo >= 33) {
        // Android 13+ (API 33+): 세분화된 미디어 권한
        final photos = await Permission.photos.request();
        final videos = await Permission.videos.request();
        return photos.isGranted || videos.isGranted;
      } else if (androidInfo >= 29) {
        // Android 10-12 (API 29-32): storage 권한 또는 미디어 위치 권한
        final storage = await Permission.storage.request();
        return storage.isGranted || storage.isLimited;
      } else {
        // Android 9 이하: storage 권한
        final storage = await Permission.storage.request();
        return storage.isGranted;
      }
    }

    return true;
  }

  /// Android SDK 버전 가져오기
  Future<int> _getAndroidSdkVersion() async {
    if (!Platform.isAndroid) return 0;

    try {
      // Android 버전 체크를 위한 간단한 방법
      // permission_handler가 내부적으로 처리하므로 기본값 사용
      return 33; // 최신 버전 기준으로 처리
    } catch (e) {
      return 33;
    }
  }
}

class DownloadResult {
  final bool success;
  final String message;
  final String? filePath;

  DownloadResult({
    required this.success,
    required this.message,
    this.filePath,
  });
}
