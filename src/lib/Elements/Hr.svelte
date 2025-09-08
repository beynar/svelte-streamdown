<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { ElementProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { node, props, className }: ElementProps = $props();
</script>

<Slot
	props={{
		node,
		...props
	}}
	render={streamdown.snippets.hr}
>
	<hr {...props} class={clsx(streamdown.theme.hr.base, className)} />
</Slot>
