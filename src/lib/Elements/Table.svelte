<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { TableProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, ...props }: TableProps = $props();
</script>

<Slot
	props={{
		children,
		node,
		...props
	}}
	render={streamdown.snippets.table}
>
	<div class={clsx(streamdown.theme.table.container)}>
		<table class={clsx(streamdown.theme.table.base, node.properties.className)} {...props}>
			{@render children()}
		</table>
	</div>
</Slot>
