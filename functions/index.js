const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const nodemailer = require("nodemailer");

initializeApp();

const db = getFirestore();
const messaging = getMessaging();
let mailTransporter = null;

const IN_APP_PRODUCT_INFO = {
  plan_monthly: { name: "월간 이용권", price: 2900, currency: "KRW" },
  plan_6months: { name: "6개월 이용권", price: 14900, currency: "KRW" },
  plan_12months: { name: "12개월 이용권", price: 19900, currency: "KRW" },
};

function hasMailConfig() {
  return [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM_EMAIL",
  ].every((key) => Boolean(process.env[key]));
}

function getMailTransporter() {
  if (!hasMailConfig()) return null;

  if (!mailTransporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return mailTransporter;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date) {
  if (!(date instanceof Date)) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatPrice(amount, currency = "KRW") {
  if (typeof amount !== "number") return "-";

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPlatformLabel(platform) {
  if (platform === "ios") return "App Store";
  if (platform === "android") return "Google Play";
  return "앱 마켓";
}

function getProductInfo(planId, platformProductId) {
  return IN_APP_PRODUCT_INFO[planId] || {
    name: platformProductId || "인앱상품",
    price: null,
    currency: "KRW",
  };
}

async function sendMail({ to, subject, html, text }) {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.log("SMTP 설정이 없어 메일 발송을 건너뜁니다.");
    return false;
  }

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || "난임상담톡톡"}" <${process.env.SMTP_FROM_EMAIL}>`,
    to,
    replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM_EMAIL,
    subject,
    text,
    html,
  });

  return true;
}

