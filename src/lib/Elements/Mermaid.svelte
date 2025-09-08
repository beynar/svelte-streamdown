<script lang="ts">
	import { onMount } from 'svelte';
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { ElementProps } from './element.js';
	import Slot from './Slot.svelte';
	import type { MermaidConfig } from 'mermaid';
	import { on } from 'svelte/events';
	import { usePanzoom } from '$lib/utils/panzoom.svelte';

	const streamdown = useStreamdown();

	const { children, node, className, props }: ElementProps = $props();

	const code = $derived((node.children[0] as any)?.value as string);
	let mermaid = $state<any>(null);
	onMount(async () => {
		mermaid = (await import('mermaid')).default;
	});

	const useIsInsideForMoreThanAQuarterSecond = () => {
		let isInside = $state(false);
		let timeout: number | undefined = undefined;

		return {
			get isInside() {
				return isInside;
			},
			attach: (node: HTMLElement) => {
				const off1 = on(node, 'mouseenter', () => {
					timeout = setTimeout(() => {
						isInside = true;
					}, 1000);
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
	$inspect(insider.isInside);

	const renderMermaid = async (code: string, element: HTMLElement) => {
		try {
			// Default configuration
			const defaultConfig: MermaidConfig = {
				theme: 'base',
				startOnLoad: false,
				securityLevel: 'strict',
				fontFamily: 'monospace',
				suppressErrorRendering: true,

				flowchart: {
					useMaxWidth: true,
					htmlLabels: true,
					curve: 'basis'
				},
				...(streamdown.mermaidConfig || {})
			};

			// Initialize mermaid with merged config
			const mergedConfig = { ...defaultConfig };
			mermaid.initialize(mergedConfig);

			// Validate and render the diagram
			const isValidDiagram = await mermaid.parse(code);
			if (!isValidDiagram) {
				throw new Error('Invalid mermaid diagram syntax');
			}
			// Use a stable ID based on chart content hash and timestamp to ensure uniqueness
			const chartHash = code.split('').reduce((acc, char) => {
				// biome-ignore lint/suspicious/noBitwiseOperators: "Required for Mermaid"
				return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
			}, 0);
			const uniqueId = `mermaid-${Math.abs(chartHash)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

			// Render the diagram
			const { svg: svgString } = await mermaid.render(uniqueId, code);
			const svg = new DOMParser().parseFromString(svgString, 'image/svg+xml').documentElement;
			const svgTarget = element.querySelector('#mermaid-svg')!;
			Array.from(svg.attributes).forEach((attribute) => {
				svgTarget.setAttribute(attribute.name, attribute.value);
			});
			svgTarget.innerHTML = svg.innerHTML;
			// After rendering, fit the SVG within its parent container
			panzoom2.zoomToFit(0.05);
			// pz = panzoom(element.querySelector('svg') as SVGSVGElement, {
			// 	autocenter: true,
			// 	minZoom: 0.5,
			// 	maxZoom: 4,

			// 	smoothScroll: true,
			// 	beforeWheel(e) {
			// 		return untrack(() => {
			// 			if (!insider.isInside) {
			// 				e.preventDefault();
			// 				e.stopPropagation();
			// 				return true;
			// 			}
			// 		});
			// 	}
			// });

			// console.log({ svg });
		} catch (err) {
			// Do nothing
		}
	};

	const panzoom2 = usePanzoom({ minZoom: 0.5, maxZoom: 4, zoomSpeed: 1 });
</script>

<Slot
	props={{
		children,
		node,
		...props
	}}
	render={streamdown.snippets.mermaid}
>
	{#if mermaid}
		<div
			{...props}
			class={clsx(streamdown.theme.mermaid.base, className)}
			{@attach (node) => renderMermaid(code, node)}
			{@attach insider.attach}
		>
			<div class="absolute top-0 left-0 z-10 flex h-fit w-fit items-center gap-1">
				<button
					class={streamdown.theme.mermaid.button}
					aria-label="Zoom to fit"
					onclick={() => panzoom2.zoomToFit()}
				>
					<svg
						class={streamdown.theme.mermaid.icon}
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path
							d="M21 17v2a2 2 0 0 1-2 2h-2"
						/><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect
							width="10"
							height="8"
							x="7"
							y="8"
							rx="1"
						/></svg
					>
				</button>
				<button
					class={streamdown.theme.mermaid.button}
					aria-label="Zoom in"
					onclick={() => panzoom2.zoomIn()}
				>
					<svg
						class={streamdown.theme.mermaid.icon}
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /><line
							x1="11"
							x2="11"
							y1="8"
							y2="14"
						/><line x1="8" x2="14" y1="11" y2="11" /></svg
					>
				</button>
				<button
					class={streamdown.theme.mermaid.button}
					aria-label="Zoom out"
					onclick={() => panzoom2.zoomOut()}
					><svg
						class={streamdown.theme.mermaid.icon}
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /><line
							x1="8"
							x2="14"
							y1="11"
							y2="11"
						/></svg
					></button
				>
				<button
					class={streamdown.theme.mermaid.button}
					aria-label="Toggle expand"
					onclick={() => panzoom2.toggleExpand()}
				>
					<svg
						class={streamdown.theme.mermaid.icon}
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="m15 15 6 6" /><path d="m15 9 6-6" /><path d="M21 16v5h-5" /><path
							d="M21 8V3h-5"
						/><path d="M3 16v5h5" /><path d="m3 21 6-6" /><path d="M3 8V3h5" /><path
							d="M9 9 3 3"
						/></svg
					>
				</button>
			</div>
			<svg id="mermaid-svg" {@attach panzoom2.attach}></svg>
		</div>
	{:else}
		<div {...props} class={clsx(streamdown.theme.mermaid.base, className)}></div>
	{/if}
</Slot>
