<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { ElementProps } from './element.js';
	import Slot from './Slot.svelte';
	import type { MermaidConfig } from 'mermaid';

	const streamdown = useStreamdown();

	const { children, node, className, props }: ElementProps = $props();

	const code = $derived((node.children[0] as any)?.value as string);
	let mermaid = $state<any>(null);
	onMount(async () => {
		mermaid = (await import('mermaid')).default;
	});

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
			const { svg } = await mermaid.render(uniqueId, code);

			// Insert the SVG into the container
			element.innerHTML = svg;
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
		></div>
	{:else}
		<div {...props} class={clsx(streamdown.theme.mermaid.base, className)}></div>
	{/if}
</Slot>
