/**
 * Get favicon URL from a website URL using Google's favicon service
 * @param url - Full website URL (e.g., "https://example.com/article")
 * @param size - Favicon size in pixels (default: 16)
 * @returns Favicon URL from Google's service
 */
export function getFaviconUrl(url: string, size: number = 16): string {
  try {
    // Ensure URL uses https protocol (some sources may return http)
    let normalizedUrl = url;
    if (url.startsWith('http://')) {
      normalizedUrl = url.replace('http://', 'https://');
    } else if (!url.startsWith('https://') && !url.startsWith('http://')) {
      normalizedUrl = 'https://' + url;
    }

    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname;
    // Google's favicon service - reliable and fast
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch (error) {
    // Invalid URL, return empty string
    return '';
  }
}

/**
 * Extract hostname from URL for display
 * @param url - Full website URL
 * @returns Clean hostname without www.
 */
export function getHostname(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, ''); // Remove www.
  } catch {
    return 'source';
  }
}
