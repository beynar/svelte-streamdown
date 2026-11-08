// Marks inside an address belong to the address: the streaming completer must not close them.
import { describe, expect, test } from 'vitest';
import { parseIncompleteMarkdown as complete } from '../lib/utils/parse-incomplete-markdown.js';

describe('emphasis marks in an address', () => {
	test.each([
		'[x](https://example.com/a_(b))',
		'[x](https://example.com/a~b)',
		'[x](https://example.com/a*b)',
		'[x](https://example.com/a^b)',
		'[x](https://example.com/a__b)',
		'[x](https://example.com/a~~b)',
		'[x](https://example.com/a**b)',
		'[Mercure](https://fr.wikipedia.org/wiki/Mercure_(planète))',
		'![x](https://example.com/a_(b).png)',
		'[x](https://example.com/a_b "a_title")',
		'see https://example.com/a_(b) here',
		'see https://example.com/a~b here',
		'<https://example.com/a_(b)>',
		'[a](https://a.co/x_y) and [b](https://b.co/y~z)'
	])('%s stays as it is', (text) => {
		expect(complete(text)).toBe(text);
	});

	test('emphasis around a link still closes', () => {
		expect(complete('*see [x](https://a.co/b_c)')).toBe('*see [x](https://a.co/b_c)*');
		expect(complete('**see [x](https://a.co/b_c)')).toBe('**see [x](https://a.co/b_c)**');
		expect(complete('_see [x](https://a.co/b~c)')).toBe('_see [x](https://a.co/b~c)_');
	});

	test('emphasis in the label still closes', () => {
		expect(complete('[*x](https://a.co)')).toContain('[*x');
	});

	test('emphasis after a link still closes', () => {
		expect(complete('[x](https://a.co/b_c) *then')).toBe('[x](https://a.co/b_c) *then*');
	});

	test('emphasis around a bare address keeps its closer', () => {
		expect(complete('_https://a.co/b_')).toBe('_https://a.co/b_');
		expect(complete('*https://a.co/b*')).toBe('*https://a.co/b*');
	});

	test('an address still streaming gets no stray mark', () => {
		const streamed = complete('[x](https://en.wikipedia.org/wiki/Mercure_');
		expect(streamed).not.toMatch(/_$/.source === '' ? /$^/ : /\)_+$/);
		expect(streamed.endsWith(')')).toBe(true);
	});

	test('the masks never reach the output', () => {
		const out = complete('**a [x](https://a.co/b_c~d*e^f) ~sub');
		expect(out).not.toMatch(/[-]/);
		expect(out).toContain('https://a.co/b_c~d*e^f');
	});
});
