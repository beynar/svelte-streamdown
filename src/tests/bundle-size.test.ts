import { beforeAll, describe, expect, test } from 'vitest';
import { measureSizes, type EntryName, type Sizes } from '../../scripts/measure-size.js';

// Budgets in bytes, ~5% above the numbers measured on 2026-09-14 (`pnpm
// test:size` on the 4.1.0 tip, with every work package merged):
//   root   193_365 min / 59_161 gzip
//   code    43_161 min / 15_528 gzip
//   parser  75_621 min / 23_689 gzip
// Dependencies are bundled in (only `svelte` is external), so a dependency bump
// moves these too — that is the point, it is what a consumer downloads.
const budgets: Record<EntryName, { min: number; gzip: number }> = {
	root: { min: 203_100, gzip: 62_200 },
	code: { min: 45_400, gzip: 16_400 },
	parser: { min: 79_500, gzip: 24_900 }
};

let sizes: Sizes;

beforeAll(async () => {
	sizes = await measureSizes();
	console.log('bundle sizes', JSON.stringify(sizes));
}, 120_000);

describe('bundle size', () => {
	for (const name of Object.keys(budgets) as EntryName[]) {
		test(name, () => {
			for (const kind of ['min', 'gzip'] as const) {
				const actual = sizes[name][kind];
				expect(
					actual,
					`${name} ${kind} grew to ${actual} B (budget ${budgets[name][kind]} B). If that is intended, set the budget to ${Math.ceil((actual * 1.05) / 100) * 100}.`
				).toBeLessThanOrEqual(budgets[name][kind]);
			}
		});
	}
});
