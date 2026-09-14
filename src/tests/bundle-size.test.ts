import { beforeAll, describe, expect, test } from 'vitest';
import { measureSizes, type EntryName, type Sizes } from '../../scripts/measure-size.js';

// Budgets in bytes, set in 4.1.0 at ~5% above what was measured then. Measured
// again on the 4.2.0 merge (`pnpm test:size`):
//   root   199_811 min / 61_697 gzip   (budget leaves ~500 B of gzip headroom)
//   code    43_893 min / 15_731 gzip
//   parser  77_182 min / 24_452 gzip
// The budgets are deliberately NOT re-baselined here: nothing exceeds them, and
// root gzip being close is the signal that the next root-entry feature has to
// raise it on purpose.
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
