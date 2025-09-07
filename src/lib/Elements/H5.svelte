<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { HeadingProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, ...props }: HeadingProps = $props();
</script>

<Slot
	props={{
		children,
		node,
		...props
	}}
	render={streamdown.snippets.h5}
>
	<h5 class={clsx(streamdown.theme.h5.base, node.properties.className)} {...props}>
		{@render children()}
	</h5>
</Slot>
