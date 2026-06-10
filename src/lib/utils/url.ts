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

export const isPathRelativeUrl = (url: unknown): boolean => {
	if (typeof url !== 'string') return false;
	return url.startsWith('/');
};

export const transformUrl = (
	url: unknown,
	allowedPrefixes: string[],
	defaultOrigin?: string
): string | null => {
	if (!url) return null;
	const parsedUrl = parseUrl(url, defaultOrigin);
	if (!parsedUrl) return null;

	// If the input is path relative, we output a path relative URL as well,
	// however, we always run the same checks on an absolute URL and we
	// always rescronstruct the output from the parsed URL to ensure that
	// the output is always a valid URL.
	const inputWasRelative = isPathRelativeUrl(url);
	const urlString = parseUrl(url);
	if (
		urlString &&
		allowedPrefixes.some((prefix) => {
			// Protocol-only prefixes (e.g. 'https://', 'http://', 'mailto:') allow any
			// URL using that protocol. They are not valid absolute URLs on their own
			// (new URL('https://') throws), so we match them with a simple prefix check.
			if (prefix.endsWith('://') || (prefix.endsWith(':') && !prefix.includes('//'))) {
				return urlString.href.startsWith(prefix);
			}
			const parsedPrefix = parseUrl(prefix);
			if (!parsedPrefix) {
				return false;
			}
			if (parsedPrefix.origin !== urlString.origin) {
				return false;
			}
			return urlString.href.startsWith(parsedPrefix.href);
		})
	) {
		if (inputWasRelative) {
			return urlString.pathname + urlString.search + urlString.hash;
		}
		return urlString.href;
	}
	// Check for wildcard - allow all URLs
	if (allowedPrefixes.includes('*')) {
		// Wildcard only allows http and https URLs
		if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
			return null;
		}
		const inputWasRelative = isPathRelativeUrl(url);
		if (parsedUrl) {
			if (inputWasRelative) {
				return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
			}
			return parsedUrl.href;
		}
	}
	return null;
};
