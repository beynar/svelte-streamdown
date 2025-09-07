<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { ListItemProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, ...rest }: ListItemProps = $props();

	console.log({ node, children });
</script>

<Slot
	props={{
		children,
		node,
		...rest
	}}
	render={streamdown.snippets.li}
>
	<li class={clsx(streamdown.theme.li.base, node.properties.className)} {...rest}>
		{@render children()}
	</li>
</Slot>
