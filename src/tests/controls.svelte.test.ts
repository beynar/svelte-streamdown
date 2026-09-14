import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '$lib/Streamdown.svelte';
import Code from '$lib/Elements/Code.svelte';
import type { Controls } from '$lib/context.svelte.js';

const content = '```ts\nconst a = 1;\n```\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n';

const buttons = (controls?: Controls) => {
	// The default code renderer has no toolbar at all; the controls only apply to
	// the opt-in highlighted one.
	const { container } = render(Streamdown, { content, controls, components: { code: Code } });
	return {
		code: container.querySelectorAll('[data-streamdown-code] button').length,
		table: container.querySelectorAll('[data-streamdown-table-download] button').length,
		// The toolbar containers themselves: an empty one still takes vertical space.
		tableBar: container.querySelectorAll('[data-streamdown-table-download]').length
	};
};

describe('controls', () => {
	test('the pre-4.1 boolean forms resolve unchanged', () => {
		expect(buttons()).toMatchObject({ code: 2, table: 2 });
		expect(buttons({ code: false })).toMatchObject({ code: 0, table: 2 });
		expect(buttons({ table: false })).toMatchObject({ code: 2, table: 0 });
		// The object form for mermaid never disabled anything else.
		expect(buttons({ mermaid: { mouseWheelZoom: false } })).toMatchObject({ code: 2, table: 2 });
	});

	test('controls={false} turns every toolbar off, controls={true} leaves them on', () => {
		expect(buttons(false)).toMatchObject({ code: 0, table: 0 });
		expect(buttons(true)).toMatchObject({ code: 2, table: 2 });
	});

	test('copy and download are separately switchable', () => {
		expect(buttons({ code: { copy: false }, table: { download: false } })).toMatchObject({
			code: 1,
			table: 1
		});
		expect(buttons({ code: { enabled: false } })).toMatchObject({ code: 0, table: 2 });
	});

	test('turning both actions off removes the toolbar, not just its buttons', () => {
		expect(buttons({ table: { copy: false, download: false } })).toMatchObject({
			table: 0,
			tableBar: 0
		});
		expect(buttons(false)).toMatchObject({ tableBar: 0 });
		expect(buttons()).toMatchObject({ tableBar: 1 });
	});
});
