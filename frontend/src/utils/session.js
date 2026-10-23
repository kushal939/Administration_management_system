/**
 * Session utility — uses sessionStorage so each browser tab has its own
 * independent session. This prevents the cross-tab contamination where
 * logging in as a different user in Tab B overwrites the session in Tab A.
 *
 * Falls back to localStorage for backward compatibility (existing sessions).
 */

export const getUser = () => {
  try {
    // sessionStorage is tab-specific — check it first
    const session = sessionStorage.getItem('user');
    if (session) return JSON.parse(session);
    // Fallback: migrate from localStorage into this tab's session
    const local = localStorage.getItem('user');
    if (local) {
      sessionStorage.setItem('user', local);
      return JSON.parse(local);
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const setUser = (userData) => {
  try {
    const str = JSON.stringify(userData);
    // Write only to sessionStorage — never pollute other tabs
    sessionStorage.setItem('user', str);
  } catch (e) {}
};

export const clearUser = () => {
  sessionStorage.removeItem('user');
  // Also clear localStorage so old sessions don't bleed in
  localStorage.removeItem('user');
};

export const getUserRole = () => {
  const u = getUser();
  return u?.role?.toLowerCase() || '';
};
