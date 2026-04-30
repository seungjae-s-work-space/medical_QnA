import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  StreamSubscription<User?>? _authSubscription;

  UserModel? _currentUser;
  bool _isLoading = false;
  bool _isInitialized = false;
  String? _errorMessage;
  bool _isGuest = false;
  bool _requiresEmailVerification = false;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isInitialized => _isInitialized;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _currentUser != null;
  bool get isAdmin => _currentUser?.isAdmin ?? false;
  bool get isGuest => _isGuest;
  bool get requiresEmailVerification => _requiresEmailVerification;
  String get verificationEmail =>
      _authService.currentUser?.email ?? _currentUser?.email ?? '';

  /// 로그인된 사용자 또는 게스트 (홈 화면 접근 가능 여부)
  bool get canAccessHome => _currentUser != null || _isGuest;

  AuthProvider() {
    _init();
  }

  void _updateEmailVerificationRequirement() {
    _requiresEmailVerification = !_isGuest &&
        _currentUser != null &&
        !_currentUser!.isAdmin &&
        _authService.requiresEmailVerification;
  }

  // 초기화: Firebase Auth 상태 변화 리스닝 + 로컬 자동 로그인
  void _init() async {
    // 로컬 저장소에서 사용자 정보 확인
    if (_authService.currentUser != null) {
      await _authService.reloadAndCheckEmailVerified();
    }
    _currentUser = await _authService.getLocalUser();
    _updateEmailVerificationRequirement();
    _isInitialized = true;
    notifyListeners();

    // Firebase Auth 상태 변화 리스닝
    _authSubscription =
        _authService.authStateChanges.listen((User? user) async {
      if (user == null) {
        _currentUser = null;
        _requiresEmailVerification = false;
        notifyListeners();
      } else {
        await _authService.reloadAndCheckEmailVerified();
        await _loadUserData(user.uid);
        _updateEmailVerificationRequirement();
        notifyListeners();
      }
    });
  }

  // 사용자 데이터 로드
  Future<void> _loadUserData(String userId) async {
    _currentUser = await _authService.getUserData(userId);
  }

  // 회원가입
  Future<bool> signUp({
    required String email,
    required String password,
    required String name,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _isGuest = false;
      _currentUser = await _authService.signUp(
        email: email,
        password: password,
        name: name,
      );
      _updateEmailVerificationRequirement();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = _getErrorMessage(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // 로그인
  Future<bool> signIn({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _isGuest = false;
      _currentUser = await _authService.signIn(
        email: email,
        password: password,
      );
      _updateEmailVerificationRequirement();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = _getErrorMessage(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // 닉네임으로 로그인
  Future<bool> signInWithNickname(String nickname) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _isGuest = false;
      _currentUser = await _authService.signInWithNickname(nickname);
      _requiresEmailVerification = false;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // 로그아웃
  Future<void> signOut() async {
    await NotificationService().removeToken();
    await _authService.signOut();
    _currentUser = null;
    _isGuest = false;
    _requiresEmailVerification = false;
    notifyListeners();
  }

  // 게스트 모드로 진입
  void enterGuestMode() {
    _isGuest = true;
    _currentUser = null;
    _requiresEmailVerification = false;
    notifyListeners();
  }

  // 게스트 모드 종료 (로그인 화면으로)
  void exitGuestMode() {
    _isGuest = false;
    notifyListeners();
  }

  // 사용자 정보 업데이트
  Future<void> updateProfile(UserModel updatedUser) async {
    await _authService.updateUserData(updatedUser);
    _currentUser = updatedUser;
    notifyListeners();
  }

  // FCM 토큰 업데이트
  Future<void> updateFcmToken(String token) async {
    if (_currentUser == null) return;
    await _authService.updateFcmToken(_currentUser!.userId, token);
  }

  // 비밀번호 재설정
  Future<bool> sendPasswordResetEmail(String email) async {
    try {
      await _authService.sendPasswordResetEmail(email);
      return true;
    } catch (e) {
      _errorMessage = _getErrorMessage(e);
      notifyListeners();
      return false;
    }
  }

  Future<bool> resendVerificationEmail() async {
    try {
      await _authService.sendEmailVerification();
      return true;
    } catch (e) {
      _errorMessage = _getErrorMessage(e);
      notifyListeners();
      return false;
    }
  }

  Future<bool> refreshEmailVerificationStatus() async {
    try {
      final verified = await _authService.reloadAndCheckEmailVerified();
      if (_currentUser != null) {
        await _loadUserData(_currentUser!.userId);
      }
      _updateEmailVerificationRequirement();
      notifyListeners();
      return verified;
    } catch (e) {
      _errorMessage = _getErrorMessage(e);
      notifyListeners();
      return false;
    }
  }

  // 에러 메시지 변환
  String _getErrorMessage(dynamic error) {
    if (error is FirebaseAuthException) {
      switch (error.code) {
        case 'user-not-found':
          return '존재하지 않는 사용자입니다.';
        case 'wrong-password':
          return '비밀번호가 올바르지 않습니다.';
        case 'email-already-in-use':
          return '이미 사용 중인 이메일입니다.';
        case 'invalid-email':
          return '유효하지 않은 이메일 주소입니다.';
        case 'weak-password':
          return '비밀번호가 너무 약합니다. (최소 6자)';
        case 'network-request-failed':
          return '네트워크 연결을 확인해주세요.';
        case 'too-many-requests':
          return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
        case 'invalid-credential':
          return '이메일 또는 비밀번호가 올바르지 않습니다.';
        case 'expired-action-code':
          return '링크가 만료되었습니다. 이메일 인증 또는 비밀번호 재설정을 다시 요청해주세요.';
        case 'invalid-action-code':
          return '유효하지 않거나 이미 사용된 링크입니다. 다시 요청해주세요.';
        case 'no-current-user':
          return '현재 로그인된 사용자가 없습니다.';
        default:
          return '오류가 발생했습니다: ${error.message}';
      }
    }
    return '알 수 없는 오류가 발생했습니다.';
  }

  // 에러 메시지 초기화
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  // 회원 탈퇴
  Future<bool> deleteAccount() async {
    if (_currentUser == null) return false;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _authService.deleteAccount(_currentUser!.userId);
      _currentUser = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = '회원 탈퇴에 실패했습니다. 다시 시도해주세요.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
