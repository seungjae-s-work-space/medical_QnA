import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // 현재 사용자 스트림
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // 현재 사용자
  User? get currentUser => _auth.currentUser;

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

  // 회원가입
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

      return userModel;
    } catch (e) {
      debugPrint('회원가입 오류: $e');
      rethrow;
    }
  }

  // 로그인
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
        return userModel;
      }

      return UserModel.fromFirestore(doc);
    } catch (e) {
      debugPrint('로그인 오류: $e');
      rethrow;
    }
  }

  // 로그아웃
  Future<void> signOut() async {
    await _auth.signOut();
  }

  // 사용자 정보 가져오기
  Future<UserModel?> getUserData(String userId) async {
    try {
      DocumentSnapshot doc = await _db.collection('users').doc(userId).get();
      if (!doc.exists) return null;
      return UserModel.fromFirestore(doc);
    } catch (e) {
      debugPrint('사용자 정보 가져오기 오류: $e');
      return null;
    }
  }

  // 사용자 정보 업데이트
  Future<void> updateUserData(UserModel user) async {
    await _db.collection('users').doc(user.userId).update(user.toMap());
  }

  // FCM 토큰 업데이트
  Future<void> updateFcmToken(String userId, String token) async {
    await _db.collection('users').doc(userId).update({'fcmToken': token});
  }

  // 비밀번호 재설정 이메일 전송
  Future<void> sendPasswordResetEmail(String email) async {
    await _setKoreanEmailLanguage();
    await _auth.sendPasswordResetEmail(email: email);
  }

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

          existingUser = UserModel(
            userId: existingUser.userId,
            role: existingUser.role,
            name: nickname,
            email: existingUser.email,
            createdAt: existingUser.createdAt,
            fcmToken: existingUser.fcmToken,
          );
        }

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
      await prefs.setString('userId', user.uid);
      await prefs.setString('nickname', nickname);

      return userModel;
    } catch (e) {
      debugPrint('닉네임 로그인 오류: $e');
      rethrow;
    }
  }

  // 로컬 저장소에서 사용자 정보 가져오기
  Future<UserModel?> getLocalUser() async {
    try {
      // Firebase Auth는 자동으로 세션을 유지함
      User? user = currentUser;
      if (user == null) return null;

      // Firestore에서 사용자 정보 가져오기
      final doc = await _db.collection('users').doc(user.uid).get();
      if (!doc.exists) {
        // Firestore에 정보가 없으면 로컬 저장소 초기화
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove('userId');
        await prefs.remove('nickname');
        return null;
      }

      return UserModel.fromFirestore(doc);
    } catch (e) {
      debugPrint('로컬 사용자 가져오기 오류: $e');
      return null;
    }
  }

  // 로그아웃 시 로컬 저장소도 초기화
  Future<void> signOutWithNickname() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('userId');
    await prefs.remove('nickname');
    await _auth.signOut();
  }

  // 회원 탈퇴 - 사용자 데이터 및 계정 삭제
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
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('userId');
      await prefs.remove('nickname');

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
