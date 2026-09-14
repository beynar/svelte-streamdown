<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { save } from '$lib/utils/save.js';
	import { useCopy } from '$lib/utils/copy.svelte.js';
	import { highlightLines, languageExtensionMap } from '$lib/utils/hightlighter.svelte.js';
	import type { CodeToken } from '$lib/marked/index.js';
	import { checkIcon, copyIcon, downloadIcon } from './icons.js';

	const {
		token,
		id
	}: {
		token: CodeToken;
		id: string;
	} = $props();

	const streamdown = useStreamdown();

	// marked keeps the fence's trailing blank lines in `text`; they render as empty
	// lines and, while streaming, flicker in and out on nearly every chunk. Render,
	// copy and download all read this so they can never disagree.
	const code = $derived(token.text.replace(/\n+$/, ''));

	const copy = useCopy({
		get content() {
			return code;
		}
	});

	// Download button functionality

	const downloadCode = () => {
		try {
			const extension =
				token.lang && token.lang in languageExtensionMap
					? languageExtensionMap[token.lang as keyof typeof languageExtensionMap]
					: 'txt';
			const filename = `file.${extension}`;
			const mimeType = 'text/plain';
			save(filename, code, mimeType);
		} catch (error) {
			console.error('Failed to download file:', error);
		}
	};

	const lines = $derived(highlightLines(code, token.lang, streamdown.highlightLanguages));
</script>

<div
	data-streamdown-code={id}
	style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
	class={streamdown.theme.code.base}
>
	<div class={streamdown.theme.code.header}>
		<span class={streamdown.theme.code.language}>{token.lang}</span>
		{#if streamdown.controls.code}
			<div class={streamdown.theme.code.buttons}>
				<button
					class={streamdown.theme.components.button}
					onclick={downloadCode}
					title="Download code"
					type="button"
				>
					{@render (streamdown.icons?.download || downloadIcon)()}
				</button>

				<button class={streamdown.theme.components.button} onclick={copy.copy} type="button">
					{#if copy.isCopied}
						{@render (streamdown.icons?.check || checkIcon)()}
					{:else}
						{@render (streamdown.icons?.copy || copyIcon)()}
					{/if}
				</button>
			</div>
		{/if}
	</div>
	<div style="height: fit-content; width: 100%;" class={streamdown.theme.code.container}>
		<pre class={streamdown.theme.code.pre}><code
				>{#each lines as line}<span class={streamdown.theme.code.line}
						>{#if line.length === 0}&#8203;{/if}{#each line as t}<span
								class="th-token{t.className ? ` th-${t.className}` : ''}"
								style={streamdown.isMounted ? streamdown.animationTextStyle : ''}
								style:color={streamdown.highlightTheme.tokens[t.className ?? 'token']}
								>{t.value}</span
							>{/each}</span
					>{/each}</code
			></pre>
	</div>
</div>
