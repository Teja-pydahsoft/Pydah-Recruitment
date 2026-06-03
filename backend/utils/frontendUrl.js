const LOCALHOST_FALLBACK = 'http://localhost:3000';

const isLocalUrl = (url) => /localhost|127\.0\.0\.1/i.test(String(url || ''));

const normalizeAppUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  let url = trimmed;
  if (!/^https?:\/\//i.test(url)) {
    url = isLocalUrl(url) ? `http://${url}` : `https://${url}`;
  }
  return url.replace(/\/+$/, '');
};

const parseFrontendUrlCandidates = () => {
  const raw = String(process.env.FRONTEND_URL || '').trim();
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map(normalizeAppUrl)
    .filter(Boolean);
};

const getRequestOrigin = (req) => {
  if (!req) return null;

  const origin = req.get('origin');
  if (origin) return normalizeAppUrl(origin);

  const referer = req.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin.replace(/\/+$/, '');
    } catch {
      // ignore invalid referer
    }
  }

  const forwardedHost = req.get('x-forwarded-host');
  const host = (forwardedHost || req.get('host') || '').split(',')[0].trim();
  if (host && !isLocalUrl(host)) {
    const proto = (req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http')).split(',')[0].trim();
    return normalizeAppUrl(`${proto}://${host}`);
  }

  return null;
};

/**
 * Resolve the public frontend app URL for links in emails, SMS, and API responses.
 * Prefers the request Origin/Referer when present so hosted admins get correct links
 * even if FRONTEND_URL lists localhost first or NODE_ENV is not "production".
 */
function getFrontendAppUrl(req) {
  const candidates = parseFrontendUrlCandidates();
  const requestOrigin = getRequestOrigin(req);

  if (requestOrigin) {
    const matched = candidates.find((url) => url === requestOrigin);
    if (matched) return matched;
    if (!isLocalUrl(requestOrigin)) return requestOrigin;
    const firstLocal = candidates.find(isLocalUrl);
    return firstLocal || requestOrigin;
  }

  const firstPublic = candidates.find((url) => !isLocalUrl(url));
  const firstLocal = candidates.find(isLocalUrl);

  if (process.env.NODE_ENV === 'production') {
    return firstPublic || candidates[0] || LOCALHOST_FALLBACK;
  }

  if (firstPublic && firstLocal) {
    return firstPublic;
  }

  return firstLocal || firstPublic || candidates[0] || LOCALHOST_FALLBACK;
}

module.exports = {
  getFrontendAppUrl,
  isLocalUrl,
  normalizeAppUrl
};
