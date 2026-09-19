import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit, increment, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, deleteObject, getBytes } from 'firebase/storage';

let env;
const databases = new WeakMap();
const buckets = new WeakMap();
const database = (context) => {
  if (!databases.has(context)) databases.set(context, context.firestore());
  return databases.get(context);
};
const bucket = (context) => {
  if (!buckets.has(context)) buckets.set(context, context.storage());
  return buckets.get(context);
};
const article = (isPublished = true) => ({
  title: '남성난임 정보', content: '<p>본문</p>', isPublished, viewCount: 0,
  createdAt: Timestamp.fromMillis(1000), updatedAt: Timestamp.fromMillis(1000),
});
const articleRef = (context, id = 'public') => doc(database(context), 'male_infertility', id);

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-medical-qa',
    firestore: { host: '127.0.0.1', port: 8180, rules: readFileSync(new URL('../medical_qa_app/firestore.rules', import.meta.url), 'utf8') },
    storage: { host: '127.0.0.1', port: 9299, rules: readFileSync(new URL('../medical_qa_app/storage.rules', import.meta.url), 'utf8') },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(database(context), 'users/admin'), { role: 'admin' });
    await setDoc(doc(database(context), 'users/member'), { role: 'user' });
    await setDoc(articleRef(context), article());
    await setDoc(articleRef(context, 'draft'), article(false));
    await setDoc(doc(database(context), 'encyclopedia/legacy'), article());
  });
});
after(async () => { if (env) await env.cleanup(); });

test('guests can read published articles and paginated lists, but not drafts or unfiltered lists', async () => {
  const guest = env.unauthenticatedContext();
  await assertSucceeds(getDoc(articleRef(guest)));
  await assertFails(getDoc(articleRef(guest, 'draft')));
  const page = await assertSucceeds(getDocs(query(collection(database(guest), 'male_infertility'), where('isPublished', '==', true), orderBy('createdAt', 'desc'), limit(5))));
  assert.deepEqual(page.docs.map((item) => item.id), ['public']);
  await assertFails(getDocs(collection(database(guest), 'male_infertility')));
  await assertSucceeds(getDoc(doc(database(guest), 'encyclopedia/legacy')));
});

test('only admins can create, edit, publish, and delete male infertility articles', async () => {
  const admin = env.authenticatedContext('admin', { admin: true });
  const member = env.authenticatedContext('member');
  const guest = env.unauthenticatedContext();
  await assertSucceeds(getDoc(articleRef(admin, 'draft')));
  await assertSucceeds(setDoc(articleRef(admin, 'new'), article(false)));
  await assertSucceeds(updateDoc(articleRef(admin, 'new'), { title: '수정', isPublished: true }));
  await assertSucceeds(deleteDoc(articleRef(admin, 'new')));
  for (const context of [member, guest]) {
    await assertFails(setDoc(articleRef(context, 'forbidden'), article()));
    await assertFails(updateDoc(articleRef(context), { content: '변조' }));
    await assertFails(deleteDoc(articleRef(context)));
  }
});

test('members can only increment published article views by exactly one', async () => {
  const member = env.authenticatedContext('member');
  await assertSucceeds(updateDoc(articleRef(member), { viewCount: increment(1) }));
  await assertFails(updateDoc(articleRef(member), { viewCount: increment(2) }));
  await assertFails(updateDoc(articleRef(member), { viewCount: increment(-1) }));
  await assertFails(updateDoc(articleRef(member), { viewCount: increment(1), title: '변조' }));
  await assertFails(updateDoc(articleRef(member, 'draft'), { viewCount: increment(1) }));
  await assertFails(updateDoc(articleRef(env.unauthenticatedContext()), { viewCount: increment(1) }));
});

test('images and thumbnails accept admin JPEG/PNG uploads, reject member uploads, oversized files and SVG', async () => {
  const admin = env.authenticatedContext('admin', { admin: true });
  const member = env.authenticatedContext('member');
  const guest = env.unauthenticatedContext();
  for (const folder of ['male_infertility_images', 'male_infertility_thumbnails']) {
    for (const type of ['jpeg', 'png']) {
      const path = `${folder}/test.${type}`;
      const imageRef = ref(bucket(admin), path);
      await assertSucceeds(uploadBytes(imageRef, new Uint8Array([1, 2, 3]), { contentType: `image/${type}` }));
      await assertSucceeds(getBytes(ref(bucket(guest), path)));
      await assertFails(uploadBytes(ref(bucket(member), path), new Uint8Array([4]), { contentType: `image/${type}` }));
      await assertFails(deleteObject(ref(bucket(member), path)));
      await assertSucceeds(deleteObject(imageRef));
    }
    await assertFails(uploadBytes(ref(bucket(admin), `${folder}/test.svg`), new Uint8Array([1]), { contentType: 'image/svg+xml' }));
    await assertFails(uploadBytes(ref(bucket(admin), `${folder}/large.jpg`), new Uint8Array(10 * 1024 * 1024), { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(ref(bucket(guest), `${folder}/guest.jpg`), new Uint8Array([1]), { contentType: 'image/jpeg' }));
  }
});
