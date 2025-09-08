<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { BlockquoteProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, ...props }: BlockquoteProps = $props();

	console.log({ node });
</script>

<Slot
	props={{
		children,
		node,
		...props
	}}
	render={streamdown.snippets.blockquote}
>
	<blockquote class={clsx(streamdown.theme.blockquote.base, node.properties.className)} {...props}>
		{@render children()}
	</blockquote>
</Slot>
