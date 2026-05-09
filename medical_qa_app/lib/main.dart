import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/email_verification_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/user/home_screen.dart';
import 'screens/admin/admin_conversations_screen.dart';
import 'services/notification_service.dart';
import 'services/force_update_service.dart';
import 'services/app_navigation.dart';
import 'design/app_theme.dart';
import 'utils/app_colors.dart';
import 'utils/startup_debug_log.dart';
import 'widgets/startup_debug_log_overlay.dart';

// 모바일 전용 import
import 'package:firebase_messaging/firebase_messaging.dart'
    if (dart.library.io) 'package:firebase_messaging/firebase_messaging.dart';

// Windows 전용 import
import 'package:window_manager/window_manager.dart';
import 'package:tray_manager/tray_manager.dart';

/// 백그라운드 메시지 핸들러 (모바일 전용, 최상위 함수여야 함)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  StartupDebugLog.instance.add('backgroundMessage', {
    'messageId': message.messageId,
  });
  debugPrint('백그라운드 메시지 수신: ${message.messageId}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  StartupDebugLog.instance.add('main.ensureInitialized', {
    'platform': Platform.operatingSystem,
  });

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  StartupDebugLog.instance.add('main.firebaseInitialized');

  // Crashlytics 초기화 (모바일만)
  if (Platform.isAndroid || Platform.isIOS) {
    FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
    PlatformDispatcher.instance.onError = (error, stack) {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      return true;
    };
    StartupDebugLog.instance.add('main.crashlyticsConfigured');
  }

  // 모바일에서만 FCM 백그라운드 핸들러 등록
  if (Platform.isAndroid || Platform.isIOS) {
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    StartupDebugLog.instance.add('main.fcmBackgroundHandlerRegistered');
  }

  // Windows 초기화
  if (Platform.isWindows) {
    await windowManager.ensureInitialized();

    WindowOptions windowOptions = const WindowOptions(
      size: Size(400, 700),
      minimumSize: Size(350, 500),
      center: true,
      backgroundColor: Colors.transparent,
      skipTaskbar: false,
      titleBarStyle: TitleBarStyle.normal,
      title: '골통주부의 난임&상담톡',
    );

    windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }

  StartupDebugLog.instance.add('main.runApp');
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: MaterialApp(
        title: '골통주부의 난임&상담톡',
        navigatorKey: appNavigatorKey,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        builder: (context, child) => StartupDebugLogOverlay(
          child: child ?? const SizedBox.shrink(),
        ),
        home: const AuthWrapper(),
      ),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> with TrayListener {
  bool _notificationInitialized = false;
  String? _lastRouteLog;
  final NotificationService _notificationService = NotificationService();
  final ForceUpdateService _forceUpdateService = ForceUpdateService();

  @override
  void initState() {
    super.initState();
    StartupDebugLog.instance.add('AuthWrapper.initState', {
      'platform': Platform.operatingSystem,
    });
    if (Platform.isWindows) {
      trayManager.addListener(this);
      _initSystemTray();
    }
    _checkForUpdate();
  }

  Future<void> _checkForUpdate() async {
    StartupDebugLog.instance.add('ForceUpdate.check.start');
    await _forceUpdateService.loadCurrentVersion();
    await _forceUpdateService.initialize();
    StartupDebugLog.instance.add('ForceUpdate.check.done', {
      'needsUpdate': _forceUpdateService.needsUpdate,
    });
    if (mounted) {
      if (_forceUpdateService.needsUpdate) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _forceUpdateService.showUpdateDialog(context);
        });
      }
    }
  }

  @override
  void dispose() {
    if (Platform.isWindows) {
      trayManager.removeListener(this);
    }
    super.dispose();
  }

  /// Windows 시스템 트레이 초기화
  Future<void> _initSystemTray() async {
    await trayManager.setIcon('windows/runner/resources/app_icon.ico');
    await trayManager.setToolTip('골통주부의 난임&상담톡');

    Menu menu = Menu(
      items: [
        MenuItem(
          label: '열기',
          onClick: (menuItem) async {
            await windowManager.show();
            await windowManager.focus();
          },
        ),
        MenuItem.separator(),
        MenuItem(
          label: '종료',
          onClick: (menuItem) async {
            await windowManager.close();
          },
        ),
      ],
    );
    await trayManager.setContextMenu(menu);
  }

  /// 트레이 아이콘 클릭 시
  @override
  void onTrayIconMouseDown() async {
    await windowManager.show();
    await windowManager.focus();
  }

  /// 트레이 아이콘 우클릭 시
  @override
  void onTrayIconRightMouseDown() {
    trayManager.popUpContextMenu();
  }

  void _logAfterFrame(String message,
      [Map<String, Object?> details = const {}]) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      StartupDebugLog.instance.add(message, details);
    });
  }

  void _logRoute(String route) {
    if (_lastRouteLog == route) return;
    _lastRouteLog = route;
    _logAfterFrame('AuthWrapper.route.$route');
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    // 초기화 중 → Splash 화면
    if (!authProvider.isInitialized) {
      _logRoute('splash');
      return Scaffold(
        backgroundColor: AppColors.backgroundWarm,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset(
                'assets/images/loginlogo4xreal.png',
                height: 80,
                fit: BoxFit.contain,
              ),
              const SizedBox(height: 24),
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.accent,
                ),
              ),
            ],
          ),
        ),
      );
    }

    // 로그인도 안 되어 있고, 게스트도 아닌 경우 → 로그인 화면
    if (!authProvider.canAccessHome) {
      _logRoute('login');
      _notificationInitialized = false;
      _notificationService.stopListening();
      return const LoginScreen();
    }

    // 게스트 모드인 경우 → 홈 화면 (알림 초기화 없음)
    if (authProvider.isGuest) {
      _logRoute('guestHome');
      return const HomeScreen();
    }

    // 이메일 인증이 필요한 경우 → 인증 안내 화면
    if (authProvider.requiresEmailVerification) {
      _logRoute('emailVerification');
      _notificationInitialized = false;
      _notificationService.stopListening();
      return const EmailVerificationScreen();
    }

    // 로그인된 사용자
    // 알림 초기화 (한 번만)
    if (!_notificationInitialized) {
      _notificationInitialized = true;
      _logAfterFrame('Notification.initialize.start', {
        'isAdmin': authProvider.isAdmin,
      });
      _notificationService.initialize();

      // Windows 관리자: Firestore 리스너 시작
      if (Platform.isWindows && authProvider.isAdmin) {
        _notificationService.startListeningForNewMessages();
      }
    }

    // 관리자는 관리자 화면, 일반 사용자는 홈 화면
    if (authProvider.isAdmin) {
      _logRoute('admin');
      return const AdminConversationsScreen();
    } else {
      _logRoute('home');
      return const HomeScreen();
    }
  }
}
