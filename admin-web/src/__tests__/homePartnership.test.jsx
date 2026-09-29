import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import HomeDashboard from '../components/HomeDashboard';

jest.mock('../components/PromotionCarousel', () => () => null);

const email = 'chosun3021@naver.com';
const paragraphs = [
  '난임정보톡톡은 전 세계 난임·생식의료 분야의 최신 연구와 임상 정보를 바탕으로 전문 콘텐츠를 제작하고 있습니다.',
  '난임·임신·출산·여성건강·남성건강·의료·바이오 등 난임정보톡톡의 콘텐츠와 잘 어울리는 광고 및 협찬, 콘텐츠 제휴, 공동 프로젝트를 기다립니다.',
  '단순히 광고를 노출하는 데 그치지 않고, 독자에게 도움이 되는 정보와 브랜드의 가치를 자연스럽게 연결하는 협업을 지향합니다.',
  '광고·협찬 콘텐츠는 일반 콘텐츠와 명확하게 구분해 표시하며, 광고 여부와 관계없이 의학·연구 정보의 정확성과 편집의 독립성을 지킵니다.',
];
const closing = '좋은 정보와 좋은 브랜드가 만날 수 있는 협업을 기다립니다.';
let root;
let container;
let writeText;
let originalClipboard;

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  writeText = jest.fn().mockResolvedValue();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <HomeDashboard />
    </MemoryRouter>
  ));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else delete navigator.clipboard;
});

const section = () => container.querySelector('#partnership');
const detailsButton = () => section().querySelector('button[aria-haspopup="dialog"]');
const copyButton = (scope = section()) => scope.querySelector('button[aria-label="이메일 주소 복사"]');
const click = async element => act(async () => element.click());

test('home exposes advertising contact and editorial policy separately below voluntary support', () => {
  expect(section()).not.toBeNull();
  expect(container.querySelector('#support').nextElementSibling).toBe(section());
  expect(section().querySelector('h2').textContent).toBe('광고·협찬 문의');
  expect(section().textContent).toContain(paragraphs[0]);
  expect(section().textContent).toContain(paragraphs[3]);
  expect(section().textContent).toContain('광고·협찬 및 제휴 문의');
  expect(section().textContent).toContain(email);
  expect(section().querySelector('a[href]').getAttribute('href')).toBe(`mailto:${email}`);
  expect(section().textContent).not.toContain('후원계좌');
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

test('details preserve all supplied copy and expose the same email with no form or login gate', async () => {
  await click(detailsButton());
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog).not.toBeNull();
  expect(dialog.id).toBe(detailsButton().getAttribute('aria-controls'));
  paragraphs.forEach(text => expect(dialog.textContent).toContain(text));
  expect(dialog.textContent).toContain(closing);
  expect(dialog.querySelector('a[href]').getAttribute('href')).toBe(`mailto:${email}`);
  expect(dialog.querySelector('form')).toBeNull();
  expect(dialog.textContent).not.toContain('로그인');
  await click(copyButton(dialog));
  expect(writeText).toHaveBeenCalledWith(email);
  expect(dialog.querySelector('[role="status"]').textContent).toBe('이메일 주소를 복사했습니다.');
  await click(dialog.querySelector('button[aria-label="광고·협찬 안내 닫기"]'));
  expect(detailsButton().getAttribute('aria-expanded')).toBe('false');
});

test('copy confirms only after success and prevents repeated writes without disabling focus', async () => {
  let resolve;
  writeText.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  await click(copyButton());
  expect(writeText).toHaveBeenCalledWith(email);
  expect(section().querySelector('[role="status"]').textContent).toBe('');
  expect(copyButton().disabled).toBe(false);
  expect(copyButton().getAttribute('aria-disabled')).toBe('true');
  await click(copyButton());
  expect(writeText).toHaveBeenCalledTimes(1);
  await act(async () => resolve());
  expect(copyButton().getAttribute('aria-disabled')).toBe('false');
  expect(section().querySelector('[role="status"]').textContent).toBe('이메일 주소를 복사했습니다.');
});

test.each(['denied', 'unavailable'])('clipboard %s keeps the email readable and offers a manual fallback', async kind => {
  if (kind === 'denied') writeText.mockRejectedValueOnce(new Error('NotAllowedError'));
  else Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  await click(copyButton());
  expect(section().textContent).toContain(email);
  expect(section().querySelector('[role="status"]').textContent).toBe('복사하지 못했습니다. 이메일 주소를 선택해 복사해주세요.');
  expect(section().textContent).not.toContain('이메일 주소를 복사했습니다.');
  expect(copyButton().getAttribute('aria-disabled')).toBe('false');
});

test('copy can be retried after a denied request', async () => {
  writeText.mockRejectedValueOnce(new Error('NotAllowedError'));
  await click(copyButton());
  await click(copyButton());
  expect(writeText).toHaveBeenCalledTimes(2);
  expect(section().querySelector('[role="status"]').textContent).toBe('이메일 주소를 복사했습니다.');
});
