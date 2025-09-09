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
	render={streamdown.snippets.table}
>
	<div class={clsx(streamdown.theme.table.base, className)}>
		<table class={streamdown.theme.table.table} {...props}>
			{@render children()}
		</table>
	</div>
</Slot>
