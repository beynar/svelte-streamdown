<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { ElementProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, className, props }: ElementProps = $props();
</script>

<Slot
	props={{
		children,
		node,
		...props
	}}
	render={streamdown.snippets.h2}
>
	<h2 {...props} class={clsx(streamdown.theme.h2.base, className)}>
		{@render children()}
	</h2>
</Slot>
