<script lang="ts">
	import { untrack } from 'svelte';
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { ElementProps } from './element.js';
	import Slot from './Slot.svelte';
	import type { KatexOptions } from 'katex';
	import 'katex/dist/katex.min.css';
	const streamdown = useStreamdown();
	const { children, node, className, props }: ElementProps = $props();
	import katex from 'katex';
	const isInline = className?.some?.((c: string) => c.includes('inline')) ?? false;

	let inner = $state<HTMLElement | null>(null);
	const html = $derived.by(() => {
		const config: KatexOptions = {
			output: 'html',
			displayMode: !isInline,
			...(typeof streamdown.katexConfig === 'function'
				? streamdown.katexConfig(isInline)
				: streamdown.katexConfig || {})
		};
		const code = ((node.children[0] as any)?.value as string) ?? '';
		try {
			return katex.renderToString(code, config);
		} catch (error) {
			return untrack(() => {
				return inner?.innerHTML || '';
			});
		}
	});
</script>

<Slot
	props={{
		children,
		node,
		...props
	}}
	render={streamdown.snippets.math}
>
	{#if isInline}
		<span bind:this={inner} {...props} class={clsx(streamdown.theme.inlineMath.base, className)}>
			{@html html}
		</span>
	{:else}
		<div class="h-fit w-full">
			<div class="overflow-x-auto">
				<div bind:this={inner} {...props} class={clsx(streamdown.theme.math.base, className)}>
					{@html html}
				</div>
			</div>
		</div>
	{/if}
</Slot>
