import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { auth, functions, storage } from '../firebase';

const SECTIONS = new Set(['news', 'encyclopedia', 'male_infertility']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMPORTS = 50;
const inlineUploads = new Map();

function remoteUrl(source) {
  const url = new URL(source.startsWith('//') ? `https:${source}` : source);
  if (!['http:', 'https:'].includes(url.protocol) || url.username ||
      url.password || url.port || url.href.length > 4096) {
    throw new Error('지원하지 않는 이미지 주소입니다.');
  }
  url.hash = '';
  return url.href;
}

function isStoredUrl(source) {
  const bucket = storage.app.options.storageBucket;
  const url = new URL(source);
  const prefix = `/v0/b/${bucket}/o/`;
  return url.protocol === 'https:' && url.hostname === 'firebasestorage.googleapis.com' &&
    url.pathname.startsWith(prefix) && url.pathname.length > prefix.length &&
    url.searchParams.get('alt') === 'media';
}

function inlineImage(source) {
  if (source.length >= Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 100) {
    throw new Error('이미지는 10MB 미만이어야 합니다.');
  }
  const match = /^data:(image\/(?:jpeg|png|gif|webp));base64,([a-z0-9+/]+={0,2})$/i.exec(source);
  if (!match) throw new Error('JPG, PNG, GIF, WebP 이미지를 직접 업로드해주세요.');
  const decoded = atob(match[2]);
  if (!decoded.length || decoded.length >= MAX_IMAGE_BYTES) {
    throw new Error('이미지는 10MB 미만이어야 합니다.');
  }
  return {
    type: match[1].toLowerCase(),
    bytes: Uint8Array.from(decoded, character => character.charCodeAt(0)),
  };
}

async function uploadInline(section, source) {
  const { type, bytes } = inlineImage(source);
  const hash = Array.from(new Uint8Array(await window.crypto.subtle.digest('SHA-256', bytes)))
    .map(value => value.toString(16).padStart(2, '0')).join('');
  const cacheKey = `${auth.currentUser?.uid || ''}:${section}:${type}:${hash}`;
  let entry = inlineUploads.get(cacheKey);
  if (!entry) {
    const extension = type.split('/')[1].replace('jpeg', 'jpg');
    const target = ref(storage, `${section}_images/inline-${uuidv4()}.${extension}`);
    entry = {
      target,
      upload: uploadBytes(target, new Blob([bytes], { type }), { contentType: type }),
      urlRequest: null,
    };
    inlineUploads.set(cacheKey, entry);
  }
  try {
    await entry.upload;
  } catch (error) {
    inlineUploads.delete(cacheKey);
    throw error;
  }
  // A failed URL lookup must not discard an already uploaded object's reference.
  const urlRequest = entry.urlRequest || (entry.urlRequest = getDownloadURL(entry.target));
  try {
    return await urlRequest;
  } catch (error) {
    if (entry.urlRequest === urlRequest) entry.urlRequest = null;
    throw error;
  } finally {
    if (inlineUploads.size > 100) inlineUploads.delete(inlineUploads.keys().next().value);
  }
}

function imageFailure(label, error) {
  const permission = ['functions/unauthenticated', 'functions/permission-denied',
    'storage/unauthorized', 'storage/unauthenticated'].includes(error?.code);
  return new Error(
    `${label}을 저장하지 못했습니다. ${permission
      ? '관리자 로그인 상태를 확인한 뒤 다시 시도해주세요.'
      : '10MB 미만의 JPG·PNG·GIF·WebP 파일로 직접 업로드한 뒤 다시 저장해주세요.'}`,
  );
}

export async function prepareArticleImages({
  section, content, selectedImageUrl = null, customThumbnail = null, onProgress,
}) {
  if (!SECTIONS.has(section)) throw new Error('지원하지 않는 게시판입니다.');
  const doc = new DOMParser().parseFromString(content, 'text/html');
  const images = Array.from(doc.body.querySelectorAll('img'));
  const sources = new Map();
  const imageSources = [];

  const register = (raw, label) => {
    const source = (raw || '').trim();
    try {
      const inline = source.startsWith('data:');
      if (inline) inlineImage(source);
      const normalized = inline ? source : remoteUrl(source);
      if (!sources.has(normalized)) {
        sources.set(normalized, {
          label, inline, stored: !inline && isStoredUrl(normalized),
        });
      }
      return normalized;
    } catch (_) {
      throw imageFailure(label);
    }
  };

  // Validate every source first so a malformed last image does not start uploads.
  images.forEach((image, index) => {
    imageSources.push(register(image.getAttribute('src'), `본문 이미지 ${index + 1}번`));
  });
  let thumbnailSource = null;
  if (customThumbnail) {
    thumbnailSource = register(customThumbnail, '대표 이미지');
  } else {
    let selected = null;
    if (selectedImageUrl) {
      try {
        selected = selectedImageUrl.startsWith('data:')
          ? selectedImageUrl : remoteUrl(selectedImageUrl.trim());
      } catch (_) { /* A removed selection falls back to the first body image. */ }
    }
    thumbnailSource = imageSources.includes(selected) ? selected : imageSources[0] || null;
  }

  const pending = Array.from(sources.entries()).filter(([, info]) => !info.stored);
  if (pending.length > MAX_IMPORTS) {
    throw new Error(`한 번에 새로 저장할 수 있는 이미지는 ${MAX_IMPORTS}개까지입니다.`);
  }
  const replacements = new Map(
    Array.from(sources.entries()).filter(([, info]) => info.stored).map(([source]) => [source, source]),
  );
  let completed = 0;
  onProgress?.({ completed, total: pending.length });
  for (const [source, info] of pending) {
    try {
      const url = info.inline
        ? await uploadInline(section, source)
        : (await httpsCallable(functions, 'importArticleImage', { timeout: 30000 })({
          section, sourceUrl: source,
        })).data?.url;
      if (typeof url !== 'string' || !isStoredUrl(remoteUrl(url))) {
        throw new Error('이미지 저장 응답을 확인할 수 없습니다.');
      }
      replacements.set(source, url);
      onProgress?.({ completed: ++completed, total: pending.length });
    } catch (error) {
      throw imageFailure(info.label, error);
    }
  }

  images.forEach((image, index) => {
    image.setAttribute('src', replacements.get(imageSources[index]));
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
  });
  doc.body.querySelectorAll('picture source').forEach(source => source.remove());
  return {
    content: doc.body.innerHTML,
    imageUrl: thumbnailSource ? replacements.get(thumbnailSource) : null,
  };
}
