export const parseUrl = (url: unknown, defaultOrigin?: string): URL | null => {
	if (typeof url !== 'string') return null;

	try {
		// Try to parse as absolute URL first
		const urlObject = new URL(url);
		return urlObject;
	} catch (error) {
		// If that fails and we have a defaultOrigin, try with it
		if (defaultOrigin) {
			try {
				const urlObject = new URL(url, defaultOrigin);
				return urlObject;
			} catch (error) {
				return null;
			}
		}
		return null;
	}
};

// An origin no real address has, to ask the URL parser how a browser reads a path: a browser treats
// `\\` like `/` and drops tabs and newlines, so `/\\evil.example` and `/\t/evil.example` are not paths.
const PROBE_ORIGIN = 'https://streamdown.invalid';

const rooted = (url: string) => url.startsWith('/') || url.startsWith('\\');

/**
 * Whether `url` stays on the page's origin the way a browser reads it: a path starting with `/`.
 * `//host`, `/\\host` and the like leave for another site, so they are not relative.
 */
export const isPathRelativeUrl = (url: unknown): boolean => {
	if (typeof url !== 'string' || !rooted(url)) return false;
	try {
		return new URL(url, PROBE_ORIGIN).origin === PROBE_ORIGIN;
	} catch {
		return false;
	}
};

const WILDCARD_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/** Whether a protocol-only prefix, such as `https://` or `mailto:`. */
const isProtocolPrefix = (prefix: string) =>
	prefix.endsWith('://') || (prefix.endsWith(':') && !prefix.includes('//'));

const absoluteMatches = (url: URL, prefix: string) => {
	if (isProtocolPrefix(prefix)) return url.href.startsWith(prefix);
	const parsedPrefix = parseUrl(prefix);
	return Boolean(
		parsedPrefix && parsedPrefix.origin === url.origin && url.href.startsWith(parsedPrefix.href)
	);
};

/**
 * Judges an address against a list of prefixes, reading it as a browser would, and returns what to
 * draw, or `null` to refuse it.
 *
 * A path on the page's origin (`/docs`) is always drawn, whatever the list says: it cannot leave
 * the site. An address that only looks like a path (`//host`, `/\\host`) does leave it, so it is
 * judged as the https address the browser reads it as.
 */
export const transformUrl = (
	url: string | null | undefined,
	allowedPrefixes: string[],
	defaultOrigin?: string
): string | null => {
	if (!url) return null;

	if (isPathRelativeUrl(url)) {
		// Written back as the browser reads it, so `/docs/../admin` is `/admin`.
		const read = new URL(url, PROBE_ORIGIN);
		return read.pathname + read.search + read.hash;
	}

	const absolute = rooted(url) ? new URL(url, PROBE_ORIGIN) : (parseUrl(url) ?? null);
	if (
		absolute &&
		allowedPrefixes.some((prefix) => prefix !== '*' && absoluteMatches(absolute, prefix))
	) {
		return absolute.href;
	}

	if (allowedPrefixes.includes('*')) {
		const parsed = absolute ?? parseUrl(url, defaultOrigin);
		// The wildcard allows the protocols a document can legitimately link to.
		// javascript:, data: and vbscript: stay blocked - they execute in the
		// page's origin.
		return parsed && WILDCARD_PROTOCOLS.has(parsed.protocol) ? parsed.href : null;
	}
	return null;
};
