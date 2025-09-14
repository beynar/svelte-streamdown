<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.js';
	import Slot from './Slot.svelte';
	import type { Tokens } from 'marked';
	import type { Snippet } from 'svelte';

	const streamdown = useStreamdown();

	const {
		children,
		token
	}: {
		children: Snippet;
		token: Tokens.Table;
	} = $props();
</script>

<Slot
	props={{
		children,
		token
	}}
	render={streamdown.snippets.table}
>
	<div class={streamdown.theme.table.base}>
		<table class={streamdown.theme.table.table}>
			{@render children()}
		</table>
	</div>
</Slot>
