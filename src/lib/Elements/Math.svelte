<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { ElementProps } from './element.js';
	import Slot from './Slot.svelte';
	import type { KatexOptions } from 'katex';
	import 'katex/dist/katex.min.css';
	const streamdown = useStreamdown();
	const { children, node, className, props }: ElementProps = $props();
	const code = $derived((node.children[0] as any).value as string);
	const isInline = className?.includes('inline') ?? false;
	let katex = $state<typeof import('katex').renderToString | null>(null);
	onMount(async () => {
		katex = (await import('katex')).renderToString;
	});

	const renderMath = async (code: string, element: HTMLElement) => {
		console.log({ code, node });

		if (!katex || !code) return;
		try {
			const customConfig =
				typeof streamdown.katexConfig === 'function'
					? streamdown.katexConfig(isInline)
					: streamdown.katexConfig;
			// Default configuration
			const config: KatexOptions = {
				output: 'html',
				displayMode: !isInline,
				...(customConfig || {})
			};

			const html = katex(code, config);
			element.innerHTML = html.toString();
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
	render={streamdown.snippets.math}
>
	{#if katex}
		{#if isInline}
			<span
				{...props}
				class={clsx(streamdown.theme.math.base, className)}
				{@attach (node) => renderMath(code, node)}
			>
				<!--  -->
			</span>
		{:else}
			<div class="h-fit w-full">
				<div class="overflow-x-auto">
					<div
						{...props}
						class={clsx(streamdown.theme.math.base, className)}
						{@attach (node) => renderMath(code, node)}
					></div>
				</div>
			</div>
		{/if}
	{:else}
		<div {...props} class={clsx(streamdown.theme.math.base, className)}></div>
	{/if}
</Slot>
