const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const {
  buildRecipientTokenEntries,
  dedupeTokenEntries,
  isInvalidRegistrationTokenError,
} = require("./notificationRecipients");

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

/**
 * 알림 카테고리
 * - chat: 상담 알림 (채팅 메시지)
 * - content: 콘텐츠 알림 (뉴스/공지/백과/영상)
 * - subscription: 구독 알림 (결제 완료, 만료 임박, 만료)
 */

/**
 * 카테고리별 알림 활성 여부 확인
 * - notificationsEnabled: 마스터 스위치 (기본 true)
 * - notification<Category>: 카테고리별 스위치 (기본 true)
 */
function isNotificationEnabled(userData, category) {
  if (userData.notificationsEnabled === false) return false;
  const categoryKey = `notification${category.charAt(0).toUpperCase() + category.slice(1)}`;
  return userData[categoryKey] !== false;
}

async function getRecipientTokenEntriesForUser(userId, userData, userRef) {
  if (!userId) return [];

  const deviceSnapshot = await db.collection("deviceTokens")
    .where("userId", "==", userId)
    .get();

  let allowLegacyToken = true;
  if (deviceSnapshot.empty && userData?.fcmToken) {
    const tokenOwnerSnapshot = await db.collection("deviceTokens")
      .where("fcmToken", "==", userData.fcmToken)
      .limit(1)
      .get();

    allowLegacyToken = tokenOwnerSnapshot.empty ||
      tokenOwnerSnapshot.docs[0].data()?.userId === userId;
  }

  return buildRecipientTokenEntries({
    deviceDocs: deviceSnapshot.docs,
    legacyToken: userData?.fcmToken,
    legacyRef: userRef,
    allowLegacyToken,
  });
}

async function removeInvalidTokenEntry(entry) {
  if (entry.source === "device" && entry.ref) {
    await entry.ref.delete();
    return;
  }

  if (entry.source === "legacy" && entry.ref) {
    const snapshot = await entry.ref.get();
    if (snapshot.exists && snapshot.data()?.fcmToken === entry.token) {
      await entry.ref.update({ fcmToken: FieldValue.delete() });
    }
  }
}

async function sendNotificationToTokenEntries(entries, buildMessage) {
  const recipients = dedupeTokenEntries(entries);
  if (recipients.length === 0) return 0;

  const results = await Promise.allSettled(
    recipients.map((entry) => messaging.send({
      token: entry.token,
      ...buildMessage(entry),
    }))
  );

  const cleanupTasks = [];
  let successCount = 0;
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successCount += 1;
      return;
    }

    const error = result.reason;
    if (isInvalidRegistrationTokenError(error)) {
      cleanupTasks.push(removeInvalidTokenEntry(recipients[index]));
    } else {
      console.error("Error sending notification:", error);
    }
  });

  await Promise.allSettled(cleanupTasks);
  return successCount;
}

function messageBody(message) {
  if (message.text) {
    return message.text.length > 100
      ? message.text.substring(0, 100) + "..."
      : message.text;
  }
  return "새 메시지가 도착했습니다";
}

// ==================== 채팅 메시지 알림 ====================

/**
 * 새 메시지가 생성되면 상대방에게 푸시 알림 전송
 */
exports.sendMessageNotification = onDocumentCreated(
  "conversations/{conversationId}/messages/{messageId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const message = snapshot.data();
    const { conversationId, messageId } = event.params;

    try {
      const convDoc = await db.collection("conversations").doc(conversationId).get();
      if (!convDoc.exists) return;

      const conversation = convDoc.data();
      const userName = conversation.userName || "익명";

      if (message.senderRole === "admin") {
        await sendNotificationToUser(conversation.userId, message, conversationId, messageId);
      } else {
        await sendNotificationToAdmins(userName, message, conversationId, messageId);
      }
    } catch (error) {
      console.error("Error sending message notification:", error);
    }
  }
);

async function sendNotificationToUser(userId, message, conversationId, messageId) {
  if (!userId) return;

  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return;

  const userData = userDoc.data();
  if (!isNotificationEnabled(userData, "chat")) return;

  const entries = await getRecipientTokenEntriesForUser(userId, userData, userRef);
  await sendNotificationToTokenEntries(entries, () => ({
    notification: {
      title: "난임&상담톡",
      body: messageBody(message),
    },
    data: {
      conversationId,
      messageId,
      type: "new_message",
    },
    android: { priority: "high", notification: { channelId: "chat_messages", sound: "default" } },
    apns: { payload: { aps: { badge: 1, sound: "default" } } },
  }));
}

