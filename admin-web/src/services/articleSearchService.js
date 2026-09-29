import { httpsCallable } from 'firebase/functions';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db, functions } from '../firebase';

export async function searchArticles(params) {
  const result = await httpsCallable(functions, 'searchArticles')(params);
  return result.data;
}

export async function readSearchArticle(section, id, includeDrafts = false) {
  if (!['news', 'encyclopedia', 'male_infertility', 'videos'].includes(section)) {
    throw new Error('올바르지 않은 게시판입니다.');
  }
  const snapshot = await getDocFromServer(doc(db, section, id));
  if (!snapshot.exists() || (!includeDrafts && snapshot.data().isPublished !== true)) {
    throw new Error('삭제되었거나 비공개로 변경된 글입니다.');
  }
  return { ...snapshot.data(), id: snapshot.id };
}
