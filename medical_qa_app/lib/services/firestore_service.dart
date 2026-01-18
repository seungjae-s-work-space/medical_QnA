import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/conversation_model.dart';
import '../models/message_model.dart';
import '../models/user_model.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // 대화방 생성 또는 가져오기
  Future<String> getOrCreateConversation(String userId, String userName) async {
    String conversationId = 'user_$userId';

    DocumentSnapshot doc =
        await _db.collection('conversations').doc(conversationId).get();

    if (!doc.exists) {
      // 대화방이 없으면 생성
      await _db.collection('conversations').doc(conversationId).set({
        'conversationId': conversationId,
        'userId': userId,
        'userName': userName,
        'userProfileImage': null,
        'lastMessage': '',
        'lastMessageAt': FieldValue.serverTimestamp(),
        'unreadByAdmin': 0,
        'unreadByUser': 0,
        'createdAt': FieldValue.serverTimestamp(),
      });
    }

    return conversationId;
  }

  // 메시지 전송
  Future<void> sendMessage({
    required String conversationId,
    required String text,
    String? imageUrl,
  }) async {
    User? currentUser = _auth.currentUser;
    if (currentUser == null) throw Exception('로그인이 필요합니다');

    // 현재 사용자 정보 가져오기
    DocumentSnapshot userDoc =
        await _db.collection('users').doc(currentUser.uid).get();
    UserModel user = UserModel.fromFirestore(userDoc);

    // 메시지 추가
    await _db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .add({
      'senderId': currentUser.uid,
      'senderRole': user.role,
      'senderName': user.name,
      'senderProfileImage': user.profileImage,
      'text': text,
      'imageUrl': imageUrl,
      'isRead': false,
      'createdAt': FieldValue.serverTimestamp(),
    });

    // 대화방 정보 업데이트
    String unreadField = user.role == 'admin' ? 'unreadByUser' : 'unreadByAdmin';

    await _db.collection('conversations').doc(conversationId).update({
      'lastMessage': text,
      'lastMessageAt': FieldValue.serverTimestamp(),
      unreadField: FieldValue.increment(1),
    });
  }

  // 메시지 목록 실시간 스트림
  Stream<List<MessageModel>> getMessages(String conversationId) {
    return _db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => MessageModel.fromFirestore(doc)).toList());
  }

  // 관리자: 모든 대화방 목록 실시간 스트림
  Stream<List<ConversationModel>> getAllConversations() {
    return _db
        .collection('conversations')
        .orderBy('lastMessageAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => ConversationModel.fromFirestore(doc))
            .toList());
  }

  // 사용자: 내 대화방 가져오기
  Stream<ConversationModel?> getMyConversation(String userId) {
    String conversationId = 'user_$userId';
    return _db
        .collection('conversations')
        .doc(conversationId)
        .snapshots()
        .map((doc) {
      if (!doc.exists) return null;
      return ConversationModel.fromFirestore(doc);
    });
  }

  // 메시지 읽음 처리
  Future<void> markMessagesAsRead(String conversationId, String userRole) async {
    // 읽지 않은 메시지들을 읽음으로 표시
    QuerySnapshot unreadMessages = await _db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .where('isRead', isEqualTo: false)
        .where('senderRole', isNotEqualTo: userRole) // 상대방이 보낸 메시지만
        .get();

    // 배치 업데이트
    WriteBatch batch = _db.batch();
    for (var doc in unreadMessages.docs) {
      batch.update(doc.reference, {'isRead': true});
    }
    await batch.commit();

    // 대화방의 unread 카운트 초기화
    String unreadField = userRole == 'admin' ? 'unreadByAdmin' : 'unreadByUser';
    Map<String, dynamic> updateData = {unreadField: 0};
    // 관리자가 읽은 경우 hasAdminViewed 플래그 추가
    if (userRole == 'admin') {
      updateData['hasAdminViewed'] = true;
    }
    await _db.collection('conversations').doc(conversationId).update(updateData);
  }

  // 특정 대화방 가져오기
  Future<ConversationModel?> getConversation(String conversationId) async {
    DocumentSnapshot doc =
        await _db.collection('conversations').doc(conversationId).get();
    if (!doc.exists) return null;
    return ConversationModel.fromFirestore(doc);
  }

  // 대화방 삭제 (관리자 전용)
  Future<void> deleteConversation(String conversationId) async {
    // 메시지 먼저 삭제
    QuerySnapshot messages = await _db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .get();

    WriteBatch batch = _db.batch();
    for (var doc in messages.docs) {
      batch.delete(doc.reference);
    }
    await batch.commit();

    // 대화방 삭제
    await _db.collection('conversations').doc(conversationId).delete();
  }

  // 통계: 총 질문 수
  Future<int> getTotalQuestionsCount() async {
    QuerySnapshot snapshot = await _db.collection('conversations').get();
    return snapshot.docs.length;
  }

  // 통계: 읽지 않은 질문 수 (관리자용)
  Future<int> getUnreadQuestionsCount() async {
    QuerySnapshot snapshot = await _db
        .collection('conversations')
        .where('unreadByAdmin', isGreaterThan: 0)
        .get();
    return snapshot.docs.length;
  }

  // 통계: 오늘의 질문 수
  Future<int> getTodayQuestionsCount() async {
    DateTime today = DateTime.now();
    DateTime startOfDay = DateTime(today.year, today.month, today.day);

    QuerySnapshot snapshot = await _db
        .collection('conversations')
        .where('createdAt', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfDay))
        .get();
    return snapshot.docs.length;
  }
}