async function sendNotificationToAdmins(userName, message, conversationId, messageId) {
  const adminsSnapshot = await db.collection("users").where("role", "==", "admin").get();
  if (adminsSnapshot.empty) return;

  const entries = [];
  for (const doc of adminsSnapshot.docs) {
    const adminData = doc.data();
    if (isNotificationEnabled(adminData, "chat")) {
      const adminEntries = await getRecipientTokenEntriesForUser(doc.id, adminData, doc.ref);
      entries.push(...adminEntries);
    }
  }

  await sendNotificationToTokenEntries(entries, () => ({
    notification: {
      title: `${userName}님의 새 질문`,
      body: messageBody(message),
    },
    data: { conversationId, messageId, type: "new_question" },
    android: { priority: "high", notification: { channelId: "chat_messages", sound: "default" } },
    apns: { payload: { aps: { badge: 1, sound: "default" } } },
  }));
}

// ==================== 콘텐츠 알림 (뉴스/공지/백과/영상) ====================

/**
 * 전체 유저에게 콘텐츠 알림 전송 (관리자 제외)
 */
async function sendContentNotificationToAllUsers({ title, body, data, channelId }) {
  const usersSnapshot = await db.collection("users").where("role", "!=", "admin").get();
  if (usersSnapshot.empty) return;

  const entries = [];
  for (const doc of usersSnapshot.docs) {
    const userData = doc.data();
    if (isNotificationEnabled(userData, "content")) {
      const userEntries = await getRecipientTokenEntriesForUser(doc.id, userData, doc.ref);
      entries.push(...userEntries);
    }
  }

  const successCount = await sendNotificationToTokenEntries(entries, () => ({
    notification: { title, body },
    data,
    android: { priority: "high", notification: { channelId, sound: "default" } },
    apns: { payload: { aps: { badge: 1, sound: "default" } } },
  }));
  console.log(`Content notification sent: ${successCount}/${dedupeTokenEntries(entries).length}`);
}

function truncate(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

// --- 뉴스 ---
exports.sendNewsNotification = onDocumentCreated("news/{newsId}", async (event) => {
  const news = event.data?.data();
  if (!news || !news.isPublished) return;
  await sendContentNotificationToAllUsers({
    title: "📰 새로운 난임 뉴스",
    body: truncate(news.title, 50),
    data: { newsId: event.params.newsId, type: "new_news" },
    channelId: "content",
  });
});

exports.sendNewsPublishedNotification = onDocumentUpdated("news/{newsId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before.isPublished && after.isPublished) {
    await sendContentNotificationToAllUsers({
      title: "📰 새로운 난임 뉴스",
      body: truncate(after.title, 50),
      data: { newsId: event.params.newsId, type: "new_news" },
      channelId: "content",
    });
  }
});

// --- 공지사항 ---
exports.sendNoticeNotification = onDocumentCreated("notices/{noticeId}", async (event) => {
  const notice = event.data?.data();
  if (!notice || !notice.isPublished) return;
  await sendContentNotificationToAllUsers({
    title: "📢 새 공지사항",
    body: truncate(notice.title, 50),
    data: { noticeId: event.params.noticeId, type: "new_notice" },
    channelId: "content",
  });
});

exports.sendNoticePublishedNotification = onDocumentUpdated("notices/{noticeId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before.isPublished && after.isPublished) {
    await sendContentNotificationToAllUsers({
      title: "📢 새 공지사항",
      body: truncate(after.title, 50),
      data: { noticeId: event.params.noticeId, type: "new_notice" },
      channelId: "content",
    });
  }
});

// --- 백과 ---
exports.sendEncyclopediaNotification = onDocumentCreated("encyclopedia/{articleId}", async (event) => {
  const article = event.data?.data();
  if (!article || !article.isPublished) return;
  await sendContentNotificationToAllUsers({
    title: "📚 새 난임백과",
    body: truncate(article.title, 50),
    data: { articleId: event.params.articleId, type: "new_encyclopedia" },
    channelId: "content",
  });
});

