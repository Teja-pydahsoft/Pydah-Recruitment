const isLocalHost = () => {
  if (typeof window === 'undefined' || !window.location) return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

/** Origin of the app the admin/candidate is using in the browser. */
export const getAppOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  let envUrl = '';
  if (typeof process !== 'undefined' && process.env) {
    envUrl = process.env.REACT_APP_FRONTEND_URL || process.env.VITE_FRONTEND_URL || '';
  }
  try {
    if (!envUrl && typeof import.meta !== 'undefined' && import.meta.env) {
      envUrl = import.meta.env.VITE_FRONTEND_URL || import.meta.env.REACT_APP_FRONTEND_URL || '';
    }
  } catch {
    // import.meta not available
  }

  if (envUrl) {
    const trimmed = envUrl.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, '');
    if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
      return `http://${trimmed}`.replace(/\/+$/, '');
    }
    return `https://${trimmed}`.replace(/\/+$/, '');
  }

  return 'http://localhost:3000';
};

/**
 * Rewrite backend-generated links to use the current app origin when not on localhost.
 */
export const rewriteAppLink = (link) => {
  if (!link || typeof link !== 'string') return link;

  try {
    const parsed = new URL(link);
    if (isLocalHost() && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return link;
    }
    if (!isLocalHost() && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return `${getAppOrigin()}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return link;
  } catch {
    return link;
  }
};

export const buildTestTakeLink = (testLinkSlug, candidateId) => {
  const slug = String(testLinkSlug || '').replace(/^\/+/, '');
  const base = `${getAppOrigin()}/test/${slug}`;
  return candidateId ? `${base}?candidate=${candidateId}` : base;
};

export const buildTypingTestTakeLink = (testLinkSlug, candidateId) => {
  const slug = String(testLinkSlug || '').replace(/^\/+/, '');
  const base = `${getAppOrigin()}/typing-test/${slug}`;
  return candidateId ? `${base}?candidate=${candidateId}` : base;
};