async function sendInAppPaymentEmailToUser(userId, sub) {
  if (!userId) return;

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    console.log(`결제 메일 스킵: users/${userId} 문서 없음`);
    return;
  }

  const userData = userDoc.data();
  if (!userData?.email) {
    console.log(`결제 메일 스킵: users/${userId}에 이메일 없음`);
    return;
  }

  const productInfo = getProductInfo(sub.planId, sub.platformProductId);
  const startDate = sub.startDate?.toDate ? sub.startDate.toDate() : null;
  const endDate = sub.endDate?.toDate ? sub.endDate.toDate() : null;
  const productName = productInfo.name;
  const amountText = productInfo.price != null
    ? formatPrice(productInfo.price, productInfo.currency)
    : "스토어 결제 내역에서 금액을 확인해 주세요.";
  const platformLabel = getPlatformLabel(sub.platform);
  const userName = escapeHtml(userData.name || "회원님");
  const transactionId = escapeHtml(sub.transactionId || "-");
  const productNameHtml = escapeHtml(productName);
  const amountHtml = escapeHtml(amountText);
  const platformHtml = escapeHtml(platformLabel);
  const startDateHtml = escapeHtml(formatDate(startDate));
  const endDateHtml = escapeHtml(formatDate(endDate));
  const appName = process.env.SMTP_FROM_NAME || "난임상담톡톡";
  const subject = `[${appName}] 인앱상품 결제가 완료되었습니다`;

  const text = [
    `${userData.name || "회원"}님, 안녕하세요.`,
    "",
    `${appName} 인앱상품 결제가 완료되었습니다.`,
    "",
    `결제 상품: ${productName}`,
    `결제 금액: ${amountText}`,
    `이용 시작일: ${formatDate(startDate)}`,
    `이용 만료일: ${formatDate(endDate)}`,
    `결제 플랫폼: ${platformLabel}`,
    `거래 번호: ${sub.transactionId || "-"}`,
    "",
    "스토어 영수증은 App Store 또는 Google Play에서 별도로 안내될 수 있습니다.",
    "",
    "감사합니다.",
    appName,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #1f2937;">
      <p>${userName}, 안녕하세요.</p>
      <p><strong>${escapeHtml(appName)}</strong> 인앱상품 결제가 완료되었습니다.</p>
      <div style="margin: 24px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
        <p style="margin: 0 0 8px;"><strong>결제 상품</strong>: ${productNameHtml}</p>
        <p style="margin: 0 0 8px;"><strong>결제 금액</strong>: ${amountHtml}</p>
        <p style="margin: 0 0 8px;"><strong>이용 시작일</strong>: ${startDateHtml}</p>
        <p style="margin: 0 0 8px;"><strong>이용 만료일</strong>: ${endDateHtml}</p>
        <p style="margin: 0 0 8px;"><strong>결제 플랫폼</strong>: ${platformHtml}</p>
        <p style="margin: 0;"><strong>거래 번호</strong>: ${transactionId}</p>
      </div>
      <p>스토어 영수증은 App Store 또는 Google Play에서 별도로 안내될 수 있습니다.</p>
      <p>감사합니다.<br />${escapeHtml(appName)}</p>
    </div>
  `;

  await sendMail({
    to: userData.email,
    subject,
    text,
    html,
  });
}

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

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return;

  const userData = userDoc.data();
  if (!isNotificationEnabled(userData, "chat")) return;
  if (!userData.fcmToken) return;

  const notification = {
    token: userData.fcmToken,
    notification: {
      title: "난임&상담톡",
      body: message.text.length > 100
        ? message.text.substring(0, 100) + "..."
        : message.text,
    },
    data: {
      conversationId,
      messageId,
      type: "new_message",
    },
    android: { priority: "high", notification: { channelId: "chat_messages", sound: "default" } },
    apns: { payload: { aps: { badge: 1, sound: "default" } } },
  };

  await messaging.send(notification);
}

async function sendNotificationToAdmins(userName, message, conversationId, messageId) {
  const adminsSnapshot = await db.collection("users").where("role", "==", "admin").get();
  if (adminsSnapshot.empty) return;

  const tokens = [];
  adminsSnapshot.forEach((doc) => {
    const adminData = doc.data();
    if (isNotificationEnabled(adminData, "chat") && adminData.fcmToken) {
      tokens.push(adminData.fcmToken);
    }
  });

  if (tokens.length === 0) return;

  const notifications = tokens.map((token) => ({
    token,
    notification: {
      title: `${userName}님의 새 질문`,
      body: message.text.length > 100
        ? message.text.substring(0, 100) + "..."
        : message.text,
    },
    data: { conversationId, messageId, type: "new_question" },
    android: { priority: "high", notification: { channelId: "chat_messages", sound: "default" } },
    apns: { payload: { aps: { badge: 1, sound: "default" } } },
  }));

  await Promise.allSettled(notifications.map((n) => messaging.send(n)));
}

// ==================== 콘텐츠 알림 (뉴스/공지/백과/영상) ====================

/**
 * 전체 유저에게 콘텐츠 알림 전송 (관리자 제외)
 */
async function sendContentNotificationToAllUsers({ title, body, data, channelId }) {
  const usersSnapshot = await db.collection("users").where("role", "!=", "admin").get();
  if (usersSnapshot.empty) return;

  const tokens = [];
  usersSnapshot.forEach((doc) => {
    const userData = doc.data();
    if (isNotificationEnabled(userData, "content") && userData.fcmToken) {
      tokens.push(userData.fcmToken);
    }
  });

  if (tokens.length === 0) return;

  const notifications = tokens.map((token) => ({
    token,
    notification: { title, body },
    data,
    android: { priority: "high", notification: { channelId, sound: "default" } },
    apns: { payload: { aps: { badge: 1, sound: "default" } } },
  }));

  const results = await Promise.allSettled(notifications.map((n) => messaging.send(n)));
  const successCount = results.filter((r) => r.status === "fulfilled").length;
  console.log(`Content notification sent: ${successCount}/${tokens.length}`);
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
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return;

  const userData = userDoc.data();
  if (!isNotificationEnabled(userData, "subscription")) return;
  if (!userData.fcmToken) return;

  await messaging.send({
    token: userData.fcmToken,
    notification: { title, body },
    data,
    android: { priority: "high", notification: { channelId: "subscription", sound: "default" } },
    apns: { payload: { aps: { badge: 1, sound: "default" } } },
  });
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

    try {
      await sendInAppPaymentEmailToUser(sub.userId, sub);
      console.log(`인앱상품 결제 메일 처리 완료: ${event.params.subscriptionId}`);
    } catch (error) {
      console.error("인앱상품 결제 메일 발송 실패:", error);
    }
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
