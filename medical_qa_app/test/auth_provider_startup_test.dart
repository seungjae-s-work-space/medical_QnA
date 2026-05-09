import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/models/user_model.dart';
import 'package:medical_qa_app/providers/auth_provider.dart';
import 'package:medical_qa_app/services/auth_service.dart';

void main() {
  test('restores the current user before leaving startup', () async {
    final user = UserModel(
      userId: 'user-1',
      role: 'user',
      name: '테스트 사용자',
      email: '',
      createdAt: DateTime(2026),
    );
    final authClient = _FakeAuthClient(restoredUser: user);
    final authProvider = AuthProvider(authClient: authClient);

    await _flushMicrotasks();

    expect(authClient.restoreCalls, 1);
    expect(authProvider.isInitialized, isTrue);
    expect(authProvider.currentUser?.userId, 'user-1');
    expect(authProvider.canAccessHome, isTrue);
  });

  test('falls back to login only after startup restore finds no user',
      () async {
    final authClient = _FakeAuthClient();
    final authProvider = AuthProvider(authClient: authClient);

    expect(authProvider.isInitialized, isFalse);
    expect(authProvider.canAccessHome, isFalse);

    await _flushMicrotasks();

    expect(authProvider.isInitialized, isTrue);
    expect(authProvider.canAccessHome, isFalse);
  });

  test('recovers a user that appears after the startup restore pass', () async {
    final user = UserModel(
      userId: 'user-1',
      role: 'user',
      name: '테스트 사용자',
      email: '',
      createdAt: DateTime(2026),
    );
    final lateRestoreCompleter = Completer<UserModel?>();
    final authClient = _FakeAuthClient(
      restoreResults: [
        null,
        lateRestoreCompleter.future,
      ],
    );
    final authProvider = AuthProvider(
      authClient: authClient,
      postStartupRestoreTimeout: const Duration(seconds: 1),
    );

    await _flushMicrotasks();

    expect(authProvider.isInitialized, isTrue);
    expect(authProvider.currentUser, isNull);

    authClient.currentAuthUserId = 'user-1';
    lateRestoreCompleter.complete(user);
    await _flushMicrotasks();

    expect(authClient.restoreCalls, 2);
    expect(authProvider.currentUser?.userId, 'user-1');
    expect(authProvider.canAccessHome, isTrue);
  });

  test('waits for startup restore before marking auth initialized', () async {
    final user = UserModel(
      userId: 'user-1',
      role: 'user',
      name: '테스트 사용자',
      email: '',
      createdAt: DateTime(2026),
    );
    final restoreCompleter = Completer<UserModel?>();
    final authClient = _FakeAuthClient(
      restoredUser: user,
      restoreCompleter: restoreCompleter,
    );
    final authProvider = AuthProvider(authClient: authClient);

    await Future<void>.delayed(Duration.zero);

    expect(authProvider.isInitialized, isFalse);
    expect(authProvider.canAccessHome, isFalse);

    restoreCompleter.complete(user);
    await _flushMicrotasks();

    expect(authProvider.isInitialized, isTrue);
    expect(authProvider.currentUser?.userId, 'user-1');
    expect(authProvider.canAccessHome, isTrue);
  });

  test('does not lose a restored user when verification reload fails',
      () async {
    final user = UserModel(
      userId: 'user-1',
      role: 'user',
      name: '테스트 사용자',
      email: '',
      createdAt: DateTime(2026),
    );
    final authClient = _FakeAuthClient(restoredUser: user);
    final authProvider = AuthProvider(authClient: authClient);

    await _flushMicrotasks();

    expect(authProvider.isInitialized, isTrue);
    expect(authProvider.currentUser?.userId, 'user-1');
    expect(authProvider.canAccessHome, isTrue);
  });

  test('keeps the current user when a stale null auth event arrives', () async {
    final user = UserModel(
      userId: 'user-1',
      role: 'user',
      name: '테스트 사용자',
      email: '',
      createdAt: DateTime(2026),
    );
    final authClient = _FakeAuthClient(restoredUser: user);
    final authProvider = AuthProvider(authClient: authClient);

    await _flushMicrotasks();
    authClient.emitAuthUserId(null);
    await _flushMicrotasks();

    expect(authProvider.isInitialized, isTrue);
    expect(authProvider.currentUser?.userId, 'user-1');
    expect(authProvider.canAccessHome, isTrue);
  });

  test('recovers the current user when a transient null auth event arrives',
      () async {
    final user = UserModel(
      userId: 'user-1',
      role: 'user',
      name: '테스트 사용자',
      email: '',
      createdAt: DateTime(2026),
    );
    final authClient = _FakeAuthClient(
      restoreResults: [
        user,
        user,
      ],
    );
    final authProvider = AuthProvider(authClient: authClient);

    await _flushMicrotasks();
    expect(authProvider.currentUser?.userId, 'user-1');

    authClient.currentAuthUserId = null;
    authClient.emitAuthUserId(null);
    await _flushMicrotasks();

    expect(authClient.restoreCalls, 2);
    expect(authProvider.isInitialized, isTrue);
    expect(authProvider.currentUser?.userId, 'user-1');
    expect(authProvider.canAccessHome, isTrue);
  });

  test('clears the current user after a post-startup sign out event', () async {
    final user = UserModel(
      userId: 'user-1',
      role: 'user',
      name: '테스트 사용자',
      email: '',
      createdAt: DateTime(2026),
    );
    final authClient = _FakeAuthClient(
      restoreResults: [
        user,
        null,
      ],
    );
    final authProvider = AuthProvider(authClient: authClient);

    await _flushMicrotasks();
    authClient.currentAuthUserId = null;
    authClient.emitAuthUserId(null);
    await _flushMicrotasks();

    expect(authProvider.isInitialized, isTrue);
    expect(authProvider.currentUser, isNull);
    expect(authProvider.canAccessHome, isFalse);
  });
}

