<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { ElementProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, className, props }: ElementProps = $props();

	console.log({ node });
</script>

<Slot
	props={{
		children,
		node,
		props,
		className
	}}
	render={streamdown.snippets.blockquote}
>
	<blockquote {...props} class={clsx(streamdown.theme.blockquote.base, className)}>
		{@render children()}
	</blockquote>
</Slot>
