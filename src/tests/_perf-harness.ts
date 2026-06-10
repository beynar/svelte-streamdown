/**
 * Shared benchmark harness (not a test file — no `.test`/`.spec` suffix so vitest
 * won't collect it). Models exactly what the Svelte component does per streamed
 * chunk and times each stage of the parsing layer.
 *
 *   1. parseBlocks(fullContentSoFar)            -> runs EVERY chunk over the WHOLE doc
 *   2. for each block whose raw string changed  -> parseIncompleteMarkdown(block) then lex(block)
 *      vs the previous chunk, by index (mirrors `{#each blocks as block, i (key)}`).
 */
import { performance } from 'node:perf_hooks';
import { lex, parseBlocks, createParseBlocksCache } from '../lib/marked/index.js';
import { parseIncompleteMarkdown } from '../lib/utils/parse-incomplete-markdown.js';

export function ms(n: number): string {
	return n.toFixed(2).padStart(9) + ' ms';
}
export function pct(part: number, whole: number): string {
	return ((part / Math.max(whole, 1e-9)) * 100).toFixed(1).padStart(5) + '%';
}

export type StreamResult = {
	label: string;
	docLen: number;
	chunks: number;
	parseBlocksMs: number;
	incompleteMs: number;
	lexMs: number;
	totalMs: number;
	onceMs: number;
	growthSamples: { contentLen: number; parseBlocksMs: number }[];
	incrementalTailMs: number;
};

/** Reveal `full` in `chunkChars` increments, running the per-chunk work each step. */
export function simulateStream(label: string, full: string, chunkChars: number): StreamResult {
	let prevBlocks: string[] = [];
	let parseBlocksMs = 0;
	let incompleteMs = 0;
	let lexMs = 0;
	let incrementalTailMs = 0;
	let chunks = 0;
	let sealedPrefixLen = 0;
	const growthSamples: { contentLen: number; parseBlocksMs: number }[] = [];
	// Mirrors the component: one incremental cache per Streamdown instance.
	const blocksCache = createParseBlocksCache();

	for (let end = chunkChars; ; end += chunkChars) {
		const content = full.slice(0, Math.min(end, full.length));
		chunks++;

		// (1) Per-chunk block split — incremental on append, like the component.
		const t0 = performance.now();
		const blocks = parseBlocks(content, [], blocksCache);
		const t1 = performance.now();
		parseBlocksMs += t1 - t0;
		growthSamples.push({ contentLen: content.length, parseBlocksMs: t1 - t0 });

		// (1b) ESTIMATE: cost if we only re-parsed the unsealed tail. Directional floor.
		const tail = content.slice(sealedPrefixLen);
		const ti0 = performance.now();
		parseBlocks(tail);
		incrementalTailMs += performance.now() - ti0;
		if (blocks.length > 1) {
			const lastLen = blocks[blocks.length - 1].length;
			sealedPrefixLen = Math.max(0, content.length - lastLen);
		}

		// (2) incomplete-parse + lex only for blocks whose string changed (by index).
		for (let b = 0; b < blocks.length; b++) {
			if (blocks[b] !== prevBlocks[b]) {
				const s0 = performance.now();
				const repaired = parseIncompleteMarkdown(blocks[b].trim());
				const s1 = performance.now();
				lex(repaired);
				const s2 = performance.now();
				incompleteMs += s1 - s0;
				lexMs += s2 - s1;
			}
		}

		prevBlocks = blocks;
		if (end >= full.length) break;
	}

	return {
		label,
		docLen: full.length,
		chunks,
		parseBlocksMs,
		incompleteMs,
		lexMs,
		totalMs: parseBlocksMs + incompleteMs + lexMs,
		onceMs: parseOnce(full),
		growthSamples,
		incrementalTailMs
	};
}

/** Cost to parse the document exactly once (the non-streaming path). */
export function parseOnce(full: string): number {
	const t0 = performance.now();
	const blocks = parseBlocks(full);
	for (const b of blocks) lex(parseIncompleteMarkdown(b.trim()));
	return performance.now() - t0;
}

export function warmup(text: string) {
	for (let i = 0; i < 3; i++) {
		const blocks = parseBlocks(text);
		for (const b of blocks) lex(parseIncompleteMarkdown(b.trim()));
	}
}

/** Repeat a unit (separated by blank lines so units form distinct blocks) up to ~targetChars. */
export function repeatToSize(unit: string, targetChars: number): string {
	const sep = '\n\n';
	const parts: string[] = [];
	let len = 0;
	let i = 0;
	while (len < targetChars) {
		// vary a number so repeated units aren't byte-identical (more realistic, avoids dedup)
		parts.push(unit.replace(/\{i\}/g, String(++i)));
		len += unit.length + sep.length;
	}
	return parts.join(sep);
}
