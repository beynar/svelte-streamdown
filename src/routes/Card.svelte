<script lang="ts">
	import type { Snippet } from 'svelte';

	let { props, children }: { props: { title: string }; children: Snippet } = $props();
</script>

<div class="rounded-lg border border-border p-4 shadow-md">
	<h6 class="mb-2 text-xl font-medium text-muted-foreground">{props.title}</h6>
	{@render children()}
	yo
</div>
