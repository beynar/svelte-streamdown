<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { TableHeaderCellProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, ...props }: TableHeaderCellProps = $props();
</script>

<Slot
	props={{
		children,
		node,
		...props
	}}
	render={streamdown.snippets.th}
>
	<th class={clsx(streamdown.theme.th.base, node.properties.className)} {...props}>
		{@render children()}
	</th>
</Slot>
