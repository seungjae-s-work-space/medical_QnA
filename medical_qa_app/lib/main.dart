import 'dart:io';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'providers/auth_provider.dart';
import 'providers/subscription_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/user/home_screen.dart';
import 'screens/admin/admin_conversations_screen.dart';
import 'services/notification_service.dart';

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
  debugPrint('백그라운드 메시지 수신: ${message.messageId}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // 모바일에서만 FCM 백그라운드 핸들러 등록
  if (Platform.isAndroid || Platform.isIOS) {
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
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

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => SubscriptionProvider()),
      ],
      child: MaterialApp(
        title: '골통주부의 난임&상담톡',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
          useMaterial3: true,
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
  final NotificationService _notificationService = NotificationService();

  @override
  void initState() {
    super.initState();
    if (Platform.isWindows) {
      trayManager.addListener(this);
      _initSystemTray();
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

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    // 초기화 중 → Splash 화면
    if (!authProvider.isInitialized) {
      return Scaffold(
        backgroundColor: const Color(0xFFFDF6F9),
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
                  color: Color(0xFFB87BA8),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // 로그인도 안 되어 있고, 게스트도 아닌 경우 → 로그인 화면
    if (!authProvider.canAccessHome) {
      _notificationInitialized = false;
      _notificationService.stopListening();
      return const LoginScreen();
    }

    // 게스트 모드인 경우 → 홈 화면 (알림 초기화 없음)
    if (authProvider.isGuest) {
      return const HomeScreen();
    }

    // 로그인된 사용자
    // 알림 및 구독 초기화 (한 번만)
    if (!_notificationInitialized) {
      _notificationInitialized = true;
      _notificationService.initialize();

      // 구독 프로바이더 초기화
      final subscriptionProvider = Provider.of<SubscriptionProvider>(context, listen: false);
      subscriptionProvider.initialize(authProvider.currentUser!.userId);

      // Windows 관리자: Firestore 리스너 시작
      if (Platform.isWindows && authProvider.isAdmin) {
        _notificationService.startListeningForNewMessages();
      }
    }

    // 관리자는 관리자 화면, 일반 사용자는 홈 화면
    if (authProvider.isAdmin) {
      return const AdminConversationsScreen();
    } else {
      return const HomeScreen();
    }
  }
}
