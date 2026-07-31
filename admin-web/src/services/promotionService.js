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

export async function savePromotion(form, editingPromotion = null) {
  const userId = auth.currentUser?.uid || '';
  const normalizedSortOrder = Number(form.sortOrder);
  const promotionPayload = {
    title: (form.title || '').trim(),
    summary: (form.summary || '').trim(),
    bannerImageUrl: (form.bannerImageUrl || '').trim(),
    contentHtml: (form.contentHtml || '').trim(),
    externalLinkUrl: (form.externalLinkUrl || '').trim(),
    externalLinkLabel: (form.externalLinkLabel || '').trim(),
    sortOrder: Number.isFinite(normalizedSortOrder) ? normalizedSortOrder : 0,
    isPublished: form.isPublished === true,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  };

  if (editingPromotion) {
    await updateDoc(doc(db, 'promotions', editingPromotion.id), promotionPayload);
    return editingPromotion.id;
  }

  const createdPromotion = await addDoc(collection(db, 'promotions'), {
    ...promotionPayload,
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
