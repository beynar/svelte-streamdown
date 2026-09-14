import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '$lib/Streamdown.svelte';
import Math from '$lib/Elements/Math.svelte';
import Code from '$lib/Elements/Code.svelte';

// Rendered output, not just the token stream: these three used to produce
// nothing (escapes), drop content (html with renderHtml off) or ignore the
// prop entirely (parseIncompleteMarkdown).
const text = (content: string, props: Record<string, unknown> = {}) => {
	const { container } = render(Streamdown, { content, ...props });
	return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
};

describe('rendering', () => {
	test('renders escaped characters', () => {
		expect(text('a \\* b', { parseIncompleteMarkdown: false })).toBe('a * b');
	});

	test('renders escaped characters on the default completing path', () => {
		// This input used to pick up a stray trailing `*` from the completer
		// (upstream c347b53), so the escape fix could only be asserted with
		// completion off. That is fixed too now, so assert what users get.
		expect(text('a \\* b')).toBe('a * b');
	});

	test('renders a comparison operator that opens a list item', () => {
		// Cross-lane seam: the completer escapes the `>` so it is not lexed as a
		// blockquote (upstream 4fffb9f), and that escape only reaches the screen
		// because the escape branch renders (upstream 6bb03ca). Neither fix is
		// visible to a user without the other.
		expect(text('- > 25: rich')).toBe('> 25: rich');
	});

	test('shows raw html literally when renderHtml is off', () => {
		expect(text('<h2>heading</h2>')).toBe('<h2>heading</h2>');
	});

	test('completes incomplete markdown by default', () => {
		expect(text('**bold')).toBe('bold');
	});

	test('leaves incomplete markdown alone when the prop is false', () => {
		expect(text('**bold', { parseIncompleteMarkdown: false })).toBe('**bold');
	});

	// KaTeX is the opt-in math component, and it imports katex lazily, so the
	// markup only appears after the dynamic import resolves.
	const katex = async (content: string) => {
		const { container } = render(Streamdown, { content, components: { math: Math } });
		await vi.waitFor(() => {
			expect(container.querySelector('.katex')).not.toBeNull();
		});
		return container;
	};

	test('renders \\(..\\) through KaTeX like $..$', async () => {
		const paren = await katex(String.raw`\(x^2\)`);
		const dollar = await katex('$x^2$');
		expect(paren.querySelector('[data-streamdown-inline-math]')).not.toBeNull();
		expect(paren.querySelector('.katex-display')).toBeNull();
		expect(paren.querySelector('.katex')?.innerHTML).toBe(
			dollar.querySelector('.katex')?.innerHTML
		);
	});

	test('renders \\[..\\] through KaTeX like $$..$$', async () => {
		const bracket = await katex('\\[\nx^2\n\\]');
		const dollars = await katex('$$\nx^2\n$$');
		expect(bracket.querySelector('[data-streamdown-block-math]')).not.toBeNull();
		expect(bracket.querySelector('.katex-display')).not.toBeNull();
		expect(bracket.querySelector('.katex')?.innerHTML).toBe(
			dollars.querySelector('.katex')?.innerHTML
		);
	});
});

// While a fence is still streaming, its content changes on every chunk. The flag
// lets the code block defer expensive work (highlighting, mermaid.render) and
// lets CSS show a loading state; it can only ever be true for the last block.
const incompleteAttr = (container: HTMLElement, selector = '[data-streamdown-code]') =>
	container.querySelector(selector)?.getAttribute('data-incomplete') ?? null;

describe('streaming fence signal', () => {
	test('marks the open fence incomplete and clears it on the closing chunk', async () => {
		const { container, rerender } = render(Streamdown, { content: '```ts\nconst a = 1;' });
		expect(incompleteAttr(container)).toBe('true');

		await rerender({ content: '```ts\nconst a = 1;\n```' });
		expect(incompleteAttr(container)).toBe(null);
	});

	test('only the last block is incomplete', async () => {
		const { container } = render(Streamdown, {
			content: '```ts\nconst a = 1;\n```\n\n```js\nconst b = 2;'
		});
		const blocks = container.querySelectorAll('[data-streamdown-code]');
		expect(Array.from(blocks, (block) => block.getAttribute('data-incomplete'))).toEqual([
			null,
			'true'
		]);
	});

	test('a static render never marks anything incomplete', () => {
		const { container } = render(Streamdown, { content: '```ts\nconst a = 1;', static: true });
		expect(incompleteAttr(container)).toBe(null);
	});

	test('reaches a mermaid block', () => {
		const { container } = render(Streamdown, { content: '```mermaid\ngraph TD;\n  A-->B' });
		expect(incompleteAttr(container, '[data-streamdown-mermaid]')).toBe('true');
	});

	test('reaches the full code component', () => {
		const { container } = render(Streamdown, {
			content: '```ts\nconst a = 1;',
			components: { code: Code }
		});
		expect(incompleteAttr(container)).toBe('true');
	});
});

describe('streaming animation', () => {
	const animated = (container: Element) =>
		container.querySelectorAll('[style*="animation-name"]').length;

	test('animates streamed appends but not a replacement or a paste-sized append', async () => {
		const { container, rerender } = render(Streamdown, {
			content: 'Hello',
			animation: { enabled: true, animateOnMount: true }
		});
		expect(animated(container), 'first render animates with animateOnMount').toBeGreaterThan(0);

		await rerender({ content: 'Hello world again' });
		expect(animated(container), 'a streamed append animates').toBeGreaterThan(0);

		await rerender({ content: 'A completely different document.' });
		expect(animated(container), 'a replacement renders plain').toBe(0);

		await rerender({ content: 'A completely different document. Streaming on.' });
		expect(animated(container), 'the next streamed append animates again').toBeGreaterThan(0);

		// Show All in the demo: a prefix followed by the whole document at once. It
		// is an append, but one that used to start ~10k CSS animations in a frame.
		// The untouched first paragraph is not re-rendered, so it keeps the spans
		// it already had; what must be plain is the block the bulk append added.
		const before = animated(container);
		const bulk =
			'A completely different document. Streaming on.\n\n' + 'More prose here.\n'.repeat(300);
		await rerender({ content: bulk });
		const paragraphs = container.querySelectorAll('[data-streamdown-paragraph]');
		const added = paragraphs[paragraphs.length - 1];
		expect(added.textContent, 'the bulk block rendered').toContain('More prose here.');
		expect(animated(added), 'a paste-sized append renders plain').toBe(0);
		expect(animated(container), 'no new animated spans anywhere').toBeLessThanOrEqual(before);
	});
});
