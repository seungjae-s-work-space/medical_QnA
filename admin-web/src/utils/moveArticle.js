import { doc, runTransaction } from 'firebase/firestore';

const SOURCE_COLLECTIONS = new Set(['news', 'encyclopedia']);

export async function moveArticles({ db, sourceCollection, targetCollection, articleIds } = {}) {
  const ids = Array.isArray(articleIds) ? [...articleIds] : [];
  if (
    !SOURCE_COLLECTIONS.has(sourceCollection)
    // Creating documents in news or encyclopedia would resend content notifications.
    || targetCollection !== 'male_infertility'
    || ids.length < 1
    || ids.length > 100
    || new Set(ids).size !== ids.length
    || !ids.every((id) => typeof id === 'string' && id.trim() && !id.includes('/'))
  ) {
    throw Object.assign(new Error('뉴스·백과에서 남성난임으로 이동할 글 ID를 확인해 주세요. 중복 없이 1~100개의 글을 이동할 수 있습니다.'), {
      code: 'article/invalid-move',
    });
  }

  const references = ids.map((id) => ({
    source: doc(db, sourceCollection, id),
    target: doc(db, targetCollection, id),
  }));

  return runTransaction(db, async (transaction) => {
    const snapshots = await Promise.all(references.map(async (reference) => ({
      source: await transaction.get(reference.source),
      target: await transaction.get(reference.target),
    })));

    // Validate the entire batch before staging any writes.
    snapshots.forEach(({ source, target }) => {
      if (!source.exists()) {
        throw Object.assign(new Error('원본 글을 찾을 수 없습니다. 목록을 새로고침해 주세요.'), {
          code: 'article/source-not-found',
        });
      }
      if (target.exists()) {
        throw Object.assign(new Error('대상 게시판에 같은 ID의 글이 있습니다. 원본은 이동하지 않았습니다.'), {
          code: 'article/target-exists',
        });
      }
    });

    // Keep the stored data intact, including Firestore types and unknown fields.
    const articles = snapshots.map(({ source }, index) => ({
      id: ids[index],
      data: source.data(),
    }));
    articles.forEach(({ data }, index) => {
      transaction.set(references[index].target, data);
      transaction.delete(references[index].source);
    });

    return { ids, sourceCollection, targetCollection, articles };
  });
}

export async function moveArticle({ db, sourceCollection, targetCollection, articleId } = {}) {
  const { articles } = await moveArticles({
    db,
    sourceCollection,
    targetCollection,
    articleIds: [articleId],
  });
  return { id: articleId, sourceCollection, targetCollection, data: articles[0].data };
}
