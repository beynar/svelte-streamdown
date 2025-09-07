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
	render={streamdown.snippets.thead}
>
	<thead class={clsx(streamdown.theme.thead.base, node.properties.className)} {...props}>
		{@render children()}
	</thead>
</Slot>
