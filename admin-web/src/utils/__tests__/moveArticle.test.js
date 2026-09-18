import { doc, GeoPoint, runTransaction, Timestamp } from 'firebase/firestore';
import { moveArticle, moveArticles } from '../moveArticle';

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  doc: jest.fn(),
  runTransaction: jest.fn(),
}));

const db = { name: 'test-only-firestore' };
const articleId = 'original-article-id';
const sourcePath = `news/${articleId}`;
const targetPath = `male_infertility/${articleId}`;
const args = {
  db,
  sourceCollection: 'news',
  targetCollection: 'male_infertility',
  articleId,
};

function transactionStore(entries, { readError, commitError } = {}) {
  const documents = new Map(entries);
  let transaction;

  doc.mockImplementation((database, collection, id) => ({
    database,
    path: `${collection}/${id}`,
  }));
  runTransaction.mockImplementation(async (database, callback) => {
    const writes = [];
    transaction = {
      get: jest.fn(async (reference) => {
        if (writes.length) throw new Error('A transaction read followed a write');
        if (readError) throw readError;
        return {
          exists: () => documents.has(reference.path),
          data: () => documents.get(reference.path),
        };
      }),
      set: jest.fn((reference, data) => writes.push(['set', reference.path, data])),
      delete: jest.fn((reference) => writes.push(['delete', reference.path])),
    };
    const result = await callback(transaction);
    if (commitError) throw commitError;
    writes.forEach(([operation, path, data]) => {
      if (operation === 'set') documents.set(path, data);
      else documents.delete(path);
    });
    return result;
  });

  return { documents, transaction: () => transaction };
}

beforeEach(() => jest.clearAllMocks());

test('moves the full document under its original ID without changing any field', async () => {
  const original = {
    title: '남성난임 원본 제목',
    content: '<p>원본 본문과 <strong>서식</strong></p>',
    createdAt: new Timestamp(1700000000, 123456789),
    updatedAt: new Timestamp(1710000000, 987654321),
    viewCount: 248,
    isPublished: false,
    references: 'Original medical references',
    sourceUrl: 'https://example.org/original-study',
    imageUrl: 'https://example.org/original-image.jpg',
    unrecognizedFutureField: {
      location: new GeoPoint(37.5, 127),
      values: [null, false, 0, 'unchanged'],
    },
  };
  const store = transactionStore([[sourcePath, original]]);

  const result = await moveArticle(args);

  expect(store.documents.has(sourcePath)).toBe(false);
  expect(store.documents.get(targetPath)).toEqual(original);
  expect(store.documents.get(targetPath).createdAt).toBe(original.createdAt);
  expect(store.documents.get(targetPath).updatedAt).toBe(original.updatedAt);
  expect(result).toEqual({
    id: articleId,
    sourceCollection: 'news',
    targetCollection: 'male_infertility',
    data: original,
  });
  expect(runTransaction).toHaveBeenCalledWith(db, expect.any(Function));
  expect(store.transaction().get.mock.calls.map(([ref]) => ref.path)).toEqual([
    sourcePath,
    targetPath,
  ]);
});

test('refuses an existing target without deleting or overwriting either article', async () => {
  const original = { title: 'Original' };
  const existing = { title: 'Different target article' };
  const store = transactionStore([[sourcePath, original], [targetPath, existing]]);

  await expect(moveArticle(args)).rejects.toMatchObject({ code: 'article/target-exists' });

  expect([...store.documents]).toEqual([[sourcePath, original], [targetPath, existing]]);
  expect(store.transaction().set).not.toHaveBeenCalled();
  expect(store.transaction().delete).not.toHaveBeenCalled();
});

test('refuses a missing source without creating a target', async () => {
  const store = transactionStore([]);

  await expect(moveArticle(args)).rejects.toMatchObject({ code: 'article/source-not-found' });

  expect(store.documents.size).toBe(0);
  expect(store.transaction().set).not.toHaveBeenCalled();
  expect(store.transaction().delete).not.toHaveBeenCalled();
});

