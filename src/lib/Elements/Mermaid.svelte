<script lang="ts">
	import panzoom from 'panzoom';
	import { onMount, onDestroy, untrack } from 'svelte';
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { ElementProps } from './element.js';
	import Slot from './Slot.svelte';
	import type { MermaidConfig } from 'mermaid';
	import { on } from 'svelte/events';

	const streamdown = useStreamdown();

	const { children, node, className, props }: ElementProps = $props();

	const code = $derived((node.children[0] as any)?.value as string);
	let mermaid = $state<any>(null);
	let pz = $state<ReturnType<typeof panzoom> | null>(null);
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
			// const svg = new DOMParser().parseFromString(svgString, 'image/svg+xml').documentElement;
			// const svgTarget = element.querySelector('svg')!;
			// Array.from(svg.attributes).forEach((attribute) => {
			// 	svgTarget.setAttribute(attribute.name, attribute.value);
			// });
			// svgTarget.innerHTML = svg.innerHTML;
			element.innerHTML = svgString;
			pz = panzoom(element.querySelector('svg') as SVGSVGElement, {
				autocenter: true,
				minZoom: 0.5,
				maxZoom: 4,

				smoothScroll: true,
				beforeWheel(e) {
					return untrack(() => {
						if (!insider.isInside) {
							e.preventDefault();
							e.stopPropagation();
							return true;
						}
					});
				}
			});

			// console.log({ svg });
		} catch (err) {
			// Do nothing
		}
	};
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
		></div>
	{:else}
		<div {...props} class={clsx(streamdown.theme.mermaid.base, className)}></div>
	{/if}
</Slot>
