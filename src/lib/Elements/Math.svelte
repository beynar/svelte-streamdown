<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { MathProps } from './element.js';
	import Slot from './Slot.svelte';
	import type { KatexOptions } from 'katex';
	import 'katex/dist/katex.min.css';
	const streamdown = useStreamdown();
	const { children, node, ...props }: MathProps = $props();
	const code = $derived(node.children[0].value as string);
	const isInline = node.properties.className?.some((className) => className.includes('inline'));
	let katex = $state<typeof import('katex').renderToString | null>(null);
	onMount(async () => {
		katex = (await import('katex')).renderToString;
	});

	const renderMath = async (code: string, element: HTMLElement) => {
		console.log({ code, node });

		if (!katex || !code) return;
		try {
			// Default configuration
			const defaultConfig: KatexOptions = {
				output: 'html',
				displayMode: !isInline,
				...(streamdown.katexConfig || {})
			};

			// Initialize katex with merged config
			const mergedConfig = { ...defaultConfig };
			const html = katex(code, mergedConfig);

			console.log({ html, code });

			// Validate and render the katex

			element.innerHTML = html.toString();
		} catch (err) {
			console.error(err);
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
	render={streamdown.snippets.math}
>
	{#if katex}
		{#if isInline}
			<span
				class={clsx(streamdown.theme.math.base, node.properties.className)}
				data-streamdown="math"
				{...props}
				{@attach (node) => renderMath(code, node)}
			>
				<!--  -->
			</span>
		{:else}
			<div class="h-fit w-full">
				<div class="overflow-x-auto">
					<div
						class={clsx(streamdown.theme.math.base, node.properties.className)}
						data-streamdown="math"
						{...props}
						{@attach (node) => renderMath(code, node)}
					></div>
				</div>
			</div>
		{/if}
	{:else}
		<div class={clsx(streamdown.theme.math.base, node.properties.className)} {...props}></div>
	{/if}
</Slot>
