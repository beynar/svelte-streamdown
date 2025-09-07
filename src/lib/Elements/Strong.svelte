<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { StrongProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, ...props }: StrongProps = $props();
</script>

<Slot
	props={{
		children,
		node,
		...props
	}}
	render={streamdown.snippets.strong}
>
	<strong class={clsx(streamdown.theme.strong.base, node.properties.className)} {...props}>
		{@render children()}
	</strong>
</Slot>