test.each([
  ['same collection', { targetCollection: 'news' }],
  ['unsupported source', { sourceCollection: 'users' }],
  ['unsupported target', { targetCollection: 'users' }],
  ['nested source path', { sourceCollection: 'news/other' }],
  ['nested target path', { targetCollection: 'male_infertility/other' }],
  ['empty ID', { articleId: '' }],
  ['whitespace ID', { articleId: '  \n ' }],
  ['missing ID', { articleId: undefined }],
  ['non-string ID', { articleId: 123 }],
  ['nested ID path', { articleId: 'article/child' }],
])('rejects %s before accessing Firestore', async (_label, invalid) => {
  transactionStore([[sourcePath, { title: 'Original' }]]);

  await expect(moveArticle({ ...args, ...invalid })).rejects.toMatchObject({
    code: 'article/invalid-move',
  });

  expect(doc).not.toHaveBeenCalled();
  expect(runTransaction).not.toHaveBeenCalled();
});

test.each(['permission-denied', 'unavailable'])('preserves the source if commit fails with %s', async (code) => {
  const original = { title: 'Original', isPublished: true, viewCount: 17 };
  const error = Object.assign(new Error(code), { code });
  const store = transactionStore([[sourcePath, original]], { commitError: error });

  await expect(moveArticle(args)).rejects.toBe(error);

  expect([...store.documents]).toEqual([[sourcePath, original]]);
});

test('preserves the source when Firestore cannot read the documents', async () => {
  const original = { title: 'Original' };
  const error = Object.assign(new Error('Permission denied'), { code: 'permission-denied' });
  const store = transactionStore([[sourcePath, original]], { readError: error });

  await expect(moveArticle(args)).rejects.toBe(error);

  expect([...store.documents]).toEqual([[sourcePath, original]]);
  expect(store.transaction().set).not.toHaveBeenCalled();
  expect(store.transaction().delete).not.toHaveBeenCalled();
});

test.each(['news', 'encyclopedia'])('can move a legacy article from %s to male infertility', async (sourceCollection) => {
  const original = { title: 'Legacy article without optional fields', viewCount: 0 };
  const store = transactionStore([[`${sourceCollection}/${articleId}`, original]]);

  const result = await moveArticle({
    ...args,
    sourceCollection,
  });

  expect([...store.documents]).toEqual([[targetPath, original]]);
  expect(result.sourceCollection).toBe(sourceCollection);
  expect(result.targetCollection).toBe('male_infertility');
  expect(result.data).toEqual(original);
});

describe.each([
  ['single article', (options) => moveArticle({ ...options, articleId })],
  ['multiple articles', (options) => moveArticles({ ...options, articleIds: [articleId] })],
])('%s moves cannot create news or encyclopedia notifications', (_label, move) => {
  test.each([
    ['male_infertility', 'news'],
    ['male_infertility', 'encyclopedia'],
    ['news', 'encyclopedia'],
    ['encyclopedia', 'news'],
  ])('rejects %s → %s before accessing Firestore', async (sourceCollection, targetCollection) => {
    const original = { title: 'Existing public article', isPublished: true };
    const entries = [[`${sourceCollection}/${articleId}`, original]];
    const store = transactionStore(entries);

    await expect(move({ db, sourceCollection, targetCollection })).rejects.toMatchObject({
      code: 'article/invalid-move',
    });

    expect([...store.documents]).toEqual(entries);
    expect(doc).not.toHaveBeenCalled();
    expect(runTransaction).not.toHaveBeenCalled();
  });
});

