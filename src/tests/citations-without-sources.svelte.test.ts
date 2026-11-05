import { createRawSnippet } from 'svelte';
import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '$lib/Streamdown.svelte';
import { lex, type Extension } from '$lib/marked/index.js';
import Mention from './MentionFixture.test.svelte';

const TAG = '<Mention id="u1" label="Ada" />';
const SOURCES = { '1': { title: 'One', url: 'https://example.com/one' } };

// A tag inside a line only becomes one through a rule the consumer adds, as AIMessage does. The
// citation rule runs before those, so this is the rule it used to take the bracket from.
const INLINE_TAG: Extension = {
	name: 'inline-mention',
	level: 'inline',
	start: (src) => {
		const index = src.indexOf('<Mention');
		return index === -1 ? undefined : index;
	},
	tokenizer: (src) => {
		const match = src.match(/^<Mention id="([^"]*)" label="([^"]*)" \/>/);
		if (!match) return undefined;
		return {
			type: 'mdx',
			raw: match[0],
			tagName: 'Mention',
			attributes: { id: match[1], label: match[2] },
			tokens: []
		};
	}
};

const draw = (content: string, props: Record<string, unknown> = {}) =>
	render(Streamdown, {
		content,
		mdxComponents: { Mention },
		extensions: [INLINE_TAG],
		...props
	}).container as HTMLElement;

const text = (root: HTMLElement) => (root.textContent ?? '').replace(/\s+/g, ' ').trim();
const mention = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-testid="mention"]');

describe('brackets with no sources', () => {
	test.each([
		[`[${TAG}]`, '[Ada]'],
		[`[cc ${TAG}]`, '[cc Ada]'],
		[`hello [${TAG}] there`, 'hello [Ada] there'],
		[`[${TAG}] [${TAG}]`, '[Ada] [Ada]']
	])('%s reaches its component', async (content, expected) => {
		const root = draw(content);
		await expect.poll(() => mention(root)).not.toBeNull();
		expect(mention(root)?.dataset.id).toBe('u1');
		expect(text(root)).toBe(expected);
		expect(root.textContent).not.toContain('<Mention');
	});

	test('it draws as it does outside brackets, on the static path too', async () => {
		const root = draw(`[${TAG}]`, { static: true });
		await expect.poll(() => mention(root)).not.toBeNull();
		expect(text(root)).toBe('[Ada]');
	});

	test.each([
		['[1]', '[1]'],
		['see [1] [2]', 'see [1] [2]'],
		['[ref]', '[ref]'],
		['[a, b]', '[a, b]']
	])('%s stays as written', (content, expected) => {
		const root = draw(content);
		expect(text(root)).toBe(expected);
		expect(root.querySelector('button')).toBeNull();
	});

	test('what is inside is Markdown again', () => {
		expect(draw('[**bold**]').querySelector('strong')?.textContent).toBe('bold');
	});

	test('a link is still a link', () => {
		expect(draw('[x](https://example.com/a)').querySelector('a')?.getAttribute('href')).toBe(
			'https://example.com/a'
		);
	});

	test('empty sources are no sources', async () => {
		const root = draw(`[${TAG}]`, { sources: {} });
		await expect.poll(() => mention(root)).not.toBeNull();
	});
});

describe('with sources', () => {
	test('a citation is still a citation', () => {
		const root = draw('see [1]', { sources: SOURCES });
		expect(root.querySelector('button')?.textContent).toContain('example.com');
	});

	test('a key they do not name stays as written', () => {
		const root = draw('see [9]', { sources: SOURCES });
		expect(text(root)).toBe('see [9]');
		expect(root.querySelector('button')).toBeNull();
	});

	test('the rule keeps the whole bracket, as it always has', () => {
		const root = draw(`[${TAG}]`, { sources: SOURCES });
		expect(mention(root)).toBeNull();
		expect(root.textContent).toContain('<Mention');
	});

	test('sources that arrive later turn the brackets into citations', async () => {
		const screen = render(Streamdown, { content: 'see [1]' });
		const root = screen.container as HTMLElement;
		expect(root.querySelector('button')).toBeNull();
		await screen.rerender({ content: 'see [1]', sources: SOURCES });
		await expect.poll(() => root.querySelector('button')).not.toBeNull();
	});
});

describe('a consumer drawing its own citations', () => {
	test('still gets them with no sources', async () => {
		const inlineCitation = createRawSnippet(() => ({
			render: () => '<b data-testid="own">own</b>'
		}));
		const root = draw('see [1]', { inlineCitation });
		await expect.poll(() => root.querySelector('[data-testid="own"]')).not.toBeNull();
	});
});

describe('lex', () => {
	const inline = (tokens: ReturnType<typeof lex>) =>
		(tokens[0] as { tokens?: { type: string }[] }).tokens?.map(({ type }) => type) ?? [];

	test('keeps the rule unless told otherwise', () => {
		expect(inline(lex('[1]'))).toContain('inline-citations');
		expect(inline(lex('[1]', [], undefined, false))).not.toContain('inline-citations');
	});

	test('the two sets of options do not share a cache entry', () => {
		const first = inline(lex('[1]', [], undefined, false));
		const second = inline(lex('[1]'));
		const third = inline(lex('[1]', [], undefined, false));
		expect(second).toContain('inline-citations');
		expect(third).toEqual(first);
	});
});
