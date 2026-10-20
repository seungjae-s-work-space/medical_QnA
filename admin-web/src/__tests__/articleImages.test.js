import { createHash, randomFillSync } from 'crypto';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { prepareArticleImages } from '../services/articleImages';

jest.mock('../firebase', () => ({
  functions: {},
  auth: { currentUser: { uid: 'editor' } },
  storage: { app: { options: { storageBucket: 'our-project.firebasestorage.app' } } },
}));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('firebase/storage', () => ({
  ref: jest.fn((_, path) => ({ fullPath: path })),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

const stored = path => `https://firebasestorage.googleapis.com/v0/b/our-project.firebasestorage.app/o/${encodeURIComponent(path)}?alt=media&token=stored`;
const remote = 'https://images.example.org/a.png?size=2&v=1';
const imported = stored('news_images/imported-first');
const parse = html => new DOMParser().parseFromString(html, 'text/html');
let importImage;
const prepare = options => prepareArticleImages({ section: 'news', content: '<p>본문</p>', ...options });

beforeAll(() => {
  Object.defineProperty(window, 'crypto', {
    configurable: true,
    value: {
      getRandomValues: randomFillSync,
      subtle: { digest: async (_, bytes) => createHash('sha256').update(Buffer.from(bytes)).digest() },
    },
  });
});
beforeEach(() => {
  jest.clearAllMocks();
  importImage = jest.fn().mockResolvedValue({ data: { url: imported, reused: false } });
  httpsCallable.mockReturnValue(importImage);
  ref.mockImplementation((_, path) => ({ fullPath: path }));
  uploadBytes.mockResolvedValue({});
  getDownloadURL.mockImplementation(async reference => stored(reference.fullPath));
});

test('no-image content needs no callable or upload', async () => {
  const result = await prepare();
  expect(result).toEqual({ content: '<p>본문</p>', imageUrl: null });
  expect(httpsCallable).not.toHaveBeenCalled();
  expect(uploadBytes).not.toHaveBeenCalled();
});

test.each(['news', 'encyclopedia', 'male_infertility'])('%s imports a source once and remaps selected thumbnail', async section => {
  const onProgress = jest.fn();
  const result = await prepare({
    section,
    content: `<p>전<img src="https://images.example.org/other.png" alt="첫 사진"></p><p><img src="${remote.replaceAll('&', '&amp;')}" width="400" style="float: right;" alt="그림"></p><p><img src="${remote}#copy"></p>`,
    selectedImageUrl: remote,
    onProgress,
  });
  expect(importImage).toHaveBeenCalledTimes(2);
  expect(importImage).toHaveBeenLastCalledWith({ section, sourceUrl: remote });
  const doc = parse(result.content);
  expect(doc.querySelectorAll('img')[1].getAttribute('src')).toBe(imported);
  expect(doc.querySelectorAll('img')[2].getAttribute('src')).toBe(imported);
  expect(doc.querySelectorAll('img')[1].getAttribute('width')).toBe('400');
  expect(doc.querySelectorAll('img')[1].getAttribute('alt')).toBe('그림');
  expect(doc.querySelectorAll('img')[1].style.float).toBe('right');
  expect(result.imageUrl).toBe(imported);
  expect(onProgress).toHaveBeenLastCalledWith({ completed: 2, total: 2 });
});

test('custom thumbnail wins over selected image and is also imported', async () => {
  const thumbnail = stored('news_images/imported-thumbnail');
  importImage.mockResolvedValueOnce({ data: { url: imported } })
    .mockResolvedValueOnce({ data: { url: thumbnail } });
  const result = await prepare({
    content: `<img src="${remote}">`,
    selectedImageUrl: remote,
    customThumbnail: 'https://example.org/thumb.jpg',
  });
  expect(result.imageUrl).toBe(thumbnail);
  expect(importImage).toHaveBeenLastCalledWith({ section: 'news', sourceUrl: 'https://example.org/thumb.jpg' });
});

test('a removed selected image falls back to first body image', async () => {
  const result = await prepare({ content: `<img src="${remote}">`, selectedImageUrl: 'https://old.example.org/removed.jpg' });
  expect(importImage).toHaveBeenCalledTimes(1);
  expect(result.imageUrl).toBe(imported);
});

test('keeps own-bucket images but imports foreign bucket and lookalike hosts', async () => {
  const own = stored('news_images/old.png');
  const foreign = own.replace('our-project.firebasestorage.app', 'someone-else.appspot.com');
  const lookalike = own.replace('firebasestorage.googleapis.com', 'firebasestorage.googleapis.com.evil.example');
  const result = await prepare({ content: `<img src="${own}"><img src="${foreign}"><img src="${lookalike}">` });
  expect(importImage).toHaveBeenCalledTimes(2);
  expect(parse(result.content).querySelector('img').getAttribute('src')).toBe(own);
  expect(result.imageUrl).toBe(own);
});

test('normalizes protocol-relative URLs and removes alternate external sources', async () => {
  const result = await prepare({
    content: `<picture><source srcset="https://elsewhere.example/b.png 2x"><img src="//images.example.org/a.png" srcset="https://elsewhere.example/a.png 2x" sizes="50vw"></picture>`,
  });
  expect(importImage).toHaveBeenCalledWith({ section: 'news', sourceUrl: 'https://images.example.org/a.png' });
  const doc = parse(result.content);
  expect(doc.querySelector('source')).toBeNull();
  expect(doc.querySelector('img').hasAttribute('srcset')).toBe(false);
  expect(doc.querySelector('img').hasAttribute('sizes')).toBe(false);
});

test.each(['blob:https://example.org/id', 'file:///tmp/private.jpg', 'javascript:alert(1)', '/relative.jpg', 'https://user:secret@example.org/a.png', ''])(
  'rejects unsupported source %s before any import', async source => {
    await expect(prepare({ content: `<img src="${remote}"><img src="${source}">` })).rejects.toThrow(/이미지/);
    expect(importImage).not.toHaveBeenCalled();
  },
);

test('image import failure reports the image number and not the secret URL', async () => {
  const source = 'https://example.org/image.png?token=secret-value';
  importImage.mockRejectedValueOnce(new Error(`fetch failed: ${source}`));
  const content = `<p>작성 중<img src="${source}"></p>`;
  try {
    await prepare({ content });
    throw new Error('expected failure');
  } catch (error) {
    expect(error.message).toMatch(/본문 이미지 1/);
    expect(error.message).not.toContain('secret-value');
    expect(error.message).not.toContain('example.org');
  }
  expect(content).toContain(source);
});

test('rejects unexpected non-storage response instead of silently keeping external URL', async () => {
  importImage.mockResolvedValueOnce({ data: { url: remote } });
  await expect(prepare({ content: `<img src="${remote}">` })).rejects.toThrow(/이미지/);
});

test('inline images are uploaded once and reused on retry after another image fails', async () => {
  const source = 'data:image/png;base64,aW5saW5lLWZpeHR1cmU=';
  const content = `<img src="${source}"><img src="${source}"><img src="${remote}">`;
  importImage.mockRejectedValueOnce(new Error('offline'));
  await expect(prepare({ content })).rejects.toThrow(/본문 이미지 3/);
  expect(uploadBytes).toHaveBeenCalledTimes(1);
  const result = await prepare({ content, selectedImageUrl: source });
  expect(uploadBytes).toHaveBeenCalledTimes(1);
  const images = parse(result.content).querySelectorAll('img');
  expect(images[0].getAttribute('src')).toBe(images[1].getAttribute('src'));
  expect(result.imageUrl).toBe(images[0].getAttribute('src'));
  expect(result.content).not.toContain('data:image');
});

test('retries URL lookup without uploading an already stored inline image again', async () => {
  const content = '<img src="data:image/png;base64,dXJsLWxvb2t1cC1maXh0dXJl">';
  getDownloadURL.mockRejectedValueOnce(new Error('temporary URL lookup failure'));
  await expect(prepare({ content })).rejects.toThrow(/본문 이미지 1/);
  expect(uploadBytes).toHaveBeenCalledTimes(1);
  const result = await prepare({ content });
  expect(uploadBytes).toHaveBeenCalledTimes(1);
  expect(getDownloadURL).toHaveBeenCalledTimes(2);
  expect(result.content).not.toContain('data:image');
});

test.each(['data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,@@@', 'data:image/png;base64,'])(
  'rejects unsupported or malformed inline image', async source => {
    await expect(prepare({ content: `<img src="${source}">` })).rejects.toThrow(/이미지/);
    expect(uploadBytes).not.toHaveBeenCalled();
  },
);

test('caps pending external image count before making requests', async () => {
  const content = Array.from({ length: 51 }, (_, i) => `<img src="https://example.org/${i}.png">`).join('');
  await expect(prepare({ content })).rejects.toThrow(/50/);
  expect(importImage).not.toHaveBeenCalled();
});
