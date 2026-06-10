import { expect, describe, test } from 'vitest';
import { transformUrl } from '../lib/utils/url.js';

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

	test('wildcard still only allows http and https', () => {
		expect(transformUrl('https://anything.com', ['*'])).toBe('https://anything.com/');
		expect(transformUrl('javascript:alert(1)', ['*'])).toBeNull();
	});
});
