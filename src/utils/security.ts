/**
 * Sanitize an image source URL to prevent XSS vulnerabilities.
 * Only allows safe data URIs (images/svg), blob URIs, relative paths, or standard http/https image URLs.
 */
export function getSafeImageUrl(url: string | undefined | null, fallback = '/icon.jpg'): string {
  if (!url || typeof url !== 'string') {
    return fallback;
  }
  const trimmed = url.trim();
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  return fallback;
}
