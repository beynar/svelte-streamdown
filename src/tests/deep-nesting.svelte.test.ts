import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '$lib/Streamdown.svelte';
import { lex, parseBlocks } from '$lib/marked/index.js';

const quotes = (depth: number) => `${'>'.repeat(depth)} x`;
const lists = (depth: number) =>
	Array.from({ length: depth }, (_, index) => `${'  '.repeat(index)}- level${index}`).join('\n');
const tags = (depth: number) => `${'<Stack>'.repeat(depth)}x${'</Stack>'.repeat(depth)}`;

const deepest = (selector: string, root: HTMLElement) => {
	let depth = 0;
	let node = root.querySelector(selector);
	while (node) {
		depth += 1;
		node = node.querySelector(selector);
	}
	return depth;
};

describe('text nested too deep', () => {
	test.each([
		['quotes, as reported', quotes(50)],
		['quotes, far past it', quotes(2000)],
		['lists, as reported', lists(30)],
		['lists, far past it', lists(200)],
		['tags, as reported', tags(60)],
		['tags, far past it', tags(500)]
	])('%s never throw', (_name, content) => {
		const { container } = render(Streamdown, { content });
		expect(container.textContent).toMatch(/x|level/);
	});

	test('the rest of a deep quote is drawn as plain text, marks included', () => {
		const { container } = render(Streamdown, { content: quotes(50) });
		expect(deepest('blockquote', container as HTMLElement)).toBeLessThanOrEqual(16);
		expect(container.textContent).toMatch(/>\s*x/);
	});

	test('the text around it survives', () => {
		const { container } = render(Streamdown, { content: `before\n\n${quotes(50)}\n\nafter` });
		expect(container.textContent).toContain('before');
		expect(container.textContent).toContain('after');
	});

	test('a list cut short keeps its markup valid', () => {
		const { container } = render(Streamdown, { content: lists(30) });
		for (const list of container.querySelectorAll('ul, ol')) {
			for (const child of list.children) expect(child.tagName).toBe('LI');
			for (const node of list.childNodes) {
				if (node.nodeType === Node.TEXT_NODE) expect(node.textContent?.trim()).toBe('');
			}
		}
		expect(container.textContent).toContain('level29');
	});

	test('a tag past the limit is text, not a token', () => {
		const tokens = lex(tags(20));
		expect(JSON.stringify(tokens).match(/"type":"mdx"/g)?.length).toBeLessThanOrEqual(8);
		expect(JSON.stringify(tokens)).toContain('<Stack>');
	});
});

const hasType = (tokens: unknown[], type: string): boolean =>
	(tokens as { type: string; tokens?: unknown[] }[]).some(
		(token) => token.type === type || (token.tokens ? hasType(token.tokens, type) : false)
	);
const MARKED = 'a **bold** [link](https://example.test) `code`';
const listsTo = (depth: number, leaf: string) =>
	Array.from({ length: depth }, (_, index) =>
		'  '.repeat(index).concat('- ', index === depth - 1 ? leaf : 'x')
	).join('\n');
const quotesTo = (depth: number, leaf: string) => `${'> '.repeat(depth)}${leaf}`;
const tagsTo = (depth: number, leaf: string) =>
	`${'<Stack>\n\n'.repeat(depth)}${leaf}${'\n\n</Stack>'.repeat(depth)}`;
const marksTo = (depth: number) => {
	const signs = ['*', '_'];
	let text = 'x';
	for (let level = 0; level < depth; level += 1) {
		const sign = signs[level % signs.length];
		text = `${sign}w ${text} w${sign}`;
	}
	return text;
};
const markDepth = (tokens: unknown[]): number =>
	Math.max(
		0,
		...(tokens as { type: string; tokens?: unknown[] }[]).map(
			(token) =>
				(['strong', 'em', 'del', 'link'].includes(token.type) ? 1 : 0) +
				markDepth(token.tokens ?? [])
		)
	);

describe('marks do not spend the depth of the document', () => {
	test.each([
		['16 quotes', quotesTo(16, MARKED)],
		['8 list levels', listsTo(8, MARKED)],
		['8 tags', tagsTo(8, MARKED)]
	])('at the limit, %s keep their bold and their links', (_name, content) => {
		const tokens = lex(content);
		expect(hasType(tokens, 'strong')).toBe(true);
		expect(hasType(tokens, 'link')).toBe(true);
		expect(hasType(tokens, 'codespan')).toBe(true);
	});

	test.each([
		['17 quotes', quotesTo(17, MARKED)],
		['9 list levels', listsTo(9, MARKED)],
		['9 tags', tagsTo(9, MARKED)]
	])('past the limit, %s are text', (_name, content) => {
		const tokens = lex(content);
		expect(hasType(tokens, 'strong')).toBe(false);
		expect(JSON.stringify(tokens)).toContain('**bold**');
	});

	test('a card in a grid with a sub-list keeps its bold', () => {
		const tokens = lex(
			'<Stack>\n\n<Grid columns="2">\n\n<GridSpan>\n\n<Card title="a">\n\n<Stack>\n\n- one\n  - two **b**\n\n</Stack>\n\n</Card>\n\n</GridSpan>\n\n</Grid>\n\n</Stack>'
		);
		expect(hasType(tokens, 'strong')).toBe(true);
	});

	test('8 marks inside each other stand, and more are text', () => {
		expect(markDepth(lex(marksTo(8)))).toBe(8);
		const tokens = lex(marksTo(12));
		expect(markDepth(tokens)).toBe(8);
		expect(JSON.stringify(tokens)).toContain('x');
	});

	test.each([
		['nested', marksTo(400)],
		['never closed', '**a _b ~~c '.repeat(2000)]
	])('marks %s never throw', (_name, content) => {
		const { container } = render(Streamdown, { content });
		expect(container.textContent?.length).toBeGreaterThan(0);
	});
});

describe('what real documents nest stays what it is', () => {
	test('6 quotes, 6 list levels and 6 tags are not cut', () => {
		const quoted = render(Streamdown, { content: quotes(6) });
		expect(deepest('blockquote', quoted.container as HTMLElement)).toBe(6);
		const listed = render(Streamdown, { content: lists(6) });
		expect(deepest('ul', listed.container as HTMLElement)).toBe(6);
		const tokens = lex(tags(6));
		expect(JSON.stringify(tokens).match(/"type":"mdx"/g)?.length).toBe(6);
	});
});

describe('the lexer', () => {
	test('gives up on text too deep for it without throwing', () => {
		const huge = '>'.repeat(40_000);
		expect(() => parseBlocks(huge)).not.toThrow();
		expect(() => lex(huge)).not.toThrow();
	});
});
