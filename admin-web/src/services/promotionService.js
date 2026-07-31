import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { auth, db, storage } from '../firebase';

export const PROMOTION_HOME_LIMIT = 10;
export const PROMOTION_ADMIN_PAGE_SIZE = 10;
export const PROMOTION_SEARCH_KEYWORD_MIN_LENGTH = 2;
export const PROMOTION_SEARCH_KEYWORD_LIMIT = 500;
export const PROMOTION_SEARCH_MAX_TOKEN_LENGTH = 64;

const BLOCKED_PROMOTION_SELECTOR = 'script, style, iframe, object, embed';
const ALLOWED_PROMOTION_TAGS = new Set([
  'A',
  'B',
  'BLOCKQUOTE',
  'BR',
  'DIV',
  'EM',
  'FIGCAPTION',
  'FIGURE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'I',
  'IMG',
  'LI',
  'OL',
  'P',
  'S',
  'SPAN',
  'STRONG',
  'TABLE',
  'TBODY',
  'TD',
  'TH',
  'THEAD',
  'TR',
  'U',
  'UL',
]);
const GLOBAL_PROMOTION_ATTRIBUTES = new Set(['style', 'title']);
const PROMOTION_ATTRIBUTE_ALLOWLIST = {
  A: new Set(['href', 'rel', 'target']),
  IMG: new Set(['alt', 'height', 'src', 'width']),
};
const URI_PROMOTION_ATTRIBUTES = new Set(['href', 'src']);
const SCRIPT_URL_PROTOCOL = ['java', 'script:'].join('');
const STYLE_SCRIPT_URL_PATTERN = new RegExp(
  `(?:expression\\s*\\(|url\\s*\\(\\s*['"]?\\s*${SCRIPT_URL_PROTOCOL})`,
  'i'
);
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:']);
const PROMOTION_BANNER_PATH_MARKERS = [
  '/promotion_banners/',
  '/promotion_images/',
  'promotion_banners%2F',
  'promotion_images%2F',
];

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

  const promotion = mapPromotionDoc(snapshot);

  if (promotion.isPublished !== true) {
    return null;
  }

  return promotion;
}

