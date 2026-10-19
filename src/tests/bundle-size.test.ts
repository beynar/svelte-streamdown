import { beforeAll, describe, expect, test } from 'vitest';
import { measureSizes, type EntryName, type Sizes } from '../../scripts/measure-size.js';

// Budgets in bytes. `code` and `parser` were set in 4.1.0 at ~5% above what was
// measured then and are deliberately NOT re-baselined; `root` was raised on
// purpose in 5.0.0, when clsx + tailwind-merge were replaced by `cn` (see the
// changelog). Measured on that swap (`pnpm test:size`):
//   root   202_386 min / 65_188 gzip   (was 200_097 / 61_784 on clsx + tw-merge)
//   code    44_586 min / 15_977 gzip
//   parser  77_072 min / 24_439 gzip
// `cn` costs ~2.3 KB min / ~3.4 KB gzip more than the two packages it replaces:
// its compiled lookup tables are high-entropy, so they gzip worse than
// tailwind-merge's repetitive config. That is the trade accepted for a ~25x
// faster merge on the one call shape this library makes (see `mergeTheme`).
// Dependencies are bundled in (only `svelte` is external), so a dependency bump
// moves these too — that is the point, it is what a consumer downloads.
const budgets: Record<EntryName, { min: number; gzip: number }> = {
	root: { min: 212_600, gzip: 68_500 },
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
