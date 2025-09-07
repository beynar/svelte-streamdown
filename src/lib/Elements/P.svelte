<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { ParagraphProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, ...props }: ParagraphProps = $props();
</script>

<Slot
	props={{
		children,
		node,
		...props
	}}
	render={streamdown.snippets.p}
>
	<p class={clsx(streamdown.theme.p.base, node.properties.className)} {...props}>
		{@render children()}
	</p>
</Slot>
