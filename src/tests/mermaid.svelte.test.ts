import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '$lib/Streamdown.svelte';
import Mermaid from '$lib/Elements/Mermaid.svelte';

// The point of the `incomplete` flag: mermaid.render is expensive and throws on
// half-written input, so a diagram must not be re-rendered on every chunk. Only
// a real browser can show that, mermaid renders into the DOM.
const diagramNodes = (container: HTMLElement) =>
	container.querySelector('[data-mermaid-svg]')?.childElementCount ?? 0;

// mermaid is loaded dynamically and renders asynchronously.
const settle = async (container: HTMLElement) => {
	for (let i = 0; i < 60 && diagramNodes(container) === 0; i++) {
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
};

describe('mermaid streaming', () => {
	test('skips rendering while the fence is open and renders once it closes', async () => {
		const { container, rerender } = render(Streamdown, {
			content: '```mermaid\ngraph TD;\n  A-->B',
			components: { mermaid: Mermaid }
		});

		await settle(container);
		expect(diagramNodes(container)).toBe(0);

		await rerender({ content: '```mermaid\ngraph TD;\n  A-->B\n```' });
		await settle(container);
		expect(diagramNodes(container)).toBeGreaterThan(0);
	});
});
