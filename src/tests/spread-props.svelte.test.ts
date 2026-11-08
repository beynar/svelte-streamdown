import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import Streamdown from '$lib/Streamdown.svelte';
import SpreadFixture from './SpreadFixture.test.svelte';

// A parent that hands its props over with a spread re-applies all of them when one changes,
// `streamdown` included, which it never set.
describe('props passed with a spread', () => {
	test('changing one after mount keeps the content rendered', async () => {
		const screen = render(SpreadFixture, {
			options: { content: '# Title\n\nSome **bold** text.', lineNumbers: false }
		});
		expect(screen.container.querySelector('h1')?.textContent).toBe('Title');

		await screen.rerender({
			options: { content: '# Title\n\nSome **bold** text.', lineNumbers: true }
		});
		await tick();
		expect(screen.container.querySelector('h1')?.textContent).toBe('Title');
		expect(screen.container.querySelector('strong')?.textContent).toBe('bold');

		await screen.rerender({ options: { content: '# Other\n\nNew text.', lineNumbers: true } });
		await tick();
		expect(screen.container.querySelector('h1')?.textContent).toBe('Other');
	});

	test('bind:streamdown still hands out the context', async () => {
		let context: unknown;
		render(Streamdown, {
			content: 'Hello',
			get streamdown() {
				return context as never;
			},
			set streamdown(value) {
				context = value;
			}
		});
		await tick();
		expect(context).toBeDefined();
		expect((context as { content: string }).content).toBe('Hello');
	});
});
