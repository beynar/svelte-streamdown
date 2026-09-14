import { expect, describe, test } from 'vitest';
import { normalizeHtmlIndentation } from '../lib/utils/normalize-html-indentation.js';
import { lex } from '../lib/marked/index.js';

// 7f9127b: four leading spaces after a blank line is an indented code block,
// HTML or not, so pretty-printed HTML splits into html / code / html and the
// indented part renders as source. Opt-in, because dedenting is lossy in <pre>.

const AUDIT_CASE = `<div class="wrapper">

    <div class="inner">
        <h2>Title Two</h2>
    </div>

</div>`;

describe('normalizeHtmlIndentation', () => {
	test('the audit case lexes as code before normalizing', () => {
		expect(lex(AUDIT_CASE).map((t) => t.type)).toEqual(['html', 'code', 'html']);
	});

	test('and as html after', () => {
		const tokens = lex(normalizeHtmlIndentation(AUDIT_CASE));

		expect(tokens.some((t) => t.type === 'code')).toBe(false);
		expect(tokens.map((t) => t.type)).toEqual(['html', 'html', 'html']);
		expect(normalizeHtmlIndentation(AUDIT_CASE)).toContain('<h2>Title Two</h2>');
	});

	test('leaves a <pre> body byte-for-byte', () => {
		const input = `<div>

    <pre>
        const x = 1;
          indented deeper
    </pre>

</div>`;

		expect(normalizeHtmlIndentation(input)).toBe(`<div>

<pre>
        const x = 1;
          indented deeper
    </pre>

</div>`);
	});

	test('leaves a <code> body alone too', () => {
		const input = '<div>\n\n    <code>\n        x\n    </code>\n\n</div>';

		expect(normalizeHtmlIndentation(input)).toContain('\n        x\n');
	});

	test('reopens dedenting after the literal block closes', () => {
		const input = '<div>\n    <pre>\n  keep\n    </pre>\n    <p>move</p>\n</div>';

		expect(normalizeHtmlIndentation(input)).toBe(
			'<div>\n<pre>\n  keep\n    </pre>\n<p>move</p>\n</div>'
		);
	});

	test('leaves indented prose alone', () => {
		const input = '<div>\n\n    just some indented words\n\n</div>';

		expect(normalizeHtmlIndentation(input)).toBe(input);
	});

	test('leaves a literal < that is not a tag alone', () => {
		const input = '<div>\n\n    3 < 5 and <- an arrow\n\n</div>';

		expect(normalizeHtmlIndentation(input)).toBe(input);
	});

	test('returns markdown by identity, same string object', () => {
		const md = '# Title\n\n    indented code\n\nmore';

		expect(normalizeHtmlIndentation(md)).toBe(md);
	});

	test('returns an already-flat document by identity, same string object', () => {
		const flat = '<div>\n<p>hi</p>\n</div>';

		expect(normalizeHtmlIndentation(flat)).toBe(flat);
	});

	test('handles the empty string and whitespace', () => {
		expect(normalizeHtmlIndentation('')).toBe('');
		expect(normalizeHtmlIndentation('   \n  ')).toBe('   \n  ');
	});

	test('dedents comments and doctypes as well as tags', () => {
		expect(normalizeHtmlIndentation('<div>\n\n    <!-- note -->\n\n</div>')).toBe(
			'<div>\n\n<!-- note -->\n\n</div>'
		);
	});
});
