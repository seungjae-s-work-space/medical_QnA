import {
  shouldShowMembershipPrompt,
} from '../membershipAccess';

describe('membership access prompts', () => {
  test('requires the free membership prompt for anonymous news and encyclopedia access', () => {
    expect(shouldShowMembershipPrompt('/news', false)).toBe(true);
    expect(shouldShowMembershipPrompt('/encyclopedia', false)).toBe(true);
  });

  test('does not prompt logged in users or public content paths', () => {
    expect(shouldShowMembershipPrompt('/news', true)).toBe(false);
    expect(shouldShowMembershipPrompt('/encyclopedia', true)).toBe(false);
    expect(shouldShowMembershipPrompt('/notice', false)).toBe(false);
    expect(shouldShowMembershipPrompt('/video', false)).toBe(false);
  });
});
