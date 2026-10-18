import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '$lib/Streamdown.svelte';
import Math from '$lib/Elements/Math.svelte';
import Code from '$lib/Elements/Code.svelte';
import { theme } from '$lib/theme.js';

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
// lets the code block defer expensive work (highlighting) and
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

describe('line numbers', () => {
	const pre = (container: Element) => container.querySelector('pre') as HTMLPreElement;
	const firstLine = (container: Element) =>
		container.querySelector('pre > code > span') as HTMLSpanElement;

	test('are off unless asked for', () => {
		const { container } = render(Streamdown, { content: '```ts\nconst a = 1;\n```' });
		expect(pre(container).hasAttribute('data-line-numbers')).toBe(false);
		expect(getComputedStyle(firstLine(container), '::before').content).toBe('none');
	});

	test('number the existing per-line span with a counter, adding no element', () => {
		const { container } = render(Streamdown, {
			content: '```ts\nconst a = 1;\nconst b = 2;\n```',
			lineNumbers: true
		});
		const lines = container.querySelectorAll('pre > code > span');
		expect(lines).toHaveLength(2);
		expect(pre(container).getAttribute('data-line-numbers')).toBe('true');
		expect(pre(container).style.counterReset).toBe('sd-line 0');
		expect(lines[0].className).toContain(theme.code.lineNumber);
		// Chrome reports the counter unresolved, which is the proof it is a counter
		// and not text baked into the DOM.
		expect(getComputedStyle(lines[0], '::before').content).toBe('counter(sd-line)');
		expect(getComputedStyle(lines[1], '::before').content).toBe('counter(sd-line)');
	});

	test('start at startLine=N', () => {
		const { container } = render(Streamdown, {
			content: '```ts startLine=10\nconst a = 1;\n```',
			lineNumbers: true
		});
		expect(pre(container).style.counterReset).toBe('sd-line 9');
	});

	test('a noLineNumbers fence opts out on its own block only', () => {
		const { container } = render(Streamdown, {
			content: '```ts noLineNumbers\nconst a = 1;\n```\n\n```ts\nconst b = 2;\n```',
			lineNumbers: true
		});
		const pres = container.querySelectorAll('pre');
		expect(pres[0].hasAttribute('data-line-numbers')).toBe(false);
		expect(getComputedStyle(pres[0].querySelector('span')!, '::before').content).toBe('none');
		expect(pres[1].getAttribute('data-line-numbers')).toBe('true');
	});

	test('a lineNumbers fence opts in while the prop is off', () => {
		const { container } = render(Streamdown, {
			content: '```ts lineNumbers\nconst a = 1;\n```'
		});
		expect(pre(container).getAttribute('data-line-numbers')).toBe('true');
	});

	test('the full code component numbers its highlighted lines too', () => {
		const { container } = render(Streamdown, {
			content: '```ts startLine=5\nconst a = 1;\n```',
			lineNumbers: true,
			components: { code: Code }
		});
		expect(pre(container).style.counterReset).toBe('sd-line 4');
		expect(getComputedStyle(firstLine(container), '::before').content).toBe('counter(sd-line)');
	});

	test('a long line keeps one number and the horizontal scroll from 4.1.0', () => {
		const { container } = render(Streamdown, {
			content: '```ts\nconst a = "' + 'x'.repeat(400) + '";\n```',
			lineNumbers: true
		});
		// One counter per logical line, wrapped or scrolled: the ::before lives
		// inside the line span, so nothing is added per visual row.
		expect(container.querySelectorAll('pre > code > span')).toHaveLength(1);
		// 4.1.0's scroll container is untouched (Tailwind is not loaded here, so
		// assert the class the theme puts on the pre, not the computed overflow).
		expect(pre(container).className).toContain('overflow-x-auto');
	});

	test('copy still yields the code, never the numbers', async () => {
		const writeText = vi.fn(async () => {});
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		const { container } = render(Streamdown, {
			content: '```ts startLine=10\nconst a = 1;\nconst b = 2;\n```',
			lineNumbers: true,
			components: { code: Code }
		});
		const button = container.querySelector('button[aria-label="Copy code"]') as HTMLButtonElement;
		button.click();
		await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('const a = 1;\nconst b = 2;'));
		// The DOM carries no digits either: the gutter is pseudo-content (the line
		// breaks come from the span being display:block, not from text).
		expect(container.querySelector('pre')!.textContent).toBe('const a = 1;const b = 2;');
	});
});

// fb9f97c / b392fbe / 3e6a77d / 7f9127b — the raw-HTML-while-streaming trio, end
// to end, because each one only reaches the screen through the whole pipeline.
describe('raw html while streaming', () => {
	test('a listed lowercase tag renders its markdown instead of its source', () => {
		expect(text('<ai-thinking>\n**bold**\n</ai-thinking>')).toBe(
			'<ai-thinking> **bold** </ai-thinking>'
		);
		expect(text('<ai-thinking>\n**bold**\n</ai-thinking>', { customTags: ['ai-thinking'] })).toBe(
			'bold'
		);
	});

	test('literalTagContent renders the underscores literally', () => {
		expect(
			text('<mention user_id="1">@_name_</mention>', {
				customTags: ['mention'],
				literalTagContent: ['mention']
			})
		).toBe('@_name_');
		// Without it the same content is parsed as markdown and the `_` disappear.
		expect(text('<mention user_id="1">@_name_</mention>', { customTags: ['mention'] })).toBe(
			'@name'
		);
	});

	test('a key of mdxComponents is allowlisted without customTags', () => {
		// No component registered for the key: the tag still becomes an mdx token,
		// so its children are parsed markdown instead of literal source.
		expect(
			text('<mention>\n**x**\n</mention>', { mdxComponents: { mention: undefined as never } })
		).toBe('x');
		expect(text('<mention>\n**x**\n</mention>')).toBe('<mention> **x** </mention>');
	});

	test('a half-typed tag does not flash while it streams in', () => {
		expect(text('Hello <div cla')).toBe('Hello');
		expect(text('<div>hi</'), 'even before the closing name is typed').toBe('<div>hi');
		expect(text('The answer is <ai-thin', { customTags: ['ai-thinking'] })).toBe('The answer is');
		// …but a sealed block keeps its tail: only the last block is live.
		expect(text('Hello <div cla\n\nnext paragraph')).toBe('Hello <div clanext paragraph');
	});

	test('normalizeHtmlIndentation rescues indented html from a code box', () => {
		const doc =
			'<div class="wrapper">\n\n    <div class="inner">\n        Title Two\n    </div>\n\n</div>';
		// The streaming path already dodges this: `Block` trims each block, and an
		// indented code block always starts one. `static` and
		// `parseIncompleteMarkdown={false}` do not trim, so there the indented half
		// really is a code block and its markup shows up as text.
		for (const mode of [{ static: true }, { parseIncompleteMarkdown: false }]) {
			expect(text(doc, { renderHtml: true, ...mode })).toContain('<div class="inner">');
			expect(text(doc, { renderHtml: true, normalizeHtmlIndentation: true, ...mode })).toBe(
				'Title Two'
			);
		}
	});
});
