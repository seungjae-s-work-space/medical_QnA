import 'dart:io';
import 'package:flutter/material.dart';
import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

/// 업데이트 모드
/// - none: 아무것도 안 뜸
/// - recommend: 닫기 가능한 안내 팝업
/// - force: 닫기 불가 강제 팝업
enum UpdateMode { none, recommend, force }

class ForceUpdateService {
  static final ForceUpdateService _instance = ForceUpdateService._internal();
  factory ForceUpdateService() => _instance;
  ForceUpdateService._internal();

  final _remoteConfig = FirebaseRemoteConfig.instance;
  String _currentVersion = '0.0.0';

  /// Remote Config 초기화
  Future<void> initialize() async {
    await _remoteConfig.setConfigSettings(RemoteConfigSettings(
      fetchTimeout: const Duration(seconds: 10),
      minimumFetchInterval: const Duration(minutes: 30),
    ));

    await _remoteConfig.setDefaults({
      'minimum_version': '1.0.0',
      'update_message': '새로운 버전이 출시되었습니다.\n최신 버전으로 업데이트해주세요.',
      'update_mode': 'none', // none, recommend, force
    });

    try {
      await _remoteConfig.fetchAndActivate();
    } catch (e) {
      debugPrint('Remote Config fetch error: $e');
    }
  }

  Future<void> loadCurrentVersion() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      _currentVersion = packageInfo.version;
    } catch (e) {
      debugPrint('PackageInfo error: $e');
      _currentVersion = '0.0.0';
    }
  }

  /// 현재 업데이트 모드
  UpdateMode get updateMode {
    final mode = _remoteConfig.getString('update_mode');
    switch (mode) {
      case 'force':
        return UpdateMode.force;
      case 'recommend':
        return UpdateMode.recommend;
      default:
        return UpdateMode.none;
    }
  }

  /// 업데이트 필요 여부 확인
  bool get needsUpdate {
    if (updateMode == UpdateMode.none) return false;

    final minimumVersion = _remoteConfig.getString('minimum_version');
    return _isVersionLower(_currentVersion, minimumVersion);
  }

  String get updateMessage => _remoteConfig.getString('update_message');

  /// 버전 비교: current < minimum이면 true
  bool _isVersionLower(String current, String minimum) {
    final currentParts = current.split('.').map(int.parse).toList();
    final minimumParts = minimum.split('.').map(int.parse).toList();

    for (int i = 0; i < 3; i++) {
      final c = i < currentParts.length ? currentParts[i] : 0;
      final m = i < minimumParts.length ? minimumParts[i] : 0;
      if (c < m) return true;
      if (c > m) return false;
    }
    return false;
  }

  /// 업데이트 다이얼로그 표시
  void showUpdateDialog(BuildContext context) {
    final isForce = updateMode == UpdateMode.force;

    showDialog(
      context: context,
      barrierDismissible: !isForce,
      builder: (context) => PopScope(
        canPop: !isForce,
        child: AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: const Row(
            children: [
              Icon(Icons.system_update, color: Color(0xFFB87BA8)),
              SizedBox(width: 8),
              Text(
                '업데이트 안내',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF333333),
                ),
              ),
            ],
          ),
          content: Text(
            updateMessage,
            style: const TextStyle(
              fontSize: 16,
              color: Color(0xFF666666),
              height: 1.5,
            ),
          ),
          actions: [
            if (!isForce)
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text(
                  '나중에',
                  style: TextStyle(
                    fontSize: 16,
                    color: Color(0xFF888888),
                  ),
                ),
              ),
            ElevatedButton(
              onPressed: () => _openStore(),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB87BA8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              ),
              child: const Text(
                '업데이트하기',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 스토어 열기
  Future<void> _openStore() async {
    final Uri url;
    if (Platform.isIOS) {
      url = Uri.parse('https://apps.apple.com/us/app/id6759237772');
    } else {
      url = Uri.parse(
          'https://play.google.com/store/apps/details?id=net.agisungong.nanimtalktalk&hl=en');
    }

    try {
      final launched = await launchUrl(
        url,
        mode: LaunchMode.externalApplication,
      );
      if (!launched) {
        debugPrint('Could not launch store URL: $url');
      }
    } catch (e) {
      debugPrint('Store launch error: $e');
    }
  }
}
