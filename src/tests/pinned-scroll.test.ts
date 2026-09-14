import { describe, test, expect } from 'vitest';
import { isAtBottom } from '$lib/utils/usePinnedScroll.svelte.js';

// The pin latch is one decision — "is the user at the bottom right now" — so
// that is the part worth testing without a DOM. The attachment around it is
// verified by the rendered max-height assertions in max-height.svelte.test.ts
// and by hand in the demo app.
describe('isAtBottom', () => {
	test('exactly at the bottom', () => {
		expect(isAtBottom(600, 1000, 400)).toBe(true);
	});

	test('within the fractional-pixel threshold', () => {
		expect(isAtBottom(592.5, 1000, 400)).toBe(true);
	});

	test('a few lines up unpins', () => {
		expect(isAtBottom(560, 1000, 400)).toBe(false);
	});

	test('scrolled back to the bottom pins again', () => {
		expect(isAtBottom(0, 1000, 400)).toBe(false);
		expect(isAtBottom(600, 1000, 400)).toBe(true);
	});

	test('content shorter than the container is always at the bottom', () => {
		expect(isAtBottom(0, 120, 400)).toBe(true);
	});
});