export async function uploadPromotionBanner(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${uuidv4()}.${ext}`;
  const storageRef = ref(storage, `promotion_banners/${fileName}`);
  const metadata = file.type ? { contentType: file.type } : undefined;

  await uploadBytes(storageRef, file, metadata);
  return getDownloadURL(storageRef);
}

function stripPromotionHtmlText(html) {
  if (!html) return '';

  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const parsedDocument = parser.parseFromString(html, 'text/html');
    return parsedDocument.body.textContent || '';
  }

  return String(html).replace(/<[^>]*>/g, ' ');
}

export function normalizePromotionSearchQuery(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function hasKeywordCapacity(keywords) {
  if (keywords.size >= PROMOTION_SEARCH_KEYWORD_LIMIT) return false;
  return keywords.size < PROMOTION_SEARCH_KEYWORD_LIMIT;
}

function addKeyword(keywords, value) {
  if (!hasKeywordCapacity(keywords)) return false;
  keywords.add(value);
  return hasKeywordCapacity(keywords);
}

function addSearchToken(keywords, value) {
  const normalizedValue = normalizePromotionSearchQuery(value);
  if (!normalizedValue) return;

  if (normalizedValue.length >= PROMOTION_SEARCH_KEYWORD_MIN_LENGTH) {
    if (!addKeyword(keywords, normalizedValue.slice(0, PROMOTION_SEARCH_MAX_TOKEN_LENGTH))) {
      return;
    }
  }

  for (let token of normalizedValue.split(' ')) {
    if (!hasKeywordCapacity(keywords)) return;

    token = token.slice(0, PROMOTION_SEARCH_MAX_TOKEN_LENGTH);
    if (token.length < PROMOTION_SEARCH_KEYWORD_MIN_LENGTH) continue;
    if (!addKeyword(keywords, token)) return;

    for (
      let index = PROMOTION_SEARCH_KEYWORD_MIN_LENGTH;
      index <= token.length && keywords.size < PROMOTION_SEARCH_KEYWORD_LIMIT;
      index += 1
    ) {
      keywords.add(token.slice(0, index));
    }
  }
}

export function buildPromotionSearchKeywords(promotion) {
  const keywords = new Set();

  addSearchToken(keywords, promotion.title);
  addSearchToken(keywords, promotion.summary);
  addSearchToken(keywords, stripPromotionHtmlText(promotion.contentHtml));
  addSearchToken(keywords, promotion.externalLinkLabel);
  addSearchToken(keywords, promotion.externalLinkUrl);

  return Array.from(keywords);
}

function hasManagedPromotionImagePath(normalizedUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return false;
  }

  const expectedBucket = storage.app.options.storageBucket;
  const bucketPathMatch = parsedUrl.pathname.match(/\/b\/([^/]+)\/o\//);
  const isExpectedStorageHost =
    parsedUrl.hostname === expectedBucket ||
    (
      parsedUrl.hostname === 'firebasestorage.googleapis.com' &&
      bucketPathMatch?.[1] === expectedBucket
    ) ||
    (
      parsedUrl.hostname.endsWith('.firebasestorage.app') &&
      parsedUrl.hostname === expectedBucket
    );
  if (!isExpectedStorageHost) return false;

  let decodedPath = parsedUrl.pathname;
  try {
    decodedPath = decodeURIComponent(parsedUrl.pathname);
  } catch {
    decodedPath = parsedUrl.pathname;
  }

  const searchablePath = `${parsedUrl.pathname} ${decodedPath}`;
  return PROMOTION_BANNER_PATH_MARKERS.some((marker) => (
    searchablePath.includes(marker)
  ));
}

function validatePromotionBannerImageUrl(bannerImageUrl) {
  const normalizedUrl = normalizePromotionExternalUrl(bannerImageUrl);
  const hasManagedPath = normalizedUrl
    ? hasManagedPromotionImagePath(normalizedUrl)
    : false;

  if (!normalizedUrl || !hasManagedPath) {
    throw new Error('배너 이미지는 프로모션 이미지 업로드 경로의 http/https URL이어야 합니다.');
  }

  return normalizedUrl;
}

export async function savePromotion(form, editingPromotion = null) {
  const userId = auth.currentUser?.uid || '';
  const normalizedSortOrder = Number(form.sortOrder);
  const promotionPayload = {
    title: (form.title || '').trim(),
    summary: (form.summary || '').trim(),
    bannerImageUrl: validatePromotionBannerImageUrl((form.bannerImageUrl || '').trim()),
    contentHtml: (form.contentHtml || '').trim(),
    externalLinkUrl: (form.externalLinkUrl || '').trim(),
    externalLinkLabel: (form.externalLinkLabel || '').trim(),
    sortOrder: Number.isFinite(normalizedSortOrder) ? normalizedSortOrder : 0,
    isPublished: form.isPublished === true,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  };
  const searchablePromotionPayload = {
    ...promotionPayload,
    searchKeywords: buildPromotionSearchKeywords(promotionPayload),
  };

  if (editingPromotion) {
    await updateDoc(doc(db, 'promotions', editingPromotion.id), searchablePromotionPayload);
    return editingPromotion.id;
  }

  const createdPromotion = await addDoc(collection(db, 'promotions'), {
    ...searchablePromotionPayload,
    createdAt: serverTimestamp(),
    createdBy: userId,
  });

  return createdPromotion.id;
}

export async function deletePromotion(promotionId) {
  await deleteDoc(doc(db, 'promotions', promotionId));
}

function unwrapPromotionNode(node, documentRef) {
  const fragment = documentRef.createDocumentFragment();

  while (node.firstChild) {
    fragment.appendChild(node.firstChild);
  }

  node.replaceWith(fragment);
}

function isAllowedPromotionAttribute(element, name) {
  return (
    GLOBAL_PROMOTION_ATTRIBUTES.has(name) ||
    PROMOTION_ATTRIBUTE_ALLOWLIST[element.tagName]?.has(name)
  );
}

export function normalizePromotionExternalUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }

  try {
    const url = new URL(value.trim());
    return ALLOWED_EXTERNAL_PROTOCOLS.has(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export function sanitizePromotionHtml(html) {
  if (!html || typeof DOMParser === 'undefined') {
    return '';
  }

  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(html, 'text/html');

  parsedDocument.body.querySelectorAll(BLOCKED_PROMOTION_SELECTOR).forEach((node) => {
    node.remove();
  });

  Array.from(parsedDocument.body.querySelectorAll('*')).forEach((element) => {
    if (!ALLOWED_PROMOTION_TAGS.has(element.tagName)) {
      unwrapPromotionNode(element, parsedDocument);
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const normalizedUri = URI_PROMOTION_ATTRIBUTES.has(name)
        ? normalizePromotionExternalUrl(attribute.value)
        : null;
      const isUnsafeStyle = name === 'style' && STYLE_SCRIPT_URL_PATTERN.test(attribute.value);

      if (
        name.startsWith('on') ||
        !isAllowedPromotionAttribute(element, name) ||
        (URI_PROMOTION_ATTRIBUTES.has(name) && !normalizedUri) ||
        isUnsafeStyle
      ) {
        element.removeAttribute(attribute.name);
      } else if (normalizedUri) {
        element.setAttribute(attribute.name, normalizedUri);
      }
    });

    if (element.tagName === 'A' && element.getAttribute('href')) {
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return parsedDocument.body.innerHTML;
}
