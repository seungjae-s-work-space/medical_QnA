import { httpsCallable } from 'firebase/functions';
import { v4 as uuidv4 } from 'uuid';
import { functions } from '../firebase';

export async function recordWebArticleView(section, articleId) {
  const payload = { section, articleId, eventId: uuidv4(), sentAt: Date.now() };
  const record = httpsCallable(functions, 'recordWebArticleView');
  try {
    return (await record(payload)).data;
  } catch (error) {
    if (!['functions/unavailable', 'functions/deadline-exceeded'].includes(error.code)) throw error;
    // Reuse the event identity if the server committed but its response was lost.
    await new Promise(resolve => setTimeout(resolve, 300));
    return (await record(payload)).data;
  }
}

export async function getWebArticleStatistics(days) {
  return (await httpsCallable(functions, 'getWebArticleStatistics')({ days })).data;
}
