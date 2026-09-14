<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { usePinnedScroll } from '$lib/utils/usePinnedScroll.svelte.js';
	import { resolveLineNumbers } from '$lib/utils/line-numbers.js';
	import type { CodeToken } from '$lib/marked/index.js';

	const {
		token,
		id,
		incomplete = false,
		animate = true
	}: {
		token: CodeToken;
		id: string;
		/** The fence is still being streamed; nothing below it is final yet. */
		incomplete?: boolean;
		animate?: boolean;
	} = $props();

	const streamdown = useStreamdown();

	// Same trim as Code.svelte/Mermaid.svelte: marked keeps the fence's trailing
	// blank lines in `text`, so they render as empty lines and flicker in and out
	// on nearly every streamed chunk. This is the default renderer, so it needs it
	// too.
	const code = $derived(token.text.replace(/\n+$/, ''));

	const lineNumbers = $derived(resolveLineNumbers(token.meta, streamdown.lineNumbers ?? false));

	// Same scroll container as Code.svelte: `pre` already scrolls horizontally.
	const pinnedScroll = usePinnedScroll({
		get maxHeight() {
			return streamdown.codeBlockMaxHeight;
		},
		get content() {
			return code;
		}
	});
</script>

<div
	data-streamdown-code={id}
	data-incomplete={incomplete || undefined}
	style={animate && streamdown.isMounted ? streamdown.animationBlockStyle : ''}
	class={streamdown.theme.code.base}
>
	<div class={streamdown.theme.code.header}>
		<span class={streamdown.theme.code.language}>{token.lang}</span>
	</div>
	<div style="height: fit-content; width: 100%;" class={streamdown.theme.code.container}>
		<pre
			class={streamdown.theme.code.pre}
			data-line-numbers={lineNumbers.enabled || undefined}
			style:counter-reset={lineNumbers.enabled ? `sd-line ${lineNumbers.start - 1}` : undefined}
			style:max-height={streamdown.codeBlockMaxHeight}
			style:overflow-y={streamdown.codeBlockMaxHeight ? 'auto' : undefined}
			{@attach pinnedScroll}><code
				>{#each code.split('\n') as line}<span
						class="{streamdown.theme.code.line}{lineNumbers.enabled
							? ` ${streamdown.theme.code.lineNumber}`
							: ''}"
						><span style={animate && streamdown.isMounted ? streamdown.animationTextStyle : ''}
							>{line.trim().length > 0 ? line : '\u200B'}</span
						></span
					>{/each}</code
			></pre>
	</div>
</div>
