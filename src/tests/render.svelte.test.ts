import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '$lib/Streamdown.svelte';

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
});
