import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import Streamdown from '$lib/Streamdown.svelte';
import { isAtBottom } from '$lib/utils/usePinnedScroll.svelte.js';

// No Tailwind in the browser project, so the theme's `block` on each code line
// does nothing and the whole block collapses onto one line. The pinning tests
// need a genuinely overflowing box, so give the lines their height back.
const style = document.createElement('style');
style.textContent = 'pre span { display: block; line-height: 16px; }';
document.head.append(style);

const code = (lines: number) =>
	['```ts', ...Array.from({ length: lines }, (_, i) => `const line${i} = ${i};`), '```'].join('\n');

const table = [
	'| a | b |',
	'| - | - |',
	...Array.from({ length: 40 }, (_, i) => `| ${i} | x |`)
].join('\n');

const atBottom = (el: HTMLElement) => isAtBottom(el.scrollTop, el.scrollHeight, el.clientHeight);

describe('codeBlockMaxHeight / tableMaxHeight', () => {
	test('caps the code block scroll container', () => {
		const { container } = render(Streamdown, { content: code(60), codeBlockMaxHeight: '10rem' });
		const pre = container.querySelector('pre') as HTMLElement;
		expect(pre.style.maxHeight).toBe('10rem');
		expect(pre.style.overflowY).toBe('auto');
	});

	test('leaves the code block unbounded by default', () => {
		const { container } = render(Streamdown, { content: code(60) });
		const pre = container.querySelector('pre') as HTMLElement;
		expect(pre.style.maxHeight).toBe('');
		expect(pre.style.overflowY).toBe('');
	});

	test('caps the table wrapper, not the table itself', () => {
		const { container } = render(Streamdown, { content: table, tableMaxHeight: '8rem' });
		const wrapper = container.querySelector('[data-streamdown-table]') as HTMLElement;
		expect(wrapper.style.maxHeight).toBe('8rem');
		expect(wrapper.style.overflowY).toBe('auto');
	});

	test('leaves the table unbounded by default', () => {
		const { container } = render(Streamdown, { content: table });
		const wrapper = container.querySelector('[data-streamdown-table]') as HTMLElement;
		expect(wrapper.style.maxHeight).toBe('');
	});

	test('a capped code block stays pinned to the bottom as it grows', async () => {
		const { container, rerender } = render(Streamdown, {
			content: code(20),
			codeBlockMaxHeight: '10rem'
		});
		const pre = container.querySelector('pre') as HTMLElement;
		await tick();
		expect(atBottom(pre)).toBe(true);

		await rerender({ content: code(60) });
		await tick();
		expect(pre.scrollTop).toBeGreaterThan(0);
		expect(atBottom(pre)).toBe(true);
	});

	test('scrolling up stops the pinning until the user comes back', async () => {
		const { container, rerender } = render(Streamdown, {
			content: code(20),
			codeBlockMaxHeight: '10rem'
		});
		const pre = container.querySelector('pre') as HTMLElement;
		await tick();

		pre.scrollTop = 0;
		pre.dispatchEvent(new Event('scroll'));
		await rerender({ content: code(60) });
		await tick();
		expect(pre.scrollTop).toBe(0);

		// Back to the bottom: pinning resumes on the next growth.
		pre.scrollTop = pre.scrollHeight;
		pre.dispatchEvent(new Event('scroll'));
		await rerender({ content: code(100) });
		await tick();
		expect(atBottom(pre)).toBe(true);
	});
});
