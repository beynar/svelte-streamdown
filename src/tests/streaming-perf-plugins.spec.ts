/**
 * Per-plugin streaming benchmark.
 *
 * Each corpus heavily exercises ONE plugin's syntax (authentic forms taken from
 * the test suite), normalized to ~the same size, streamed at the same chunk rate.
 * This answers: does any element type change the picture — does some plugin make
 * parseIncompleteMarkdown or lex dominate, or is any plugin pathologically slow?
 *
 *   npm run test:unit -- src/tests/streaming-perf-plugins.spec.ts --run
 */
import { describe, test, expect } from 'vitest';
import { ms, pct, simulateStream, warmup, repeatToSize } from './_perf-harness.js';

const TARGET = 2000; // chars per corpus, so per-element numbers are comparable
const CHUNK = 8; // ~2 tokens per chunk

// Authentic per-plugin syntax units. `{i}` is replaced with an incrementing
// number so repeated units aren't byte-identical.
const UNITS: Record<string, string> = {
	headings: `# Heading {i}\n\n## Sub {i}\n\n### Sub-sub {i} with some trailing words here`,
	'inline-emphasis': `Para {i} with **bold**, *italic*, \`code\`, ~~strike~~, __under__ and _emph_ mixed together in one line.`,
	'list-nested': `- Item {i} with **bold**\n  - nested *italic*\n  - nested \`code\`\n- [ ] task {i}\n- [x] done {i}`,
	'list-ordered': `1. First {i}\n2. Second {i} with [a link](https://example.com)\n3. Third {i}`,
	blockquote: `> Quote {i} with **bold** and a [link](https://example.com).\n> Second line of quote {i}.`,
	'code-block': `\`\`\`ts\n// block {i}\nconst x{i} = lex(content);\nfor (const t of x{i}) render(t);\n\`\`\``,
	table: `| **A{i}** | *B* | \`C\` |\n|:----|:---:|----:|\n| L{i} | [x](https://e.com) | R |\n| a | b | c |`,
	'math-inline-block': `Inline $E = mc^2$ and $\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$ then a block:\n\n$$\n\\alpha + \\beta = \\gamma_{i}\n$$`,
	footnotes: `Text {i} with a footnote[^{i}] and another[^note{i}].\n\n[^{i}]: The footnote {i} content.\n[^note{i}]: Named {i}.`,
	alerts: `> [!NOTE]\n> Note {i} with **bold**.\n\n> [!WARNING]\n> Warning {i} body text here.`,
	'sub-sup': `Water is H~2~O and energy E^{i}^ plus more ~sub{i}~ and ^sup{i}^ inline tokens here.`,
	'description-list': `: Term {i}: Description {i} with **bold**\n: Second {i}: Another description {i}`,
	alignment: `[center]\nCentered {i} text with **bold**.\n[/center]\n\n[right]\nRight {i} aligned.\n[/right]`,
	citations: `Sentence {i} with citations [1] [2] [{i}] and a named one [ref{i}] plus [ref, ref2] grouped.`,
	mdx: `<Card title="Card {i}" count={{i}}>\nInner **content** {i}.\n</Card>\n\n<Counter count={{i}} />`,
	'links-images': `See [link {i}](https://example.com/page{i}) and ![alt {i}](https://example.com/img{i}.png) inline.`,
	hr: `Section {i} intro text.\n\n---\n\nSection {i} after the rule with some words.`
};

describe('streaming parse — per plugin', () => {
	test('stage breakdown for each markdown element type', { timeout: 600_000 }, () => {
		const rows = Object.entries(UNITS).map(([name, unit]) => {
			const doc = repeatToSize(unit, TARGET);
			warmup(doc);
			return simulateStream(name, doc, CHUNK);
		});

		const lines: string[] = [
			'',
			'━━━ PER-PLUGIN STAGE BREAKDOWN (each corpus ≈2KB, streamed @8 chars/chunk) ━━━',
			'',
			'  element            |   total |  parseBlocks |  incomplete |        lex | dominant',
			'  ' + '─'.repeat(86)
		];
		for (const r of rows.sort((a, b) => b.totalMs - a.totalMs)) {
			const stages: [string, number][] = [
				['parseBlocks', r.parseBlocksMs],
				['incomplete', r.incompleteMs],
				['lex', r.lexMs]
			];
			const dominant = stages.sort((a, b) => b[1] - a[1])[0][0];
			lines.push(
				`  ${r.label.padEnd(18)} | ${ms(r.totalMs)} | ${pct(r.parseBlocksMs, r.totalMs)} ${ms(r.parseBlocksMs)} | ${pct(r.incompleteMs, r.totalMs)} | ${pct(r.lexMs, r.totalMs)} ${ms(r.lexMs)} | ${dominant}`
			);
		}
		lines.push('  ' + '─'.repeat(86));

		// Per-corpus normalized cost so an absurdly slow plugin stands out.
		const slowest = [...rows].sort((a, b) => b.totalMs - a.totalMs)[0];
		const fastest = [...rows].sort((a, b) => a.totalMs - b.totalMs)[0];
		lines.push(
			`  slowest: ${slowest.label} (${ms(slowest.totalMs)})   fastest: ${fastest.label} (${ms(fastest.totalMs)})   spread: ${(slowest.totalMs / Math.max(fastest.totalMs, 1e-4)).toFixed(1)}×`
		);
		lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log(lines.join('\n'));

		expect(rows.length).toBe(Object.keys(UNITS).length);
		expect(slowest.totalMs).toBeGreaterThan(0);
	});
});

describe('streaming parse — kitchen sink', () => {
	test('all element types combined, streamed', { timeout: 300_000 }, () => {
		// One of each element, joined into one document, repeated to a realistic length.
		const oneOfEach = Object.values(UNITS)
			.map((u) => u.replace(/\{i\}/g, '1'))
			.join('\n\n');
		const doc = (oneOfEach + '\n\n').repeat(3);
		warmup(doc);
		const r = simulateStream('kitchen-sink', doc, CHUNK);

		console.log(
			[
				'',
				'━━━ KITCHEN SINK — every element type in one streamed document ━━━',
				`doc size: ${r.docLen} chars   chunks: ${r.chunks}`,
				'',
				`  parseBlocks (FULL doc, every chunk) : ${ms(r.parseBlocksMs)}   ${pct(r.parseBlocksMs, r.totalMs)}`,
				`  parseIncompleteMarkdown (changed)   : ${ms(r.incompleteMs)}   ${pct(r.incompleteMs, r.totalMs)}`,
				`  lex (changed blocks)                : ${ms(r.lexMs)}   ${pct(r.lexMs, r.totalMs)}`,
				'  ' + '─'.repeat(58),
				`  TOTAL parsing cost for full stream  : ${ms(r.totalMs)}`,
				`  parse-once (static, for reference)  : ${ms(r.onceMs)}   (${(r.totalMs / r.onceMs).toFixed(1)}× overhead)`,
				`  est. floor w/ incremental tail parse: ${ms(r.incrementalTailMs + r.incompleteMs + r.lexMs)}  (→ ${(r.totalMs / Math.max(r.incrementalTailMs + r.incompleteMs + r.lexMs, 1e-4)).toFixed(1)}× faster)`,
				'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
			].join('\n')
		);
		expect(r.totalMs).toBeGreaterThan(0);
	});
});
