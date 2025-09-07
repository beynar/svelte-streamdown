<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { SuperscriptProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, ...props }: SuperscriptProps = $props();
</script>

<Slot
	props={{
		children,
		node,
		...props
	}}
	render={streamdown.snippets.sup}
>
	<sup class={clsx(streamdown.theme.sup.base, node.properties.className)} {...props}>
		{@render children()}
	</sup>
</Slot>
