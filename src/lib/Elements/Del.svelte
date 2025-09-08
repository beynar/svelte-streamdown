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
		props,
		className
	}}
	render={streamdown.snippets.del}
>
	<del {...props} class={clsx(streamdown.theme.del.base, className)}>
		{@render children()}
	</del>
</Slot>
