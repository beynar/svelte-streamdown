/**
 * Quadratic guard for the completer.
 *
 * A single long line with many markers used to be scanned from character 0 for
 * every marker on it (and, for citations, rebuilt per bracket): a 16 KB line of
 * unclosed '[' took 51 SECONDS. The thresholds below are deliberately loose —
 * they exist to catch a return to that shape on a loaded CI box, not to measure.
 *
 *   npm run test:unit -- src/tests/parse-incomplete-perf.spec.ts --run
 */
import { test, expect } from 'vitest';
import {
	IncompleteMarkdownParser,
	parseIncompleteMarkdown
} from '../lib/utils/parse-incomplete-markdown.js';

// contextManager establishes the block contexts every other plugin reads, so a
// plugin is timed with it and nothing else (methodology from the audit repro).
const defaults = IncompleteMarkdownParser.createDefaultPlugins();
const isolate = (name: string) =>
	new IncompleteMarkdownParser(
		defaults.filter((plugin) => plugin.name === 'contextManager' || plugin.name === name)
	);

// Best of a few rounds: a GC pause or a noisy neighbour inflates a single sample,
// never the minimum.
const fastest = (run: () => void, rounds = 5, iterations = 3): number => {
	run();
	let best = Infinity;
	for (let round = 0; round < rounds; round++) {
		const start = performance.now();
		for (let i = 0; i < iterations; i++) run();
		best = Math.min(best, (performance.now() - start) / iterations);
	}
	return best;
};

const lineOf = (segment: string, size: number) => segment.repeat(Math.ceil(size / segment.length));

test('a 16 KB line of unclosed brackets completes in milliseconds', () => {
	const line = lineOf('see [a [b [c [d ', 16 * 1024);
	const took = fastest(() => parseIncompleteMarkdown(line));
	console.log(`  16 KB unclosed '[' line: ${took.toFixed(2)} ms (whole completer)`);
	expect(took).toBeLessThan(50);
});

// Doubling the line may not more than ~2.5× the time. Quadratic is ~4×, and the
// absolute escape hatch keeps sub-millisecond measurements from flaking.
test.each([
	['inlineCitation', 'see [a [b [c [d ', 16 * 1024],
	['inlineCitation', '[key', 16 * 1024],
	['singleUnderscoreItalic', 'value_a name_b thing_c ', 32 * 1024],
	['singleUnderscoreItalic', 'value_a `code` $x$ name_b ', 32 * 1024],
	['superscript', 'a^b c^d [^e] f^g ', 32 * 1024]
] as const)('%s stays linear on a long line (%s)', (name, segment, size) => {
	const parser = isolate(name);
	const short = fastest(() => parser.parse(lineOf(segment, size)));
	const long = fastest(() => parser.parse(lineOf(segment, size * 2)));
	console.log(
		`  ${name} "${segment}": ${size / 1024} KB ${short.toFixed(2)} ms → ${(size * 2) / 1024} KB ${long.toFixed(2)} ms (×${(long / short).toFixed(2)})`
	);
	expect(long).toBeLessThan(Math.max(2.5 * short, 5));
});
