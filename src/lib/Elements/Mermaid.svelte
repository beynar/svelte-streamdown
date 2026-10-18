<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { useStreamdown } from '$lib/context.svelte.js';
	import type { CodeToken } from '$lib/marked/index.js';
	import { on } from 'svelte/events';
	import { usePanzoom } from '$lib/utils/panzoom.svelte';
	import { fitViewIcon, fullscreenIcon, zoomInIcon, zoomOutIcon } from './icons.js';
	import MermaidDownload from './MermaidDownload.svelte';

	const streamdown = useStreamdown();

	const {
		token,
		id,
		incomplete = false,
		animate = true
	}: {
		token: CodeToken;
		id: string;
		/** The fence is still being streamed; nothing below it is final yet. */
		incomplete?: boolean;
		animate?: boolean;
	} = $props();

	// Trailing blank lines are noise for the parser but they still changed `token.text`
	// on nearly every streamed chunk, which re-ran the whole render. Same trim as
	// Code.svelte. The rest only undoes what copy-paste and some models add: a BOM,
	// CRLF and zero-width characters. Whitespace inside the source is left alone,
	// mindmap and block diagrams are indentation-sensitive.
	const chart = $derived(
		token.text
			.replace(/^﻿/, '')
			.replace(/\r\n?/g, '\n')
			.replace(/[​-‍⁠]/g, '')
			.replace(/\n+$/, '')
	);

	// Screen readers get the diagram's declaration line ('flowchart TD', 'sequenceDiagram'),
	// which is the only human-readable summary the source offers.
	const firstLine = $derived(chart.split('\n', 1)[0].trim());
	const diagramLabel = $derived(
		firstLine
			? `${streamdown.translations.controls.diagram}: ${firstLine}`
			: streamdown.translations.controls.diagram
	);

	// `pele/lazy` is the renderer without any diagram type; each type (flowchart,
	// sequence, pie…) is a separate chunk fetched the first time it is needed.
	let pele = $state<typeof import('pele/lazy') | null>(null);
	// Bumped when a diagram type finishes loading or web fonts arrive (labels are
	// measured, so a late font means wrong box sizes): both call for a redraw.
	let generation = $state(0);
	onMount(() => {
		import('pele/lazy').then((module) => (pele = module));
		document.fonts?.ready.then(() => generation++);
	});

	const useIsInsideForMoreThanAQuarterSecond = () => {
		let isInside = $state(false);
		let timeout: ReturnType<typeof setTimeout> | undefined = undefined;

		return {
			get isInside() {
				return isInside;
			},
			attach: (node: HTMLElement) => {
				const off1 = on(node, 'mouseenter', () => {
					timeout = setTimeout(() => {
						isInside = true;
					}, 800);
				});

				const off2 = on(node, 'mouseleave', () => {
					isInside = false;
					clearTimeout(timeout);
				});

				return () => {
					off1();
					off2();
				};
			}
		};
	};

	const insider = useIsInsideForMoreThanAQuarterSecond();

	const panzoom = usePanzoom({
		minZoom: 0.5,
		maxZoom: 4,
		zoomSpeed: 1,
		get activateMouseWheel() {
			return insider.isInside && streamdown.controls.mermaidMouseWheelZoom;
		}
	});

	const expandLabel = $derived(
		panzoom.expanded
			? streamdown.translations.controls.exitFullscreen
			: streamdown.translations.controls.fullscreen
	);

	let container = $state<HTMLDivElement>();
	let width = $state(0);
	$effect(() => {
		// Expanding covers the page: move focus in so Escape (handled by panzoom)
		// and the toolbar are reachable from the keyboard.
		if (panzoom.expanded) container?.focus();
	});

	// The last SVG that rendered. A half-written diagram usually fails to parse, and
	// keeping the previous frame on screen is what makes streaming look continuous.
	let svg = $state('');
	// Only shown once the fence is closed: mid-stream, a parse error is expected.
	let error = $state('');

	const idPrefix = `sd-${id}-`;

	const draw = (source: string) => {
		if (!pele) return null;
		const type = pele.detectType(source);
		if (!type) throw new Error(`Unknown diagram type: ${firstLine}`);
		if (!pele.supports(source)) {
			pele.load(type).then((loaded) => loaded && generation++);
			return null;
		}
		return pele.render(source, {
			// Defaults first, app options after, the bits we own last.
			fontFamily: container ? getComputedStyle(container).fontFamily : undefined,
			...streamdown.peleOptions,
			config: streamdown.mermaidConfig,
			idPrefix,
			// Panzoom does the scaling, so pele draws at natural size — but laid out
			// for the room it has, which is what lets a wide flowchart turn vertical
			// in a narrow column.
			responsive: false,
			maxWidth: width || undefined
		}).svg;
	};

	$effect(() => {
		void generation;
		if (!pele || !width) return;
		try {
			const next = draw(chart);
			if (next !== null) {
				svg = next;
				error = '';
			}
		} catch (cause) {
			if (incomplete) {
				// The streaming tail is usually a half-typed line: drop it and try the
				// rest, so nodes appear as soon as their line is done.
				const lastBreak = chart.lastIndexOf('\n');
				if (lastBreak > 0) {
					try {
						const next = draw(chart.slice(0, lastBreak));
						if (next !== null) svg = next;
					} catch {
						// Keep the previous frame.
					}
				}
			} else {
				error = cause instanceof Error ? cause.message : String(cause);
			}
		}
	});

	$effect(() => {
		if (!svg) return;
		// After the flush: the `{#if svg}` block and its panzoom attachment do not
		// exist yet when this runs for the first diagram.
		let cancelled = false;
		tick().then(() => !cancelled && panzoom.zoomToFit());
		return () => (cancelled = true);
	});
