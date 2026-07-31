import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

export const PROMOTION_HOME_LIMIT = 10;
export const PROMOTION_ADMIN_PAGE_SIZE = 10;

export function mapPromotionDoc(docSnapshot) {
  return {
    id: docSnapshot.id,
    ...docSnapshot.data(),
  };
}

export async function getPublishedPromotions() {
  const snapshot = await getDocs(query(
    collection(db, 'promotions'),
    where('isPublished', '==', true),
    orderBy('sortOrder'),
    orderBy('createdAt', 'desc'),
    limit(PROMOTION_HOME_LIMIT)
  ));

  return snapshot.docs.map(mapPromotionDoc);
}

export async function getPromotion(promotionId) {
  const snapshot = await getDoc(doc(db, 'promotions', promotionId));

  if (!snapshot.exists()) {
    return null;
  }

  return mapPromotionDoc(snapshot);
}
