const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

/**
 * 새 메시지가 생성되면 상대방에게 푸시 알림 전송
 * - 관리자 → 사용자: 해당 사용자에게 알림
 * - 사용자 → 관리자: 모든 관리자에게 알림
 */
exports.sendMessageNotification = onDocumentCreated(
  "conversations/{conversationId}/messages/{messageId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }

    const message = snapshot.data();
    const { conversationId } = event.params;

    try {
      // 대화 정보 가져오기
      const convDoc = await db.collection("conversations").doc(conversationId).get();
      if (!convDoc.exists) {
        console.log("Conversation not found");
        return;
      }

      const conversation = convDoc.data();
      const userName = conversation.userName || "익명";

      if (message.senderRole === "admin") {
        // 관리자가 보낸 메시지 → 사용자에게 알림
        await sendNotificationToUser(conversation.userId, message, conversationId, event.params.messageId);
      } else {
        // 사용자가 보낸 메시지 → 모든 관리자에게 알림
        await sendNotificationToAdmins(userName, message, conversationId, event.params.messageId);
      }

    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }
);

/**
 * 사용자에게 알림 전송
 */
async function sendNotificationToUser(userId, message, conversationId, messageId) {
  if (!userId) {
    console.log("No userId in conversation");
    return;
  }

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    console.log("User not found");
    return;
  }

  const userData = userDoc.data();
  const fcmToken = userData.fcmToken;

  // 알림 설정 확인 (기본값 true)
  const notificationsEnabled = userData.notificationsEnabled !== false;
  if (!notificationsEnabled) {
    console.log("User has notifications disabled");
    return;
  }

  if (!fcmToken) {
    console.log("No FCM token for user");
    return;
  }

  const notification = {
    token: fcmToken,
    notification: {
      title: "난임&상담톡",
      body: message.text.length > 100
        ? message.text.substring(0, 100) + "..."
        : message.text,
    },
    data: {
      conversationId: conversationId,
      messageId: messageId,
      type: "new_message",
    },
    android: {
      priority: "high",
      notification: {
        channelId: "chat_messages",
        sound: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: "default",
        },
      },
    },
  };

  const response = await messaging.send(notification);
  console.log("Successfully sent notification to user:", response);
}

/**
 * 모든 관리자에게 알림 전송
 */
async function sendNotificationToAdmins(userName, message, conversationId, messageId) {
  // role이 'admin'인 모든 사용자 조회
  const adminsSnapshot = await db.collection("users")
    .where("role", "==", "admin")
    .get();

  if (adminsSnapshot.empty) {
    console.log("No admins found");
    return;
  }

  const tokens = [];
  adminsSnapshot.forEach((doc) => {
    const adminData = doc.data();
    // 알림 설정 확인 (기본값 true)
    const notificationsEnabled = adminData.notificationsEnabled !== false;
    if (adminData.fcmToken && notificationsEnabled) {
      tokens.push(adminData.fcmToken);
    }
  });

  if (tokens.length === 0) {
    console.log("No admin FCM tokens found (or all disabled)");
    return;
  }

  // 각 관리자에게 알림 전송
  const notifications = tokens.map((token) => ({
    token: token,
    notification: {
      title: `${userName}님의 새 질문`,
      body: message.text.length > 100
        ? message.text.substring(0, 100) + "..."
        : message.text,
    },
    data: {
      conversationId: conversationId,
      messageId: messageId,
      type: "new_question",
    },
    android: {
      priority: "high",
      notification: {
        channelId: "chat_messages",
        sound: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: "default",
        },
      },
    },
  }));

  // 병렬로 모든 알림 전송
  const results = await Promise.allSettled(
    notifications.map((n) => messaging.send(n))
  );

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  console.log(`Successfully sent notifications to ${successCount}/${tokens.length} admins`);
}

/**
 * 새 뉴스가 공개되면 모든 사용자에게 푸시 알림 전송
 * - 새 뉴스 생성 시 isPublished가 true인 경우
 * - 기존 뉴스가 비공개→공개로 변경된 경우
 */
exports.sendNewsNotification = onDocumentCreated(
  "news/{newsId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }

    const news = snapshot.data();

    // 비공개 글은 알림 안 보냄
    if (!news.isPublished) {
      console.log("News is not published, skipping notification");
      return;
    }

    await sendNewsNotificationToAllUsers(news, event.params.newsId);
  }
);

/**
 * 뉴스가 비공개→공개로 변경되면 알림 전송
 */
exports.sendNewsPublishedNotification = onDocumentUpdated(
  "news/{newsId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // 비공개 → 공개로 변경된 경우에만 알림
    if (!before.isPublished && after.isPublished) {
      console.log("News published, sending notification");
      await sendNewsNotificationToAllUsers(after, event.params.newsId);
    }
  }
);

/**
 * 모든 사용자에게 뉴스 알림 전송 (관리자 제외)
 */
async function sendNewsNotificationToAllUsers(news, newsId) {
  // role이 'admin'이 아닌 모든 사용자 조회
  const usersSnapshot = await db.collection("users")
    .where("role", "!=", "admin")
    .get();

  if (usersSnapshot.empty) {
    console.log("No users found");
    return;
  }

  const tokens = [];
  usersSnapshot.forEach((doc) => {
    const userData = doc.data();
    // 알림 설정 확인 (기본값 true)
    const notificationsEnabled = userData.notificationsEnabled !== false;
    if (userData.fcmToken && notificationsEnabled) {
      tokens.push(userData.fcmToken);
    }
  });

  if (tokens.length === 0) {
    console.log("No user FCM tokens found (or all disabled)");
    return;
  }

  // 뉴스 제목 줄이기
  const title = news.title.length > 50
    ? news.title.substring(0, 50) + "..."
    : news.title;

  // 각 사용자에게 알림 전송
  const notifications = tokens.map((token) => ({
    token: token,
    notification: {
      title: "📰 새로운 난임&뉴스",
      body: title,
    },
    data: {
      newsId: newsId,
      type: "new_news",
    },
    android: {
      priority: "high",
      notification: {
        channelId: "news",
        sound: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: "default",
        },
      },
    },
  }));

  // 병렬로 모든 알림 전송
  const results = await Promise.allSettled(
    notifications.map((n) => messaging.send(n))
  );

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  console.log(`Successfully sent news notifications to ${successCount}/${tokens.length} users`);
}
