<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { SubscriptProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, ...props }: SubscriptProps = $props();
</script>

<Slot
	props={{
		children,
		node,
		...props
	}}
	render={streamdown.snippets.sub}
>
	<sub class={clsx(streamdown.theme.sub.base, node.properties.className)} {...props}>
		{@render children()}
	</sub>
</Slot>
