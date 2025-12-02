<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import type { MathToken } from '$lib/marked/index.js';

	const {
		token,
		id
	}: {
		token: MathToken;
		id: string;
	} = $props();

	const streamdown = useStreamdown();
</script>

{#if token.isInline}
	<span
		data-streamdown-inline-math={id}
		style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
		class={streamdown.theme.math.inline}
	>
		<code>{token.text}</code>
	</span>
{:else}
	<div
		data-streamdown-block-math={id}
		style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
		style:height="fit-content"
		style:width="100%"
	>
		<div class="overflow-x-auto">
			<pre class={streamdown.theme.math.block}><code>{token.text}</code></pre>
		</div>
	</div>
{/if}
