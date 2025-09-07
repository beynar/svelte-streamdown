<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { PreProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, language, ...props }: PreProps = $props();
</script>

<Slot
	props={{
		children,
		node,
		...props
	}}
	render={streamdown.snippets.inlineCode}
>
	<code class={clsx(streamdown.theme.inlineCode.base, node.properties.className)} {...props}>
		{@render children()}
	</code>
</Slot>
