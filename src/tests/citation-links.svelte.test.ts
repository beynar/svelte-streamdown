import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '$lib/Streamdown.svelte';
import { runsCode } from '$lib/utils/runs-code.js';

describe('runsCode', () => {
	test.each([
		'javascript:alert(1)',
		'JaVaScRiPt:alert(1)',
		' javascript:alert(1)',
		'java\tscript:alert(1)',
		'vbscript:msgbox(1)',
		'data:text/html,x',
		'DATA:TEXT/HTML,x',
		'data:image/svg+xml,x',
		'data:application/xhtml+xml,x'
	])('%j does', (url) => {
		expect(runsCode(new URL(url))).toBe(true);
	});

	test.each([
		'https://example.test/a',
		'mailto:a@example.test',
		'myapp://open',
		'file:///a.pdf',
		'data:text/plain,html',
		'data:application/pdf;base64,AAAA'
	])('%j does not', (url) => {
		expect(runsCode(new URL(url))).toBe(false);
	});
});

describe('a citation', () => {
	const open = async (url: string) => {
		const { container } = render(Streamdown, {
			content: 'See [a].',
			sources: { a: { title: 'The title', url, content: 'The text' } }
		});
		const trigger = container.querySelector<HTMLElement>('button, [role="button"]');
		trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, 50));
		return document.body.innerHTML;
	};

	test.each(['javascript:alert(1)', 'data:text/html,x'])('from %j draws no link', async (url) => {
		const html = await open(url);
		expect(html).toContain('The title');
		expect(html).not.toContain(url);
	});

	test.each(['https://example.test/a', 'myapp://open'])('from %s links to it', async (url) => {
		expect(await open(url)).toContain(`href="${url}`);
	});
});
