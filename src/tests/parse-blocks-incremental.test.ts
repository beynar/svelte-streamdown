import { expect, describe, test } from 'vitest';
import { parseBlocks, createParseBlocksCache } from '../lib/marked/index.js';

// Property: streaming a document through parseBlocks with an incremental cache
// must yield exactly the same block list as a fresh full parse, at EVERY chunk.
// Fixtures deliberately cover constructs that change shape as they stream in
// (tables forming from a paragraph, setext headings, fences swallowing lines,
// footnote definitions with continuations, alignment blocks, mdx components).

const FIXTURES: Record<string, string> = {
	'prose and inline': `Hello **world**, this is a paragraph with [a link](https://example.com).

Another paragraph with \`code\` and *emphasis* spanning
two lines.

Final short one.`,

	'unordered and ordered lists': `Intro line.

- item one with **bold**
- item two
  - nested a
  - nested b
- item three

1. first
2. second
   continued line
3. third`,

	'table forming row by row': `Some intro paragraph.

| Name | Age | City |
|------|-----|------|
| Ada  | 36  | London |
| Alan | 41  | Wilmslow |

Trailing paragraph.`,

	'setext heading': `Title line
==========

Body paragraph under the setext heading.

Subtitle
--------

More text.`,

	'fenced code with blank lines': `Before the fence.

\`\`\`ts
const a = 1;

function f() {
	return a;
}
\`\`\`

After the fence.`,

	'footnote definition with continuation': `Text with a footnote[^1] reference.

[^1]: First line of the footnote.
    Continued indented line.
    And another one.

Paragraph after the definition.`,

	'alignment blocks': `[center]
Centered **content** here.
[/center]

Middle paragraph.

[right]
Right-aligned line.
[/right]`,

	'blockquote alert': `> [!NOTE]
> This is an alert with **bold** text.
> Second line of the alert.

Plain paragraph after.`,

	'mdx component': `Intro.

<Card title="Hello">
Some inner content.
</Card>

Outro paragraph.`,

	'hr between paragraphs': `First paragraph.

---

Second paragraph.

***

Third.`
};

const streamAndCompare = (doc: string, chunkSize: number) => {
	const cache = createParseBlocksCache();
	for (let end = chunkSize; ; end += chunkSize) {
		const content = doc.slice(0, Math.min(end, doc.length));
		const incremental = parseBlocks(content, [], cache);
		const full = parseBlocks(content);
		expect(incremental).toEqual(full);
		if (end >= doc.length) break;
	}
};

describe('parseBlocks incremental cache equivalence', () => {
	for (const [name, doc] of Object.entries(FIXTURES)) {
		test(`matches full parse at every chunk — ${name} (3-char chunks)`, () => {
			streamAndCompare(doc, 3);
		});
		test(`matches full parse at every chunk — ${name} (7-char chunks)`, () => {
			streamAndCompare(doc, 7);
		});
	}

	test('falls back to a full parse on non-append updates', () => {
		const cache = createParseBlocksCache();
		const grown = parseBlocks('First paragraph.\n\nSecond paragraph.', [], cache);
		expect(grown.length).toBe(2);
		// Shrink the content (progress slider moved backwards) — must not reuse
		// sealed blocks from the longer document.
		const shrunk = parseBlocks('First par', [], cache);
		expect(shrunk).toEqual(parseBlocks('First par'));
		// And growing again from the shrunk state stays consistent.
		const regrown = parseBlocks('First par\n\nnew tail', [], cache);
		expect(regrown).toEqual(parseBlocks('First par\n\nnew tail'));
	});

	test('documents with tabs fall back safely (lexer normalizes raws)', () => {
		const doc = 'Para one.\n\n\tindented code line\n\tmore code\n\nPara two.';
		const cache = createParseBlocksCache();
		for (let end = 4; ; end += 4) {
			const content = doc.slice(0, Math.min(end, doc.length));
			expect(parseBlocks(content, [], cache)).toEqual(parseBlocks(content));
			if (end >= doc.length) break;
		}
	});

	test('same cache object across many appends stays internally consistent', () => {
		const cache = createParseBlocksCache();
		let doc = '';
		for (let i = 1; i <= 30; i++) {
			doc += `Paragraph number ${i} with some text.\n\n`;
			expect(parseBlocks(doc, [], cache)).toEqual(parseBlocks(doc));
		}
	});
});
