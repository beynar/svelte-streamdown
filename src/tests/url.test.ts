import { expect, describe, test } from 'vitest';
import { isPathRelativeUrl, transformUrl } from '../lib/utils/url.js';

describe('transformUrl protocol-only prefixes', () => {
	test('https:// allows any https URL', () => {
		expect(transformUrl('https://example.com/foo', ['https://'])).toBe('https://example.com/foo');
		expect(transformUrl('https://other.com', ['https://'])).toBe('https://other.com/');
	});

	test('https:// blocks http URLs', () => {
		expect(transformUrl('http://example.com', ['https://'])).toBeNull();
	});

	test('http:// allows any http URL as an explicit opt-in', () => {
		expect(transformUrl('http://example.com/foo', ['http://'])).toBe('http://example.com/foo');
		expect(transformUrl('https://example.com', ['http://'])).toBeNull();
	});

	test('mailto: and tel: prefixes are supported', () => {
		expect(transformUrl('mailto:user@example.com', ['mailto:'])).toBe('mailto:user@example.com');
		expect(transformUrl('tel:+15551234567', ['tel:'])).toBe('tel:+15551234567');
	});

	test('protocol-only prefix does not match a different protocol', () => {
		expect(transformUrl('mailto:user@example.com', ['https://'])).toBeNull();
		expect(transformUrl('javascript:alert(1)', ['https://'])).toBeNull();
	});

	test('domain prefixes still enforce origin', () => {
		expect(transformUrl('https://trusted.com/x', ['https://trusted.com'])).toBe(
			'https://trusted.com/x'
		);
		expect(transformUrl('https://evil.com/x', ['https://trusted.com'])).toBeNull();
		expect(transformUrl('https://trusted.com.evil.com/x', ['https://trusted.com'])).toBeNull();
	});

	test('wildcard allows http and https', () => {
		expect(transformUrl('https://anything.com', ['*'])).toBe('https://anything.com/');
		expect(transformUrl('http://anything.com', ['*'])).toBe('http://anything.com/');
	});

	test('wildcard allows mailto: and tel:', () => {
		expect(transformUrl('mailto:user@example.com', ['*'])).toBe('mailto:user@example.com');
		expect(transformUrl('tel:+15551234567', ['*'])).toBe('tel:+15551234567');
	});

	test('wildcard still blocks executable and embedded protocols', () => {
		expect(transformUrl('javascript:alert(1)', ['*'])).toBeNull();
		expect(transformUrl('JavaScript:alert(1)', ['*'])).toBeNull();
		expect(transformUrl('data:text/html,<script>alert(1)</script>', ['*'])).toBeNull();
		expect(transformUrl('vbscript:msgbox(1)', ['*'])).toBeNull();
		expect(transformUrl('file:///etc/passwd', ['*'])).toBeNull();
	});

	test('an explicit prefix list still excludes mailto: and tel:', () => {
		expect(transformUrl('mailto:user@example.com', ['https://'])).toBeNull();
		expect(transformUrl('tel:+15551234567', ['https://example.com'])).toBeNull();
	});
});

describe('transformUrl reads an address as a browser does', () => {
	// Each of these leaves for another site, however much it looks like a path.
	const elsewhere = [
		'//evil.example',
		'//evil.example/a',
		'/\\evil.example',
		'\\\\evil.example',
		'\\/evil.example',
		'/\t/evil.example',
		'/\n/evil.example',
		'///evil.example'
	];

	test.each(elsewhere)('%j is not relative', (url) => {
		expect(isPathRelativeUrl(url)).toBe(false);
	});

	test.each(elsewhere)('%j is refused by a list that does not cover the site', (url) => {
		expect(transformUrl(url, ['https://trusted.example'])).toBeNull();
		expect(transformUrl(url, ['/'])).toBeNull();
		expect(transformUrl(url, ['mailto:'])).toBeNull();
		expect(transformUrl(url, [])).toBeNull();
	});

	test.each(elsewhere)('%j is the https address it reads as under a list that covers it', (url) => {
		expect(transformUrl(url, ['https://'])).toMatch(/^https:\/\/evil\.example\//);
		expect(transformUrl(url, ['*'])).toMatch(/^https:\/\/evil\.example\//);
	});

	test.each(['/about', '/a/b?x=1#y', '/', '/%2F%2Fevil.example', '/a//b', '/a\\b'])(
		'%j is relative',
		(url) => {
			expect(isPathRelativeUrl(url)).toBe(true);
		}
	);

	test('a real path is drawn whatever the list says', () => {
		for (const list of [['https://'], ['https://', 'mailto:', 'tel:'], [], ['*'], ['/']]) {
			expect(transformUrl('/about', list)).toBe('/about');
			expect(transformUrl('/a/b?x=1#y', list)).toBe('/a/b?x=1#y');
		}
		expect(transformUrl('/a', ['https://other.example/'], 'https://app.example')).toBe('/a');
	});

	test('a path is written back as the browser resolves it', () => {
		expect(transformUrl('/docs/../admin', ['https://'])).toBe('/admin');
		expect(transformUrl('/docs/./a', ['https://'])).toBe('/docs/a');
	});

	test('nothing executable gets through, however it is spelled', () => {
		for (const url of ['java\nscript:alert(1)', ' javascript:alert(1)', 'JAVASCRIPT:alert(1)']) {
			expect(transformUrl(url, ['*'])).toBeNull();
			expect(transformUrl(url, ['https://'])).toBeNull();
		}
	});
});

describe('transformUrl judges what it draws as what it opens', () => {
	// Each resolves to a path starting with `//`, which written back opens evil.example.
	const resolvesElsewhere = [
		'/app/..//evil.example/x',
		'/a/%2e%2e//evil.example',
		'/a/.%2e//evil.example',
		'/docs/.%2e//evil.example'
	];

	test.each(resolvesElsewhere)('%j is not relative', (url) => {
		expect(isPathRelativeUrl(url)).toBe(false);
	});

	test.each(resolvesElsewhere)('%j is refused by a list that does not cover the site', (url) => {
		expect(transformUrl(url, ['https://trusted.example'])).toBeNull();
		expect(transformUrl(url, ['mailto:'])).toBeNull();
		expect(transformUrl(url, [])).toBeNull();
	});

	test.each(resolvesElsewhere)(
		'%j is the https address it opens under a list that covers it',
		(url) => {
			expect(transformUrl(url, ['https://'])).toMatch(/^https:\/\/evil\.example\//);
			expect(transformUrl(url, ['*'])).toMatch(/^https:\/\/evil\.example\//);
		}
	);

	test.each(['//', '/\\', '\\\\', '///', '//:'])(
		'%j, which the URL parser refuses, is refused',
		(url) => {
			for (const list of [['*'], ['https://'], [], ['/']]) {
				expect(() => transformUrl(url, list)).not.toThrow();
				expect(transformUrl(url, list)).toBeNull();
			}
			expect(isPathRelativeUrl(url)).toBe(false);
		}
	);
});