exports.sendEncyclopediaPublishedNotification = onDocumentUpdated("encyclopedia/{articleId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before.isPublished && after.isPublished) {
    await sendContentNotificationToAllUsers({
      title: "📚 새 난임백과",
      body: truncate(after.title, 50),
      data: { articleId: event.params.articleId, type: "new_encyclopedia" },
      channelId: "content",
    });
  }
});

// --- 영상 ---
exports.sendVideoNotification = onDocumentCreated("videos/{videoId}", async (event) => {
  const video = event.data?.data();
  if (!video || !video.isPublished) return;
  await sendContentNotificationToAllUsers({
    title: "🎥 새 아기성공TV 영상",
    body: truncate(video.title, 50),
    data: { videoId: event.params.videoId, type: "new_video" },
    channelId: "content",
  });
});

exports.sendVideoPublishedNotification = onDocumentUpdated("videos/{videoId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before.isPublished && after.isPublished) {
    await sendContentNotificationToAllUsers({
      title: "🎥 새 아기성공TV 영상",
      body: truncate(after.title, 50),
      data: { videoId: event.params.videoId, type: "new_video" },
      channelId: "content",
    });
  }
});

// ==================== 구독 알림 ====================

/**
 * 특정 유저에게 구독 알림 전송
 */
async function sendSubscriptionNotificationToUser(userId, { title, body, data }) {
  if (!userId) return;
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return;

  const userData = userDoc.data();
  if (!isNotificationEnabled(userData, "subscription")) return;

  const entries = await getRecipientTokenEntriesForUser(userId, userData, userRef);
  await sendNotificationToTokenEntries(entries, () => ({
    notification: { title, body },
    data,
    android: { priority: "high", notification: { channelId: "subscription", sound: "default" } },
    apns: { payload: { aps: { badge: 1, sound: "default" } } },
  }));
}

// --- 구독 결제 완료 (구독 문서 생성 시) ---
exports.sendSubscriptionPurchasedNotification = onDocumentCreated(
  "subscriptions/{subscriptionId}",
  async (event) => {
    const sub = event.data?.data();
    if (!sub || sub.status !== "active") return;

    const endDate = sub.endDate?.toDate();
    const endDateStr = endDate ? `${endDate.getFullYear()}.${endDate.getMonth() + 1}.${endDate.getDate()}` : "";

    await sendSubscriptionNotificationToUser(sub.userId, {
      title: "✅ 구독이 시작되었습니다",
      body: `이용 기간: ~${endDateStr}`,
      data: { type: "subscription_purchased" },
    });
  }
);

// --- 구독 만료 임박 (매일 체크, 3일 전) ---
exports.checkSubscriptionExpiringSoon = onSchedule(
  { schedule: "every day 09:00", timeZone: "Asia/Seoul" },
  async () => {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(threeDaysLater.getFullYear(), threeDaysLater.getMonth(), threeDaysLater.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const snapshot = await db.collection("subscriptions")
      .where("status", "==", "active")
      .where("endDate", ">=", Timestamp.fromDate(startOfDay))
      .where("endDate", "<", Timestamp.fromDate(endOfDay))
      .get();

    console.log(`Expiring soon: ${snapshot.size}`);

    for (const doc of snapshot.docs) {
      const sub = doc.data();
      await sendSubscriptionNotificationToUser(sub.userId, {
        title: "⏰ 구독 만료 임박",
        body: "3일 후 구독이 만료됩니다. 계속 이용하려면 연장해주세요.",
        data: { type: "subscription_expiring" },
      });
    }
  }
);

// --- 구독 만료 (매일 체크) ---
exports.checkSubscriptionExpired = onSchedule(
  { schedule: "every day 09:10", timeZone: "Asia/Seoul" },
  async () => {
    const now = Timestamp.now();
    const snapshot = await db.collection("subscriptions")
      .where("status", "==", "active")
      .where("endDate", "<", now)
      .get();

    console.log(`Expired: ${snapshot.size}`);

    for (const doc of snapshot.docs) {
      const sub = doc.data();

      // 상태 업데이트
      await doc.ref.update({ status: "expired", updatedAt: now });
      await db.collection("users").doc(sub.userId).update({
        subscriptionStatus: "expired",
      });

      // 알림 전송
      await sendSubscriptionNotificationToUser(sub.userId, {
        title: "🔔 구독이 만료되었습니다",
        body: "계속 이용하려면 구독을 갱신해주세요.",
        data: { type: "subscription_expired" },
      });
    }
  }
);
