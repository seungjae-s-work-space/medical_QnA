import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import 'auth_session_waiter.dart';

abstract class AuthClient {
  Stream<String?> get authUserIdChanges;
  String? get currentUserId;
  String get currentEmail;
  bool get requiresEmailVerification;

  Future<UserModel?> signUp({
    required String email,
    required String password,
    required String name,
    String role = 'user',
  });

  Future<UserModel?> signIn({
    required String email,
    required String password,
  });

  Future<void> signOut();
  Future<UserModel?> getUserData(String userId);
  Future<void> updateUserData(UserModel user);
  Future<void> updateFcmToken(String userId, String token);
  Future<void> sendPasswordResetEmail(String email);
  Future<void> sendEmailVerification();
  Future<bool> reloadAndCheckEmailVerified();
  Future<UserModel?> signInWithNickname(String nickname);
  Future<UserModel?> getLocalUser();
  Future<UserModel?> restoreCurrentUser({
    required Duration timeout,
    required Duration retryDelay,
  });
  Future<void> deleteAccount(String userId);
}

class AuthService implements AuthClient {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  static const String _cachedUserIdKey = 'cachedUserId';
  static const String _cachedUserRoleKey = 'cachedUserRole';
  static const String _cachedUserNameKey = 'cachedUserName';
  static const String _cachedUserEmailKey = 'cachedUserEmail';
  static const String _cachedUserCreatedAtMillisKey =
      'cachedUserCreatedAtMillis';

  // 현재 사용자 스트림
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  @override
  Stream<String?> get authUserIdChanges =>
      authStateChanges.map((user) => user?.uid);

  // 현재 사용자
  User? get currentUser => _auth.currentUser;

  @override
  String? get currentUserId => currentUser?.uid;

  @override
  String get currentEmail => currentUser?.email ?? '';

  @override
  bool get requiresEmailVerification {
    final user = currentUser;
    if (user == null) return false;

    final hasEmail = (user.email ?? '').isNotEmpty;
    final usesPasswordProvider = user.providerData.any(
      (provider) => provider.providerId == 'password',
    );

    return hasEmail && usesPasswordProvider && !user.emailVerified;
  }

  Future<void> _setKoreanEmailLanguage() async {
    await _auth.setLanguageCode('ko');
  }

  Future<void> _cacheUser(UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('userId', user.userId);
    await prefs.setString(_cachedUserIdKey, user.userId);
    await prefs.setString(_cachedUserRoleKey, user.role);
    await prefs.setString(_cachedUserNameKey, user.name);
    await prefs.setString(_cachedUserEmailKey, user.email);
    await prefs.setInt(
      _cachedUserCreatedAtMillisKey,
      user.createdAt.millisecondsSinceEpoch,
    );

    if (user.email.isEmpty && user.name.isNotEmpty) {
      await prefs.setString('nickname', user.name);
    }
  }

