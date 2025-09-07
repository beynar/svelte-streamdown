<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { HorizontalRuleProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { node, ...props }: HorizontalRuleProps = $props();
</script>

<Slot
	props={{
		node,
		...props
	}}
	render={streamdown.snippets.hr}
>
	<hr class={clsx(streamdown.theme.hr.base, node.properties.className)} {...props} />
</Slot>
