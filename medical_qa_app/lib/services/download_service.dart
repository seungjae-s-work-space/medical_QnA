import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:image_gallery_saver/image_gallery_saver.dart';
import 'package:open_filex/open_filex.dart';
import 'package:permission_handler/permission_handler.dart';

class DownloadService {
  final Dio _dio = Dio();

  /// 이미지를 갤러리에 저장
  Future<DownloadResult> saveImageToGallery(String url, String fileName) async {
    try {
      // 권한 확인
      if (!await _requestStoragePermission()) {
        return DownloadResult(success: false, message: '저장 권한이 필요합니다');
      }

      // 다운로드
      final response = await _dio.get(
        url,
        options: Options(responseType: ResponseType.bytes),
        onReceiveProgress: (received, total) {
          // 진행률 콜백 가능
        },
      );

      // 갤러리에 저장
      final result = await ImageGallerySaver.saveImage(
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
      return DownloadResult(success: false, message: '다운로드 실패: $e');
    }
  }

  /// 동영상을 갤러리에 저장
  Future<DownloadResult> saveVideoToGallery(
    String url,
    String fileName, {
    Function(double)? onProgress,
  }) async {
    try {
      // 권한 확인
      if (!await _requestStoragePermission()) {
        return DownloadResult(success: false, message: '저장 권한이 필요합니다');
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
      final result = await ImageGallerySaver.saveFile(tempPath);

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
      return DownloadResult(success: false, message: '다운로드 실패: $e');
    }
  }

  /// 파일을 다운로드 폴더에 저장
  Future<DownloadResult> downloadFile(
    String url,
    String fileName, {
    Function(double)? onProgress,
  }) async {
    try {
      // 권한 확인
      if (!await _requestStoragePermission()) {
        return DownloadResult(success: false, message: '저장 권한이 필요합니다');
      }

      // 다운로드 디렉토리 가져오기
      Directory? downloadDir;
      if (Platform.isAndroid) {
        downloadDir = Directory('/storage/emulated/0/Download');
        if (!await downloadDir.exists()) {
          downloadDir = await getExternalStorageDirectory();
        }
      } else {
        downloadDir = await getApplicationDocumentsDirectory();
      }

      if (downloadDir == null) {
        return DownloadResult(success: false, message: '저장 경로를 찾을 수 없습니다');
      }

      final filePath = '${downloadDir.path}/$fileName';

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

      return DownloadResult(
        success: true,
        message: '다운로드 완료',
        filePath: filePath,
      );
    } catch (e) {
      return DownloadResult(success: false, message: '다운로드 실패: $e');
    }
  }

  /// 파일 열기
  Future<void> openFile(String filePath) async {
    await OpenFilex.open(filePath);
  }

  /// 저장 권한 요청
  Future<bool> _requestStoragePermission() async {
    if (Platform.isIOS) {
      // iOS는 앱 샌드박스에 저장하므로 권한 불필요
      final photosStatus = await Permission.photos.request();
      return photosStatus.isGranted || photosStatus.isLimited;
    }

    // Android 13+ (API 33+)
    if (Platform.isAndroid) {
      // Android 13 이상에서는 세분화된 권한 사용
      final photos = await Permission.photos.status;
      final videos = await Permission.videos.status;

      if (photos.isGranted && videos.isGranted) {
        return true;
      }

      // 권한 요청
      final results = await [
        Permission.photos,
        Permission.videos,
      ].request();

      // 구버전 Android (13 미만)
      if (results[Permission.photos]?.isDenied == true &&
          results[Permission.videos]?.isDenied == true) {
        final storage = await Permission.storage.request();
        return storage.isGranted;
      }

      return results[Permission.photos]?.isGranted == true ||
          results[Permission.videos]?.isGranted == true;
    }

    return true;
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