Future<void> _flushMicrotasks() async {
  await Future<void>.delayed(Duration.zero);
  await Future<void>.delayed(Duration.zero);
}

class _FakeAuthClient implements AuthClient {
  _FakeAuthClient({
    Map<String, UserModel>? users,
    this.restoredUser,
    this.restoreCompleter,
    List<FutureOr<UserModel?>>? restoreResults,
  })  : _users = users ?? {},
        _restoreResults = restoreResults ?? [];

  final Map<String, UserModel> _users;
  final UserModel? restoredUser;
  final Completer<UserModel?>? restoreCompleter;
  final List<FutureOr<UserModel?>> _restoreResults;
  int restoreCalls = 0;
  final StreamController<String?> _authStateController =
      StreamController<String?>.broadcast();

  @override
  Stream<String?> get authUserIdChanges => _authStateController.stream;

  @override
  String? get currentUserId => currentAuthUserId;
  late String? currentAuthUserId = restoredUser?.userId;

  @override
  bool get requiresEmailVerification => false;

  @override
  String get currentEmail => '';

  void emitAuthUserId(String? userId) {
    _authStateController.add(userId);
  }

  @override
  Future<UserModel?> getUserData(String userId) async => _users[userId];

  @override
  Future<UserModel?> restoreCurrentUser({
    required Duration timeout,
    required Duration retryDelay,
  }) async {
    restoreCalls += 1;
    if (_restoreResults.length >= restoreCalls) {
      return _restoreResults[restoreCalls - 1];
    }
    if (restoreCompleter != null && !restoreCompleter!.isCompleted) {
      return restoreCompleter!.future;
    }
    return restoredUser;
  }

  @override
  Future<bool> reloadAndCheckEmailVerified() async => true;

  @override
  Future<UserModel?> getLocalUser() async => restoredUser;

  @override
  Future<UserModel?> signIn({
    required String email,
    required String password,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<UserModel?> signUp({
    required String email,
    required String password,
    required String name,
    String role = 'user',
  }) {
    throw UnimplementedError();
  }

  @override
  Future<UserModel?> signInWithNickname(String nickname) {
    throw UnimplementedError();
  }

  @override
  Future<void> signOut() async {}

  @override
  Future<void> updateUserData(UserModel user) async {}

  @override
  Future<void> updateFcmToken(String userId, String token) async {}

  @override
  Future<void> sendPasswordResetEmail(String email) async {}

  @override
  Future<void> sendEmailVerification() async {}

  @override
  Future<void> deleteAccount(String userId) async {}
}
