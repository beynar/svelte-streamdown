<script lang="ts">
	import Streamdown from '$lib/Streamdown.svelte';
	import type { StreamdownProps } from '$lib/context.svelte.js';

	let { options }: { options: StreamdownProps } = $props();
</script>

<Streamdown {...options} />
