/**
 * Streaming performance benchmark — overall stage breakdown & O(N²) scaling.
 *
 * Models what the component does per streamed chunk (see _perf-harness.ts).
 * Measures only the PARSING layer (what a custom parser would replace);
 * Shiki highlighting and Svelte reconciliation are separate, browser-side costs.
 *
 *   npm run test:unit -- src/tests/streaming-perf.spec.ts --run
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, test, expect } from 'vitest';
import { ms, pct, simulateStream, warmup } from './_perf-harness.js';

// A representative "LLM chat answer": prose + heading + inline formatting +
// a bullet list + a fenced code block + a small table.
const TYPICAL_CHAT = `## Setting up the parser

To get started, install the dependencies and import the \`Streamdown\` component.
It handles **incomplete markdown** gracefully while *tokens* are still arriving,
so you never see a flash of raw \`**\` or broken [links](https://example.com).

Here are the key points to keep in mind:

- Blocks are parsed independently so only the **last** one re-renders.
- The incomplete-markdown pass closes dangling emphasis, code spans and links.
- Code blocks are highlighted lazily with Shiki.

\`\`\`ts
import { Streamdown } from 'svelte-streamdown';

const tokens = lex(content);
for (const token of tokens) {
  render(token);
}
\`\`\`

A quick comparison of the approaches:

| Approach        | Bundle | Speed   | Maintenance |
| --------------- | ------ | ------- | ----------- |
| marked + plugins | small  | fast    | low         |
| custom parser    | small  | fast?   | high        |

> The takeaway: measure before you rewrite. The lexer is rarely the bottleneck.

That's the gist — the rest is wiring and theming.
`;

function loadReadme(): string | null {
	for (const p of ['README.md', 'src/README.md']) {
		const abs = path.resolve(p);
		if (fs.existsSync(abs)) return fs.readFileSync(abs, 'utf8');
	}
	return null;
}

describe('streaming parse — stage breakdown', () => {
	test('typical chat answer, ~4-char (≈1 token) chunks', { timeout: 120_000 }, () => {
		warmup(TYPICAL_CHAT);
		const r = simulateStream('typical chat', TYPICAL_CHAT, 4);

		console.log(
			[
				'',
				'━━━ STAGE BREAKDOWN — typical chat answer ━━━━━━━━━━━━━━━━━━━━━━━━━',
				`doc size: ${r.docLen} chars   chunks streamed: ${r.chunks}   (≈4 chars/chunk)`,
				'',
				`  parseBlocks (FULL doc, every chunk) : ${ms(r.parseBlocksMs)}   ${pct(r.parseBlocksMs, r.totalMs)}`,
				`  parseIncompleteMarkdown (changed)   : ${ms(r.incompleteMs)}   ${pct(r.incompleteMs, r.totalMs)}`,
				`  lex (changed blocks)                : ${ms(r.lexMs)}   ${pct(r.lexMs, r.totalMs)}`,
				'  ' + '─'.repeat(58),
				`  TOTAL parsing cost for full stream  : ${ms(r.totalMs)}`,
				`  parse-once (static, for reference)  : ${ms(r.onceMs)}`,
				`  streaming overhead multiplier       : ${(r.totalMs / r.onceMs).toFixed(1)}×`,
				'',
				`  est. floor w/ incremental tail parse: ${ms(r.incrementalTailMs)}  (vs ${ms(r.parseBlocksMs)} full)`,
				`  → potential parseBlocks speedup     : ${(r.parseBlocksMs / Math.max(r.incrementalTailMs, 1e-4)).toFixed(1)}×`,
				'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
			].join('\n')
		);

		expect(r.totalMs).toBeGreaterThan(0);
		expect(r.chunks).toBeGreaterThan(10);
	});
});

describe('streaming parse — O(N²) scaling', () => {
	test('total stream cost vs document size', { timeout: 300_000 }, () => {
		const lines = [
			'',
			'━━━ SCALING — does per-stream cost grow super-linearly? ━━━━━━━━━━',
			'(stream at ~8 chars/chunk; O(N) per chunk ⇒ O(N²) total: ×2 size ⇒ ~×4 total)',
			'',
			'  size (chars) | chunks |  parseBlocks total |   total |  ms/chunk',
			'  ' + '─'.repeat(70)
		];
		let prevTotal = 0;
		for (const mult of [1, 2, 4, 8]) {
			const doc = TYPICAL_CHAT.repeat(mult);
			warmup(doc);
			const r = simulateStream(`×${mult}`, doc, 8);
			const note =
				prevTotal > 0 ? `   (×${(r.totalMs / prevTotal).toFixed(2)} total for ×2 size)` : '';
			lines.push(
				`  ${String(doc.length).padStart(11)} | ${String(r.chunks).padStart(6)} | ${ms(r.parseBlocksMs)} | ${ms(r.totalMs)} | ${(r.parseBlocksMs / r.chunks).toFixed(3)} ms${note}`
			);
			prevTotal = r.totalMs;
		}
		lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log(lines.join('\n'));
		expect(prevTotal).toBeGreaterThan(0);
	});
});

describe('streaming parse — per-chunk growth curve', () => {
	test('parseBlocks cost as the document grows', { timeout: 300_000 }, () => {
		const readme = loadReadme();
		const doc = readme && readme.length > 5000 ? readme : TYPICAL_CHAT.repeat(8);
		const label = readme && readme.length > 5000 ? 'README.md' : '8× chat answer';
		warmup(doc);
		const r = simulateStream(label, doc, 16);

		const s = r.growthSamples;
		const lines = [
			'',
			`━━━ GROWTH CURVE — parseBlocks(content) as content grows (${label}) ━━`,
			`doc size: ${doc.length} chars   chunks: ${r.chunks}`,
			'',
			'  content length |  parseBlocks ms (single call at that point)',
			'  ' + '─'.repeat(56)
		];
		for (let d = 0; d <= 10; d++) {
			const idx = Math.min(s.length - 1, Math.floor((d / 10) * (s.length - 1)));
			lines.push(
				`  ${String(s[idx].contentLen).padStart(14)} | ${s[idx].parseBlocksMs.toFixed(3).padStart(9)} ms`
			);
		}
		const first = s[0].parseBlocksMs;
		const last = s[s.length - 1].parseBlocksMs;
		lines.push('  ' + '─'.repeat(56));
		lines.push(`  last/first parseBlocks ratio: ${(last / Math.max(first, 1e-4)).toFixed(1)}×`);
		lines.push(
			`  full-stream parsing total: ${ms(r.totalMs)}   incremental-tail floor: ${ms(r.incrementalTailMs + r.incompleteMs + r.lexMs)}`
		);
		lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log(lines.join('\n'));
		expect(s.length).toBeGreaterThan(0);
	});
});
