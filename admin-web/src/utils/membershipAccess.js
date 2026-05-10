export const MEMBERSHIP_REQUIRED_PATHS = ['/encyclopedia', '/news'];

export function shouldShowMembershipPrompt(pathname, isLoggedIn) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  return !isLoggedIn && MEMBERSHIP_REQUIRED_PATHS.includes(normalizedPath);
}