describe('moving multiple articles', () => {
  const ids = ['first-id', 'middle-id', 'last-id'];
  const originals = ids.map((id, index) => ({
    title: `Original ${id}`,
    content: `<p>Body ${index}</p>`,
    createdAt: new Timestamp(1700000000 + index, 123456789),
    updatedAt: new Timestamp(1710000000 + index, 987654321),
    viewCount: index * 15,
    isPublished: index !== 1,
    references: `Reference ${index}`,
    sourceUrl: `https://example.org/study/${id}`,
    imageUrl: `https://example.org/image/${id}.jpg`,
    unknownField: { nested: [null, new GeoPoint(37.5, 127), false, index] },
  }));
  const entries = ids.map((id, index) => [`news/${id}`, originals[index]]);
  const bulkArgs = { ...args, articleIds: ids };

  test('moves all articles atomically and preserves every original field and ID', async () => {
    const store = transactionStore(entries);

    const result = await moveArticles(bulkArgs);

    expect([...store.documents]).toEqual(ids.map((id, index) => [
      `male_infertility/${id}`, originals[index],
    ]));
    ids.forEach((id, index) => {
      expect(store.documents.get(`male_infertility/${id}`).createdAt).toBe(originals[index].createdAt);
      expect(store.documents.get(`male_infertility/${id}`).updatedAt).toBe(originals[index].updatedAt);
    });
    expect(result).toEqual({
      ids,
      sourceCollection: 'news',
      targetCollection: 'male_infertility',
      articles: ids.map((id, index) => ({ id, data: originals[index] })),
    });
    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(store.transaction().get).toHaveBeenCalledTimes(ids.length * 2);
    expect(store.transaction().get.mock.calls.map(([ref]) => ref.path).sort()).toEqual(
      ids.flatMap((id) => [`news/${id}`, `male_infertility/${id}`]).sort(),
    );
  });

  test('validates every destination before staging any writes when a middle ID collides', async () => {
    const existing = { title: 'Existing destination article' };
    const originalEntries = [...entries, ['male_infertility/middle-id', existing]];
    const store = transactionStore(originalEntries);

    await expect(moveArticles(bulkArgs)).rejects.toMatchObject({ code: 'article/target-exists' });

    expect([...store.documents]).toEqual(originalEntries);
    expect(store.transaction().set).not.toHaveBeenCalled();
    expect(store.transaction().delete).not.toHaveBeenCalled();
  });

  test('validates every source before staging any writes when a middle source is missing', async () => {
    const originalEntries = [entries[0], entries[2]];
    const store = transactionStore(originalEntries);

    await expect(moveArticles(bulkArgs)).rejects.toMatchObject({ code: 'article/source-not-found' });

    expect([...store.documents]).toEqual(originalEntries);
    expect(store.transaction().set).not.toHaveBeenCalled();
    expect(store.transaction().delete).not.toHaveBeenCalled();
  });

  test.each([
    ['missing IDs', undefined],
    ['non-array IDs', 'first-id'],
    ['empty IDs', []],
    ['duplicate IDs', ['first-id', 'middle-id', 'first-id']],
    ['more than 100 IDs', Array.from({ length: 101 }, (_, index) => `id-${index}`)],
    ['empty ID among valid IDs', ['first-id', '']],
    ['whitespace ID among valid IDs', ['first-id', '  ']],
    ['missing ID among valid IDs', ['first-id', undefined]],
    ['non-string ID among valid IDs', ['first-id', 123]],
    ['nested ID path among valid IDs', ['first-id', 'article/child']],
  ])('rejects %s before accessing Firestore', async (_label, articleIds) => {
    transactionStore(entries);

    await expect(moveArticles({ ...bulkArgs, articleIds })).rejects.toMatchObject({
      code: 'article/invalid-move',
    });

    expect(doc).not.toHaveBeenCalled();
    expect(runTransaction).not.toHaveBeenCalled();
  });

  test.each([
    ['same collection', { targetCollection: 'news' }],
    ['unsupported source', { sourceCollection: 'users' }],
    ['unsupported target', { targetCollection: 'users' }],
  ])('rejects %s for a bulk move before accessing Firestore', async (_label, invalid) => {
    transactionStore(entries);

    await expect(moveArticles({ ...bulkArgs, ...invalid })).rejects.toMatchObject({
      code: 'article/invalid-move',
    });

    expect(doc).not.toHaveBeenCalled();
    expect(runTransaction).not.toHaveBeenCalled();
  });

  test.each([1, 100])('accepts a valid batch of %i articles', async (count) => {
    const articleIds = Array.from({ length: count }, (_, index) => `id-${index}`);
    const batchEntries = articleIds.map((id) => [`news/${id}`, { title: id }]);
    const store = transactionStore(batchEntries);

    const result = await moveArticles({ ...bulkArgs, articleIds });

    expect(result.ids).toEqual(articleIds);
    expect([...store.documents.keys()]).toEqual(articleIds.map((id) => `male_infertility/${id}`));
    expect(runTransaction).toHaveBeenCalledTimes(1);
  });

  test.each(['permission-denied', 'unavailable'])('keeps the entire batch unchanged when committing fails with %s', async (code) => {
    const error = Object.assign(new Error(code), { code });
    const store = transactionStore(entries, { commitError: error });

    await expect(moveArticles(bulkArgs)).rejects.toBe(error);

    expect([...store.documents]).toEqual(entries);
    expect(runTransaction).toHaveBeenCalledTimes(1);
  });
});