</script>

<div data-streamdown-mermaid={id} data-incomplete={incomplete || undefined}>
	<div
		bind:this={container}
		bind:clientWidth={width}
		style={animate && streamdown.isMounted ? streamdown.animationBlockStyle : ''}
		class={streamdown.theme.mermaid.base}
		{@attach insider.attach}
		data-expanded={'false'}
		role={panzoom.expanded ? 'dialog' : undefined}
		aria-modal={panzoom.expanded ? 'true' : undefined}
		aria-label={panzoom.expanded ? diagramLabel : undefined}
		tabindex="-1"
	>
		{#if error && !svg}
			<pre class={streamdown.theme.mermaid.error}>{error}</pre>
		{/if}
		{#if svg}
			{#if streamdown.controls.mermaid}
				<div class={streamdown.theme.mermaid.buttons}>
					<button
						class={streamdown.theme.components.button}
						aria-label={streamdown.translations.controls.resetView}
						title={streamdown.translations.controls.resetView}
						type="button"
						onclick={() => panzoom.zoomToFit()}
						data-panzoom-ignore
					>
						{@render (streamdown.icons?.fitView || fitViewIcon)()}
					</button>
					<button
						class={streamdown.theme.components.button}
						aria-label={streamdown.translations.controls.zoomIn}
						title={streamdown.translations.controls.zoomIn}
						type="button"
						onclick={() => panzoom.zoomIn()}
						data-panzoom-ignore
					>
						{@render (streamdown.icons?.zoomIn || zoomInIcon)()}
					</button>
					<button
						class={streamdown.theme.components.button}
						aria-label={streamdown.translations.controls.zoomOut}
						title={streamdown.translations.controls.zoomOut}
						type="button"
						onclick={() => panzoom.zoomOut()}
						data-panzoom-ignore
					>
						{@render (streamdown.icons?.zoomOut || zoomOutIcon)()}
					</button>
					<button
						class={streamdown.theme.components.button}
						aria-label={expandLabel}
						title={expandLabel}
						aria-pressed={panzoom.expanded}
						type="button"
						onclick={() => panzoom.toggleExpand()}
						data-panzoom-ignore
					>
						{@render (streamdown.icons?.fullscreen || fullscreenIcon)()}
					</button>
					{#if streamdown.controls.mermaidDownload}
						<MermaidDownload {token} {id} />
					{/if}
				</div>
			{/if}
			<!-- pele escapes every label, emits no script, handler or HTML label, and
			     filters link and image schemes, so its output is safe to insert. -->
			<div
				{@attach panzoom.attach}
				data-mermaid-svg
				role="img"
				aria-label={diagramLabel}
				style="width: max-content;"
			>
				{@html svg}
			</div>
		{/if}
	</div>
</div>
