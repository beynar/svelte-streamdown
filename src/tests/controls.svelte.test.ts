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
		tableFullscreen: container.querySelectorAll(
			'[data-streamdown-table-download] button[aria-pressed]'
		).length,
		// The toolbar containers themselves: an empty one still takes vertical space.
		tableBar: container.querySelectorAll('[data-streamdown-table-download]').length
	};
};

describe('controls', () => {
	// The table toolbar is download + copy + fullscreen (4.2.0) — three buttons.
	test('the pre-4.1 boolean forms resolve unchanged', () => {
		expect(buttons()).toMatchObject({ code: 2, table: 3 });
		expect(buttons({ code: false })).toMatchObject({ code: 0, table: 3 });
		expect(buttons({ table: false })).toMatchObject({ code: 2, table: 0 });
		// The object form for mermaid never disabled anything else.
		expect(buttons({ mermaid: { mouseWheelZoom: false } })).toMatchObject({ code: 2, table: 3 });
	});

	test('controls={false} turns every toolbar off, controls={true} leaves them on', () => {
		expect(buttons(false)).toMatchObject({ code: 0, table: 0 });
		expect(buttons(true)).toMatchObject({ code: 2, table: 3 });
	});

	test('copy and download are separately switchable', () => {
		expect(buttons({ code: { copy: false }, table: { download: false } })).toMatchObject({
			code: 1,
			table: 2
		});
		expect(buttons({ code: { enabled: false } })).toMatchObject({ code: 0, table: 3 });
	});

	test('the fullscreen toggle is switchable on its own', () => {
		expect(buttons()).toMatchObject({ tableFullscreen: 1 });
		expect(buttons({ table: { fullscreen: false } })).toMatchObject({
			table: 2,
			tableFullscreen: 0
		});
		// It goes away with the section and with every control.
		expect(buttons({ table: false })).toMatchObject({ tableFullscreen: 0 });
		expect(buttons(false)).toMatchObject({ tableFullscreen: 0 });
	});

	test('turning every action off removes the toolbar, not just its buttons', () => {
		expect(buttons({ table: { copy: false, download: false, fullscreen: false } })).toMatchObject({
			table: 0,
			tableBar: 0
		});
		// Fullscreen alone still earns a toolbar.
		expect(buttons({ table: { copy: false, download: false } })).toMatchObject({
			table: 1,
			tableBar: 1
		});
		expect(buttons(false)).toMatchObject({ tableBar: 0 });
		expect(buttons()).toMatchObject({ tableBar: 1 });
	});
});
