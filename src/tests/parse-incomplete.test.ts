import { expect, describe, test } from 'vitest';
import { parseIncompleteMarkdown } from '../lib/utils/parse-incomplete-markdown.js';

// Direct unit tests for parseIncompleteMarkdown plugin branches that have no
// dedicated coverage in the element test files. Every expectation locks in
// behavior that is correct for streaming rendering today.

describe('parseIncompleteMarkdown direct coverage', () => {
	describe('descriptionList plugin', () => {
		test('should leave a lone colon line unchanged (no term content)', () => {
			// Handler requires content after the colon (/^(\s*):(.+)$/)
			expect(parseIncompleteMarkdown(':')).toBe(':');
		});

		test('should not treat a mid-line colon as a description list', () => {
			// Pattern is anchored to line start
			expect(parseIncompleteMarkdown('text : not dl')).toBe('text : not dl');
		});

		test('should complete inline formatting before appending the term colon', () => {
			// bold runs before descriptionList, so the term is completed first
			// and the colon lands after the closed bold, keeping the term renderable
			expect(parseIncompleteMarkdown(': **Term')).toBe(': **Term**:');
		});

		test('should complete a description list line that follows a paragraph', () => {
			expect(parseIncompleteMarkdown('one\n\n: Term')).toBe('one\n\n: Term:');
		});
	});

	describe('blockMath plugin and math block boundaries', () => {
		test('should close a math block opened at line start with content on the same line', () => {
			// The opening line toggles the math context, so contextManager appends
			// the closing $$ on its own line
			expect(parseIncompleteMarkdown('$$E=mc^2')).toBe('$$E=mc^2\n$$');
		});

		test('should close a lone $$ opener as an empty math block', () => {
			// Consistent with lone code fences (see contextManager tests below)
			expect(parseIncompleteMarkdown('$$')).toBe('$$\n$$');
		});

		test('should leave balanced inline $$ pairs unchanged', () => {
			expect(parseIncompleteMarkdown('a $$x$$ b')).toBe('a $$x$$ b');
			expect(parseIncompleteMarkdown('$$x$$ trailing')).toBe('$$x$$ trailing');
		});
	});

	describe('inlineMath currency heuristics', () => {
		test('should not complete a single dollar directly followed by a digit', () => {
			// $5 is currency, not an unclosed math opener (odd raw dollar count)
			expect(parseIncompleteMarkdown('It costs $5 now')).toBe('It costs $5 now');
		});

		test('should not complete a trailing dollar at end of line', () => {
			expect(parseIncompleteMarkdown('Total: 199$')).toBe('Total: 199$');
		});

		test('should not count escaped dollars', () => {
			expect(parseIncompleteMarkdown('escaped \\$ here')).toBe('escaped \\$ here');
		});

		test('should not complete two currency amounts in one line', () => {
			expect(parseIncompleteMarkdown('Save $5 vs $10 deal')).toBe('Save $5 vs $10 deal');
		});
	});

	describe('superscript edge cases', () => {
		test('should not count escaped carets', () => {
			expect(parseIncompleteMarkdown('escape \\^ here')).toBe('escape \\^ here');
		});

		test('should not complete a caret inside a footnote reference', () => {
			expect(parseIncompleteMarkdown('note[^1] text')).toBe('note[^1] text');
		});

		test('should leave a caret inside unclosed inline math to the math completer', () => {
			// superscript skips carets in an open math span; inlineMath then closes it
			expect(parseIncompleteMarkdown('value $x^2')).toBe('value $x^2$');
		});

		test('should leave balanced superscript pairs unchanged', () => {
			expect(parseIncompleteMarkdown('x^2^ and y^3^')).toBe('x^2^ and y^3^');
		});
	});

	describe('subscript edge cases', () => {
		test('should not count escaped tildes', () => {
			expect(parseIncompleteMarkdown('escape \\~ here')).toBe('escape \\~ here');
		});

		test('should complete a subscript after a balanced strikethrough pair', () => {
			// ~~strike~~ consumes its tildes; the lone trailing subscript still completes
			expect(parseIncompleteMarkdown('~~strike~~ and H~2')).toBe('~~strike~~ and H~2~');
		});

		test('should leave a tilde inside unclosed inline math to the math completer', () => {
			expect(parseIncompleteMarkdown('value $a~b')).toBe('value $a~b$');
		});

		test('should leave balanced subscript pairs unchanged', () => {
			expect(parseIncompleteMarkdown('H~2~O and CO~2~')).toBe('H~2~O and CO~2~');
		});
	});

	describe('mdx incomplete tags', () => {
		test('should leave a complete single-line paired component unchanged', () => {
			expect(parseIncompleteMarkdown('<Note>hi</Note>')).toBe('<Note>hi</Note>');
		});

		test('should leave a complete single-line paired component with trailing text unchanged', () => {
			expect(parseIncompleteMarkdown('<Note>hi</Note> tail text')).toBe(
				'<Note>hi</Note> tail text'
			);
		});

		test('should close an unclosed component that follows a closed code fence', () => {
			expect(parseIncompleteMarkdown('```\nx\n```\n<Card>\nhi')).toBe(
				'```\nx\n```\n<Card>\nhi\n</Card>'
			);
		});
	});

	describe('contextManager block completion', () => {
		test('should close a lone opening fence as an empty code block', () => {
			expect(parseIncompleteMarkdown('```')).toBe('```\n```');
		});

		test('should close an opening fence that has an info string', () => {
			expect(parseIncompleteMarkdown('```js')).toBe('```js\n```');
		});
	});
});
