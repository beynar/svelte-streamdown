import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '$lib/Streamdown.svelte';

const draw = (content: string, props: Record<string, unknown> = {}) =>
	render(Streamdown, { content, ...props }).container as HTMLElement;

describe('links', () => {
	test('a path stays a link under a list of protocols, in the same tab', () => {
		const root = draw('[About](/about) ![Logo](/logo.png)', {
			allowedLinkPrefixes: ['https://', 'mailto:'],
			allowedImagePrefixes: ['https://']
		});
		const link = root.querySelector('a')!;
		expect(link.getAttribute('href')).toBe('/about');
		expect(link.hasAttribute('target')).toBe(false);
		expect(root.querySelector('img')?.getAttribute('src')).toBe('/logo.png');
	});

	test('an address that only looks like a path is judged as the site it opens', () => {
		const root = draw('[x](//evil.example/a) ![y](//evil.example/i.png)', {
			allowedLinkPrefixes: ['https://trusted.example'],
			allowedImagePrefixes: ['https://trusted.example']
		});
		expect(root.querySelector('a')).toBeNull();
		expect(root.querySelector('img')).toBeNull();
		expect(root.querySelector('[data-streamdown-link-blocked]')?.textContent).toContain('x');
	});

	test('an allowed external address opens in a new tab', () => {
		const link = draw('[x](//example.com/a)').querySelector('a')!;
		expect(link.getAttribute('href')).toBe('https://example.com/a');
		expect(link.getAttribute('target')).toBe('_blank');
		expect(link.getAttribute('rel')).toBe('noopener noreferrer');
	});
});

describe('blockedLink', () => {
	const refused = { allowedLinkPrefixes: ['https://trusted.example'] };

	test('the default badge keeps the label, marks it and names the address', () => {
		const blocked = draw('[Docs](https://other.example/x)', refused).querySelector(
			'[data-streamdown-link-blocked]'
		)!;
		expect(blocked.textContent).toContain('Docs');
		expect(blocked.textContent).toMatch(/\[.+\]/);
		expect(blocked.getAttribute('title')).toContain('https://other.example/x');
	});

	test("'label' draws the label alone", () => {
		const root = draw('[Docs](https://other.example/x)', { ...refused, blockedLink: 'label' });
		const blocked = root.querySelector('[data-streamdown-link-blocked]')!;
		expect(blocked.textContent).toBe('Docs');
		expect(blocked.hasAttribute('title')).toBe(false);
		expect(root.querySelector('a')).toBeNull();
	});
});

describe('inline', () => {
	test('draws inline Markdown in a span, with no block around it', () => {
		const root = draw('Some **bold**, `code` and [a link](https://example.com)', {
			inline: true,
			class: 'line'
		});
		const host = root.querySelector('.line')!;
		expect(host.tagName).toBe('SPAN');
		expect(host.querySelector('p, div, h1, ul')).toBeNull();
		expect(host.querySelector('strong')?.textContent).toBe('bold');
		expect(host.querySelector('code')?.textContent).toBe('code');
		expect(host.querySelector('a')?.getAttribute('href')).toBe('https://example.com/');
	});

	test('a heading or a list marker stays literal text', () => {
		const host = draw('# Not a title', { inline: true, class: 'line' }).querySelector('.line')!;
		expect(host.querySelector('h1')).toBeNull();
		expect(host.textContent).toBe('# Not a title');
		const list = draw('- not a list', { inline: true, class: 'list' }).querySelector('.list')!;
		expect(list.querySelector('ul, li')).toBeNull();
		expect(list.textContent).toBe('- not a list');
	});

	test('a streamed open mark is closed, as in a block', () => {
		const host = draw('Some **bol', { inline: true, class: 'line' }).querySelector('.line')!;
		expect(host.querySelector('strong')?.textContent).toBe('bol');
	});

	test('it follows its content', async () => {
		const screen = render(Streamdown, { content: 'one', inline: true, class: 'line' });
		await screen.rerender({ content: 'two **three**', inline: true, class: 'line' });
		const host = screen.container.querySelector('.line')!;
		expect(host.textContent).toBe('two three');
		expect(host.querySelector('strong')?.textContent).toBe('three');
	});
});
