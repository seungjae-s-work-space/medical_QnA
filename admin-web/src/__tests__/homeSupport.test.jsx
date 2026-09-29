import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import HomeDashboard from '../components/HomeDashboard';

jest.mock('../components/PromotionCarousel', () => () => null);

const paragraphs = [
  '난임정보톡톡은 전 세계에서 발표되는 난임·생식의료 분야의 논문과 최신 연구, 임상 정보를 직접 찾아 읽고 확인하며, 꼭 필요한 내용을 누구나 이해하기 쉬운 언어로 전하고 있습니다.',
  '하나의 정보를 전하기 위해 여러 논문과 자료를 찾아 비교하고, 연구 결과가 실제 난임 치료를 받는 분들에게 어떤 의미가 있는지 꼼꼼하게 살펴봅니다.',
  '빠르게 변하는 난임의학의 흐름 속에서 정확하고 믿을 수 있는 정보를 더 많은 분께 무료로 전하는 일, 난임정보톡톡이 오래도록 이어가고 싶은 일입니다.',
  '이 작은 공간이 도움이 되셨다면 자발적인 후원으로 함께해 주세요.',
  '보내주시는 따뜻한 마음은 더 많은 연구를 찾고, 더 좋은 정보를 만드는 힘이 됩니다.',
  '후원 여부와 관계없이 난임정보톡톡의 공개 정보는 누구나 자유롭게 이용하실 수 있습니다.',
  '당신의 응원이, 누군가에게 꼭 필요한 난임정보 한 편으로 돌아가겠습니다.',
];
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
  await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><HomeDashboard /></MemoryRouter>));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else delete navigator.clipboard;
});
const support = () => container.querySelector('#support');
const copyButton = () => support().querySelector('button[aria-label="계좌번호 복사"]');
const click = async (element) => act(async () => element.click());

test('home exposes voluntary support and exact account details without login', () => {
  expect(support()).not.toBeNull();
  expect(support().textContent).toContain('난임정보톡톡을 응원해주세요');
  expect(support().textContent).toContain('신한은행');
  expect(support().textContent).toContain('100-034-168251');
  expect(support().textContent).toContain('아기성공연구소');
  expect(support().textContent).toContain(paragraphs[5]);
  expect(support().querySelector('a[href]')).toBeNull();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

test('the details dialog preserves every supplied paragraph and closes without navigation', async () => {
  await click(support().querySelector('button[aria-haspopup="dialog"]'));
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog).not.toBeNull();
  paragraphs.forEach(text => expect(dialog.textContent).toContain(text));
  expect(dialog.textContent).toContain('난임정보톡톡 자발적 후원계좌');
  expect(dialog.textContent).toContain('신한은행');
  expect(dialog.textContent).toContain('100-034-168251');
  expect(dialog.textContent).toContain('아기성공연구소');
  await click(dialog.querySelector('button[aria-label="후원 안내 닫기"]'));
  // MUI keeps its exit animation mounted briefly; it is no longer open.
  expect(support().querySelector('button[aria-haspopup="dialog"]').getAttribute('aria-expanded')).toBe('false');
});

test('copy writes account digits only and confirms after the write succeeds', async () => {
  let resolve;
  writeText.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  await click(copyButton());
  expect(writeText).toHaveBeenCalledWith('100034168251');
  expect(support().textContent).not.toContain('계좌번호를 복사했습니다.');
  expect(copyButton().disabled).toBe(false);
  expect(copyButton().getAttribute('aria-disabled')).toBe('true');
  await click(copyButton());
  expect(writeText).toHaveBeenCalledTimes(1);
  await act(async () => resolve());
  expect(copyButton().getAttribute('aria-disabled')).toBe('false');
  expect(support().querySelector('[role="status"]').textContent).toContain('계좌번호를 복사했습니다.');
});

test.each(['denied', 'unavailable'])('clipboard %s leaves a selectable account and honest feedback', async (kind) => {
  if (kind === 'denied') writeText.mockRejectedValueOnce(new Error('NotAllowedError'));
  else Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  await click(copyButton());
  expect(support().textContent).not.toContain('계좌번호를 복사했습니다.');
  expect(support().querySelector('[role="status"]').textContent).toContain('계좌번호를 선택해 복사해주세요.');
  expect(support().textContent).toContain('100-034-168251');
});

test('existing free membership entry still opens its own dialog', async () => {
  const button = [...container.querySelectorAll('button')].find(node => node.textContent.includes('회원제(무료)'));
  await click(button);
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain('회원제(무료) 안내');
  expect(dialog.textContent).not.toContain('후원계좌');
});
