import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

export const DEFAULT_FREE_CONTENT_VIEW_LIMIT = 5;

const parseIntValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return null;
};

export async function consumeFreeContentAccess({ db, userId }) {
  const userRef = doc(db, 'users', userId);

  return runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error('USER_NOT_FOUND');
    }

    const userData = userSnap.data() || {};
    const limit =
      parseIntValue(userData.freeContentViewLimit) ?? DEFAULT_FREE_CONTENT_VIEW_LIMIT;
    const used = parseIntValue(userData.freeContentViewUsed) ?? 0;

    if (used >= limit) {
      return {
        granted: false,
        remainingViews: 0,
        limit,
      };
    }

    const nextUsed = used + 1;
    const remainingViews = Math.max(limit - nextUsed, 0);

    transaction.set(
      userRef,
      {
        freeContentViewLimit: limit,
        freeContentViewUsed: nextUsed,
        freeContentViewUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      granted: true,
      remainingViews,
      limit,
    };
  });
}
