<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import type { Tokens } from 'marked';

	const {
		token,
		id,
		incomplete = false
	}: {
		token: Tokens.Code;
		id: string;
		/** The fence is still being streamed; nothing below it is final yet. */
		incomplete?: boolean;
	} = $props();

	const streamdown = useStreamdown();

	// Same trim as Code.svelte/Mermaid.svelte: marked keeps the fence's trailing
	// blank lines in `text`, so they render as empty lines and flicker in and out
	// on nearly every streamed chunk. This is the default renderer, so it needs it
	// too.
	const chart = $derived(token.text.replace(/\n+$/, ''));
</script>

<div data-streamdown-mermaid={id} data-incomplete={incomplete || undefined}>
	<div
		style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
		class={streamdown.theme.code.base}
	>
		<div class={streamdown.theme.code.header}>
			<span class={streamdown.theme.code.language}>mermaid</span>
		</div>
		<div style="height: fit-content; width: 100%;" class={streamdown.theme.code.container}>
			<pre class={streamdown.theme.code.pre}><code
					>{#each chart.split('\n') as line}<span class={streamdown.theme.code.line}
							><span style={streamdown.isMounted ? streamdown.animationTextStyle : ''}
								>{line.trim().length > 0 ? line : '\u200B'}</span
							></span
						>{/each}</code
				></pre>
		</div>
	</div>
</div>
