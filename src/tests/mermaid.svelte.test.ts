import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '$lib/Streamdown.svelte';
import Mermaid from '$lib/Elements/Mermaid.svelte';

// pele renders in well under a millisecond, so unlike mermaid.js it can draw on
// every streamed chunk. What has to hold is that a half-written line never wipes
// the diagram: the last good frame stays until the next one parses.
const nodeIds = (container: HTMLElement) =>
	[...container.querySelectorAll('[data-mermaid-svg] .pele-node')].map((node) =>
		node.getAttribute('data-id')
	);

// pele and each diagram type are loaded lazily.
const waitForNodes = (container: HTMLElement, ids: string[]) =>
	vi.waitFor(() => expect(nodeIds(container)).toEqual(ids), { timeout: 3000 });

describe('mermaid streaming', () => {
	test('draws while the fence is open, one finished line at a time', async () => {
		const { container, rerender } = render(Streamdown, {
			content: '```mermaid\nflowchart TD\n  A-->B\n',
			components: { mermaid: Mermaid }
		});
		await waitForNodes(container, ['A', 'B']);

		// `C[Hal` does not parse: the half-typed line is dropped, A and B stay.
		await rerender({ content: '```mermaid\nflowchart TD\n  A-->B\n  B-->C[Hal' });
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(nodeIds(container)).toEqual(['A', 'B']);

		await rerender({ content: '```mermaid\nflowchart TD\n  A-->B\n  B-->C[Half]\n```' });
		await waitForNodes(container, ['A', 'B', 'C']);
	});

	test('a line that parsed is not dropped when the next chunk breaks it', async () => {
		// `A-->B` is a complete graph; `A-->B{Is` is not. Dropping the broken line
		// would leave only `flowchart TD` and replace the diagram with an empty one.
		const { container, rerender } = render(Streamdown, {
			content: '```mermaid\nflowchart TD\n  A-->B',
			components: { mermaid: Mermaid }
		});
		await waitForNodes(container, ['A', 'B']);

		await rerender({ content: '```mermaid\nflowchart TD\n  A-->B{Is' });
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(nodeIds(container)).toEqual(['A', 'B']);

		await rerender({ content: '```mermaid\nflowchart TD\n  A-->B{Is it?}' });
		await vi.waitFor(() =>
			expect(container.querySelector('.pele-node[data-id="B"]')?.textContent).toContain('Is it?')
		);
	});

	test('a closed fence that does not parse shows the error as text', async () => {
		const { container } = render(Streamdown, {
			content: '```mermaid\nflowchart TD\n  A-->\n```',
			components: { mermaid: Mermaid }
		});
		await vi.waitFor(
			() => expect(container.querySelector('[data-streamdown-mermaid] pre')).not.toBeNull(),
			{ timeout: 3000 }
		);
		expect(container.querySelector('[data-mermaid-svg]')).toBeNull();
	});

	test('mermaidConfig reaches the diagram as default settings', async () => {
		const content = '```mermaid\nflowchart LR\n  A-->B\n```';
		// panzoom scales each diagram to fit its box, so compare pele's natural width.
		const naturalWidth = async (props: Record<string, unknown>) => {
			const { container } = render(Streamdown, {
				content,
				components: { mermaid: Mermaid },
				...props
			});
			await waitForNodes(container, ['A', 'B']);
			return Number(container.querySelector('svg.pele')!.getAttribute('width'));
		};

		const spaced = await naturalWidth({ mermaidConfig: { flowchart: { rankSpacing: 200 } } });
		expect(spaced).toBeGreaterThan(await naturalWidth({}));
	});
});
