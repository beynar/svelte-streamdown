import { expect, describe, test } from 'vitest';
import { parseIncompleteMarkdown } from '../lib/utils/parse-incomplete-markdown.js';
import { lex } from '../lib/marked/index.js';

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

	describe('comparisonOperator plugin', () => {
		// 4fffb9f: '- > 25: rich' lexed as a blockquote nested in the list item, so a
		// price or P/E range lost its text to a quote block
		test('should escape a comparison operator in a list item', () => {
			expect(parseIncompleteMarkdown('- > 25: rich')).toBe('- \\> 25: rich');
			expect(parseIncompleteMarkdown('* > 25: rich')).toBe('* \\> 25: rich');
			expect(parseIncompleteMarkdown('+ > 25: rich')).toBe('+ \\> 25: rich');
			expect(parseIncompleteMarkdown('1. > 25: rich')).toBe('1. \\> 25: rich');
			expect(parseIncompleteMarkdown('2) > 10: high')).toBe('2) \\> 10: high');
			expect(parseIncompleteMarkdown('  - > 25: rich')).toBe('  - \\> 25: rich');
			expect(parseIncompleteMarkdown('- >= 10: high')).toBe('- \\>= 10: high');
			expect(parseIncompleteMarkdown('- >25: rich')).toBe('- \\>25: rich');
			expect(parseIncompleteMarkdown('- > $100: expensive')).toBe('- \\> $100: expensive');
		});

		test('should leave real blockquotes and prose alone', () => {
			expect(parseIncompleteMarkdown('> Some blockquote')).toBe('> Some blockquote');
			expect(parseIncompleteMarkdown('> 25 is a number')).toBe('> 25 is a number');
			expect(parseIncompleteMarkdown('- > Some quoted text')).toBe('- > Some quoted text');
			expect(parseIncompleteMarkdown('>25')).toBe('>25');
			expect(parseIncompleteMarkdown('- x > y')).toBe('- x > y');
			expect(parseIncompleteMarkdown('- a < b')).toBe('- a < b');
			expect(parseIncompleteMarkdown('```\n- > 25: in code\n```')).toBe(
				'```\n- > 25: in code\n```'
			);
		});

		test('should still complete inline formatting on the escaped line', () => {
			expect(parseIncompleteMarkdown('- > 25: **bold')).toBe('- \\> 25: **bold**');
		});

		test('should keep the inline-code mask aligned after the escape is inserted', () => {
			// The escape shifts every later position by one; a mask built from the
			// original line would judge the dangling '*' to be inside the code span.
			expect(parseIncompleteMarkdown('- > 25: *`x`')).toBe('- \\> 25: *`x`*');
			expect(parseIncompleteMarkdown('see *`x`')).toBe('see *`x`*');
		});

		test('should lex the escaped item as list text, not a nested blockquote', () => {
			const [list] = lex(parseIncompleteMarkdown('- > 25: rich')) as any[];
			expect(list.type).toBe('list');
			const [item] = list.tokens;
			expect(item.type).toBe('list_item');
			expect(item.tokens[0].tokens.map((t: any) => t.type)).toEqual(['escape', 'text']);
		});
	});

	describe('complete inline code spans', () => {
		// a725579: markers that already sit inside a closed `...` span are code, not
		// unterminated emphasis
		test('should not complete emphasis markers inside a complete code span', () => {
			expect(parseIncompleteMarkdown('`**bold`')).toBe('`**bold`');
			expect(parseIncompleteMarkdown('`*italic`')).toBe('`*italic`');
			expect(parseIncompleteMarkdown('`~~strikethrough`')).toBe('`~~strikethrough`');
			expect(parseIncompleteMarkdown('`__bold__ed`')).toBe('`__bold__ed`');
			expect(parseIncompleteMarkdown('`_italic`')).toBe('`_italic`');
		});

		test('should still complete markers outside the code span', () => {
			expect(parseIncompleteMarkdown('`code` **bold')).toBe('`code` **bold**');
			expect(parseIncompleteMarkdown('`code` *italic')).toBe('`code` *italic*');
			expect(parseIncompleteMarkdown('**bold')).toBe('**bold**');
			expect(parseIncompleteMarkdown('~~strike')).toBe('~~strike~~');
		});

		test('should still complete markers inside a half-typed code span', () => {
			// The span is not closed yet, so this is ordinary streaming text
			expect(parseIncompleteMarkdown('`code **bold')).toBe('`code **bold**`');
		});
	});

	describe('singleAsteriskItalic emphasis detection', () => {
		// c347b53: an asterisk with whitespace on both sides is arithmetic, not a marker
		test('should not treat a whitespace-flanked asterisk as an emphasis marker', () => {
			expect(parseIncompleteMarkdown('5 * 0')).toBe('5 * 0');
			expect(parseIncompleteMarkdown('x * y')).toBe('x * y');
			expect(parseIncompleteMarkdown('a * b = c')).toBe('a * b = c');
			expect(parseIncompleteMarkdown('3 + 2 - 5 * 0 = ?')).toBe('3 + 2 - 5 * 0 = ?');
			expect(parseIncompleteMarkdown('2 * 3 * 4')).toBe('2 * 3 * 4');
			expect(parseIncompleteMarkdown('* not emphasis *')).toBe('* not emphasis *');
		});

		test('should still complete real emphasis on a line that also multiplies', () => {
			expect(parseIncompleteMarkdown('5 * 0 and *italic')).toBe('5 * 0 and *italic*');
		});

		test('should still complete a list item that opens emphasis', () => {
			expect(parseIncompleteMarkdown('- *italic')).toBe('- *italic*');
		});

		// 9f96409: a trailing or intraword asterisk that cannot open emphasis is
		// literal text, not the first half of a closing '**'
		test('should not complete when the dangling asterisk cannot open emphasis', () => {
			expect(parseIncompleteMarkdown('*foo*bar*')).toBe('*foo*bar*');
			expect(parseIncompleteMarkdown('a *b* c*')).toBe('a *b* c*');
			expect(parseIncompleteMarkdown('*a* b*')).toBe('*a* b*');
			expect(parseIncompleteMarkdown('a *b*c* d')).toBe('a *b*c* d');
		});

		test('should still complete an intraword asterisk that opens emphasis', () => {
			expect(parseIncompleteMarkdown('*foo*bar*baz')).toBe('*foo*bar*baz*');
			expect(parseIncompleteMarkdown('before *a*b after *c')).toBe('before *a*b after *c*');
		});

		test('should leave balanced or lone intraword asterisks alone', () => {
			expect(parseIncompleteMarkdown('*foo*bar')).toBe('*foo*bar');
			expect(parseIncompleteMarkdown('this is *real*ly good')).toBe('this is *real*ly good');
			expect(parseIncompleteMarkdown('5*6*78')).toBe('5*6*78');
			expect(parseIncompleteMarkdown('foo*bar')).toBe('foo*bar');
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

		// e50b0c4: half of the closing '$$' can arrive on its own; adding a whole
		// '\n$$' left a literal '$' inside the math and '$$' after it
		test('should only add the missing dollar when the closer is half typed', () => {
			expect(parseIncompleteMarkdown('$$formula$')).toBe('$$formula$$');
			expect(parseIncompleteMarkdown('$$x = y$')).toBe('$$x = y$$');
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

		test('should ignore a dollar shown as inline code', () => {
			// The '$' in `$var` is code, so it must not flip the open/close parity
			expect(parseIncompleteMarkdown('Use `$var` for variables and $formula')).toBe(
				'Use `$var` for variables and $formula$'
			);
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

		// 716a5f0: '~x~' is a subscript only when x is non-empty and whitespace-free
		// and no digit precedes the opening tilde
		test('should not close a whitespace-flanked tilde', () => {
			expect(parseIncompleteMarkdown('hello ~ world')).toBe('hello ~ world');
			expect(parseIncompleteMarkdown('~x y')).toBe('~x y');
		});

		test('should not close a tilde that follows a digit', () => {
			// A range, not a subscript: closing it would manufacture one
			expect(parseIncompleteMarkdown('20~25°C')).toBe('20~25°C');
		});

		test('should not close a tilde inside a complete code span', () => {
			expect(parseIncompleteMarkdown('`20~25`')).toBe('`20~25`');
		});

		test('should still close a real streaming subscript', () => {
			expect(parseIncompleteMarkdown('H~2')).toBe('H~2~');
			expect(parseIncompleteMarkdown('x~i+1')).toBe('x~i+1~');
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

	// 8093f2a: LaTeX delimiters are a protected context. Every input here used to
	// be corrupted — a stray '_', '*^', or a '\[' turned into an incomplete link.
	describe('latex math as a protected context', () => {
		test('should not treat an underscore inside \\(..\\) as italic', () => {
			expect(parseIncompleteMarkdown(String.raw`\(P(x_{t+1})\)` + '\n\nplain trailing text.')).toBe(
				String.raw`\(P(x_{t+1})\)` + '\n\nplain trailing text.'
			);
		});

		test('should leave a \\[..\\] display block untouched', () => {
			const input = '\\[\nP(x_{t+1} | x_t)\n\\]';
			expect(parseIncompleteMarkdown(input)).toBe(input);
		});

		test('should not treat ^ and * inside \\(..\\) as emphasis', () => {
			expect(parseIncompleteMarkdown(String.raw`\(w^{*}\)` + '\n\nplain trailing text.')).toBe(
				String.raw`\(w^{*}\)` + '\n\nplain trailing text.'
			);
		});

		test('should still complete bold that follows latex in a blockquote', () => {
			const full = [
				String.raw`> Given tokens \(x_1, ..., x_t\), maximize \(P(x_{t+1} | x_1, ..., x_t)\)`,
				'',
				'**2. Instruction Tuning (SFT)**',
				'- Dataset size is much smaller than pre-training'
			].join('\n');
			const streamed = full.slice(0, full.indexOf('(SFT)') + '(SFT'.length);
			expect(parseIncompleteMarkdown(streamed)).toBe(streamed + '**');
		});

		test('should still complete ordinary italic outside latex on the same line', () => {
			expect(parseIncompleteMarkdown(String.raw`Inline math \(x_1\) and _ordinary italic`)).toBe(
				String.raw`Inline math \(x_1\) and _ordinary italic_`
			);
		});

		test('should still complete italic after a price on the same line', () => {
			// A lone '$100' is currency, so it must not open a math context that
			// would swallow the emphasis after it.
			expect(parseIncompleteMarkdown('costs $100 and *italic')).toBe('costs $100 and *italic*');
		});

		test('should not turn an escaped bracket into an incomplete link', () => {
			expect(parseIncompleteMarkdown(String.raw`a \[b`)).toBe(String.raw`a \[b\]`);
			expect(parseIncompleteMarkdown(String.raw`see \[x\] and [real link`)).toBe(
				String.raw`see \[x\] and [real link](streamdown:incomplete-link)`
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

describe('brackets inside a math span', () => {
	test('a bracket inside \\( .. \\) is notation, not a citation opener', () => {
		expect(parseIncompleteMarkdown('inline \\(a[b\\) tail')).toBe('inline \\(a[b\\) tail');
	});

	test('a real citation after a math span still completes', () => {
		expect(parseIncompleteMarkdown('\\(x\\) then [1')).toBe('\\(x\\) then [1]');
	});
});

describe('fences inside list items', () => {
	test('a complete fenced block in a "10." item or a nested bullet is left alone', () => {
		// The closer sits at column 4; it used to be invisible, so a stray fence was
		// appended and lex() grew an empty top-level code block after the list.
		const numbered = '10. ```js\n    code\n    ```';
		const nested = '- a\n  - ```js\n    code\n    ```';
		expect(parseIncompleteMarkdown(numbered)).toBe(numbered);
		expect(parseIncompleteMarkdown(nested)).toBe(nested);
	});

	test('an open nested fence is closed inside the item, not at column 0', () => {
		const result = parseIncompleteMarkdown('- a\n  - ```js\n    code');
		expect(result).toBe('- a\n  - ```js\n    code\n    ```');
		const codeTokens = (t: any[]): any[] =>
			t.flatMap((x) => [
				...(x.type === 'code' ? [x] : []),
				...codeTokens(x.tokens ?? []),
				...codeTokens((x.items ?? []).flatMap((i: any) => i.tokens ?? []))
			]);
		const tokens = lex(result);
		expect(
			tokens.some((t) => t.type === 'code'),
			'no stray top-level code block'
		).toBe(false);
		expect(codeTokens(tokens).length, 'exactly one code block, inside the item').toBe(1);
	});
});