  Future<void> _clearCachedUser() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('userId');
    await prefs.remove('nickname');
    await prefs.remove(_cachedUserIdKey);
    await prefs.remove(_cachedUserRoleKey);
    await prefs.remove(_cachedUserNameKey);
    await prefs.remove(_cachedUserEmailKey);
    await prefs.remove(_cachedUserCreatedAtMillisKey);
  }

  Future<UserModel?> _getCachedUser(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    final cachedUserId =
        prefs.getString(_cachedUserIdKey) ?? prefs.getString('userId');
    if (cachedUserId != userId) return null;

    final name =
        prefs.getString(_cachedUserNameKey) ?? prefs.getString('nickname');
    final email = prefs.getString(_cachedUserEmailKey) ?? '';
    if ((name == null || name.isEmpty) && email.isEmpty) return null;

    final createdAtMillis = prefs.getInt(_cachedUserCreatedAtMillisKey);
    return UserModel(
      userId: userId,
      role: prefs.getString(_cachedUserRoleKey) ?? 'user',
      name: name?.isNotEmpty == true ? name! : email,
      email: email,
      createdAt: createdAtMillis != null
          ? DateTime.fromMillisecondsSinceEpoch(createdAtMillis)
          : DateTime.now(),
    );
  }

  Future<UserModel> _buildFallbackUser(User user) async {
    final prefs = await SharedPreferences.getInstance();
    final nickname = prefs.getString('nickname');
    final email = user.email ?? '';
    final name = user.displayName?.isNotEmpty == true
        ? user.displayName!
        : nickname?.isNotEmpty == true
            ? nickname!
            : email.isNotEmpty
                ? email
                : '사용자';

    return UserModel(
      userId: user.uid,
      role: 'user',
      name: name,
      email: email,
      createdAt: DateTime.now(),
    );
  }

  Future<User?> _waitForFirebaseUser({
    required Duration timeout,
    required Duration retryDelay,
  }) async {
    return AuthSessionWaiter<User>(
      currentUser: () => currentUser,
      authStateChanges: authStateChanges,
      onError: (Object error, StackTrace stackTrace) {
        debugPrint('인증 상태 이벤트 대기 오류: $error');
      },
    ).wait(
      timeout: timeout,
      retryDelay: retryDelay,
    );
  }

  // 회원가입
  @override
  Future<UserModel?> signUp({
    required String email,
    required String password,
    required String name,
    String role = 'user',
  }) async {
    try {
      // Firebase Auth 회원가입
      UserCredential result = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      User? user = result.user;
      if (user == null) return null;

      // 프로필 업데이트
      await user.updateDisplayName(name);

      // Firestore에 사용자 정보 저장
      UserModel userModel = UserModel(
        userId: user.uid,
        role: role,
        name: name,
        email: email,
        createdAt: DateTime.now(),
      );

      await _db.collection('users').doc(user.uid).set(userModel.toMap());
      await _setKoreanEmailLanguage();
      await user.sendEmailVerification();
      await _cacheUser(userModel);

      return userModel;
    } catch (e) {
      debugPrint('회원가입 오류: $e');
      rethrow;
    }
  }

  // 로그인
  @override
  Future<UserModel?> signIn({
    required String email,
    required String password,
  }) async {
    try {
      UserCredential result = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      User? user = result.user;
      if (user == null) return null;

      // Firestore에서 사용자 정보 가져오기
      DocumentSnapshot doc = await _db.collection('users').doc(user.uid).get();

      if (!doc.exists) {
        // Firestore에 정보가 없으면 생성
        UserModel userModel = UserModel(
          userId: user.uid,
          role: 'user',
          name: user.displayName ?? '사용자',
          email: user.email ?? email,
          createdAt: DateTime.now(),
        );
        await _db.collection('users').doc(user.uid).set(userModel.toMap());
        await _cacheUser(userModel);
        return userModel;
      }

      final userModel = UserModel.fromFirestore(doc);
      await _cacheUser(userModel);
      return userModel;
    } catch (e) {
      debugPrint('로그인 오류: $e');
      rethrow;
    }
  }

  // 로그아웃
  @override
  Future<void> signOut() async {
    await _auth.signOut();
    await _clearCachedUser();
  }

  // 사용자 정보 가져오기
  @override
  Future<UserModel?> getUserData(String userId) async {
    try {
      DocumentSnapshot doc = await _db.collection('users').doc(userId).get();
      if (!doc.exists) return null;
      final user = UserModel.fromFirestore(doc);
      await _cacheUser(user);
      return user;
    } catch (e) {
      debugPrint('사용자 정보 가져오기 오류: $e');
      return null;
    }
  }

  // 사용자 정보 업데이트
  @override
  Future<void> updateUserData(UserModel user) async {
    await _db.collection('users').doc(user.userId).update(user.toMap());
    await _cacheUser(user);
  }

  // FCM 토큰 업데이트
  @override
  Future<void> updateFcmToken(String userId, String token) async {
    await _db.collection('users').doc(userId).update({'fcmToken': token});
  }

  // 비밀번호 재설정 이메일 전송
  @override
  Future<void> sendPasswordResetEmail(String email) async {
    await _setKoreanEmailLanguage();
    await _auth.sendPasswordResetEmail(email: email);
  }

  @override
  Future<void> sendEmailVerification() async {
    final user = currentUser;
    if (user == null) {
      throw FirebaseAuthException(
        code: 'no-current-user',
        message: '현재 로그인된 사용자가 없습니다.',
      );
    }

    await _setKoreanEmailLanguage();
    await user.sendEmailVerification();
  }

  @override
  Future<bool> reloadAndCheckEmailVerified() async {
    final user = currentUser;
    if (user == null) return false;

    await user.reload();
    return !requiresEmailVerification;
  }

  // 현재 사용자가 관리자인지 확인
  Future<bool> isAdmin() async {
    User? user = currentUser;
    if (user == null) return false;

    UserModel? userData = await getUserData(user.uid);
    return userData?.isAdmin ?? false;
  }

  // 닉네임으로 로그인 (익명 인증 + 닉네임 저장)
  @override
  Future<UserModel?> signInWithNickname(String nickname) async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // 1. Firebase 익명 인증 먼저 (인증이 있어야 Firestore 접근 가능)
      User? user = currentUser;
      if (user == null) {
        UserCredential result = await _auth.signInAnonymously();
        user = result.user;
        if (user == null) throw Exception('인증에 실패했습니다');
      }

      // 2. 이미 Firestore에 사용자 정보가 있는지 확인
      final userDoc = await _db.collection('users').doc(user.uid).get();

      if (userDoc.exists) {
        // 기존 사용자 - 닉네임 업데이트가 필요한 경우
        UserModel existingUser = UserModel.fromFirestore(userDoc);

        if (existingUser.name != nickname) {
          // 닉네임 중복 체크
          final nicknameQuery = await _db
              .collection('users')
              .where('name', isEqualTo: nickname)
              .limit(1)
              .get();

          if (nicknameQuery.docs.isNotEmpty &&
              nicknameQuery.docs.first.id != user.uid) {
            throw Exception('이미 사용 중인 닉네임입니다');
          }

          // 닉네임 업데이트
          await _db
              .collection('users')
              .doc(user.uid)
              .update({'name': nickname});
          await prefs.setString('nickname', nickname);

          existingUser = existingUser.copyWith(name: nickname);
        }

        await _cacheUser(existingUser);
        return existingUser;
      }

      // 3. 새 사용자 - 닉네임 중복 확인 + 저장 (트랜잭션으로 race condition 방지)
      final userModel =
          await _db.runTransaction<UserModel>((transaction) async {
        final nicknameQuery = await _db
            .collection('users')
            .where('name', isEqualTo: nickname)
            .limit(1)
            .get();

        if (nicknameQuery.docs.isNotEmpty) {
          throw Exception('이미 사용 중인 닉네임입니다');
        }

        final model = UserModel(
          userId: user!.uid,
          role: 'user',
          name: nickname,
          email: '',
          createdAt: DateTime.now(),
        );

        transaction.set(_db.collection('users').doc(user.uid), model.toMap());
        return model;
      });

      // 5. 로컬에 정보 저장
      await _cacheUser(userModel);

      return userModel;
    } catch (e) {
      debugPrint('닉네임 로그인 오류: $e');
      rethrow;
    }
  }

  // 로컬 저장소에서 사용자 정보 가져오기
  @override
  Future<UserModel?> getLocalUser() async {
    return restoreCurrentUser(
      timeout: Duration.zero,
      retryDelay: Duration.zero,
    );
  }

  @override
  Future<UserModel?> restoreCurrentUser({
    required Duration timeout,
    required Duration retryDelay,
  }) async {
    try {
      final user = await _waitForFirebaseUser(
        timeout: timeout,
        retryDelay: retryDelay,
      );
      if (user == null) return null;

      try {
        await user.reload();
      } catch (e) {
        debugPrint('저장된 인증 세션 새로고침 실패: $e');
      }

      final activeUser = currentUser ?? user;
      final firestoreUser = await getUserData(activeUser.uid);
      if (firestoreUser != null) return firestoreUser;

      final cachedUser = await _getCachedUser(activeUser.uid);
      if (cachedUser != null) return cachedUser;

      final fallbackUser = await _buildFallbackUser(activeUser);
      await _cacheUser(fallbackUser);
      return fallbackUser;
    } catch (e) {
      debugPrint('자동 로그인 사용자 복원 오류: $e');
      return null;
    }
  }

  // 로그아웃 시 로컬 저장소도 초기화
  Future<void> signOutWithNickname() async {
    await _auth.signOut();
    await _clearCachedUser();
  }

  // 회원 탈퇴 - 사용자 데이터 및 계정 삭제
  @override
  Future<void> deleteAccount(String userId) async {
    try {
      final batch = _db.batch();

      // 1. 사용자의 대화 내역 삭제
      final conversationsQuery = await _db
          .collection('conversations')
          .where('userId', isEqualTo: userId)
          .get();

      for (final doc in conversationsQuery.docs) {
        // 대화 내 메시지들 삭제
        final messagesQuery = await _db
            .collection('conversations')
            .doc(doc.id)
            .collection('messages')
            .get();

        for (final msgDoc in messagesQuery.docs) {
          batch.delete(msgDoc.reference);
        }

        // 대화 삭제
        batch.delete(doc.reference);
      }

      // 2. 구독 정보 삭제
      final subscriptionsQuery = await _db
          .collection('subscriptions')
          .where('userId', isEqualTo: userId)
          .get();

      for (final doc in subscriptionsQuery.docs) {
        batch.delete(doc.reference);
      }

      // 3. 사용자 문서 삭제
      batch.delete(_db.collection('users').doc(userId));

      // 배치 실행
      await batch.commit();

      // 4. 로컬 저장소 초기화
      await _clearCachedUser();

      // 5. Firebase Auth 계정 삭제
      final user = _auth.currentUser;
      if (user != null) {
        await user.delete();
      }
    } catch (e) {
      debugPrint('회원 탈퇴 오류: $e');
      rethrow;
    }
  }
}
