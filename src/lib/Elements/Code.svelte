<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { save } from '$lib/utils/save.js';
	import { useCopy } from '$lib/utils/copy.svelte.js';
	import { highlightLines, languageExtensionMap } from '$lib/utils/hightlighter.svelte.js';
	import type { CodeToken } from '$lib/marked/index.js';
	import { usePinnedScroll } from '$lib/utils/usePinnedScroll.svelte.js';
	import { checkIcon, copyIcon, downloadIcon } from './icons.js';
	import { srOnly } from './srOnly.js';

	const {
		token,
		id,
		incomplete = false
	}: {
		token: CodeToken;
		id: string;
		/** The fence is still being streamed; nothing below it is final yet. */
		incomplete?: boolean;
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
			const base = streamdown.controls.codeDownloadFilename;
			const filename = `${typeof base === 'function' ? base(token) : base}.${extension}`;
			const mimeType = 'text/plain';
			save(filename, code, mimeType);
		} catch (error) {
			console.error('Failed to download file:', error);
		}
	};

	const lines = $derived(highlightLines(code, token.lang, streamdown.highlightLanguages));

	// `pre` is already the horizontal scroll container, so capping it there keeps
	// one scrollable box for both axes (and the horizontal scrollbar visible).
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
	style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
	class={streamdown.theme.code.base}
>
	<div class={streamdown.theme.code.header}>
		<span class={streamdown.theme.code.language}>{token.lang}</span>
		{#if streamdown.controls.codeCopy || streamdown.controls.codeDownload}
			<div class={streamdown.theme.code.buttons}>
				{#if streamdown.controls.codeDownload}
					<button
						class={streamdown.theme.components.button}
						onclick={downloadCode}
						title={streamdown.translations.controls.downloadCode}
						aria-label={streamdown.translations.controls.downloadCode}
						type="button"
					>
						{@render (streamdown.icons?.download || downloadIcon)()}
					</button>
				{/if}

				{#if streamdown.controls.codeCopy}
					<button
						class={streamdown.theme.components.button}
						onclick={copy.copy}
						title={streamdown.translations.controls.copyCode}
						aria-label={streamdown.translations.controls.copyCode}
						type="button"
					>
						{#if copy.isCopied}
							{@render (streamdown.icons?.check || checkIcon)()}
						{:else}
							{@render (streamdown.icons?.copy || copyIcon)()}
						{/if}
					</button>
				{/if}
				<span aria-live="polite" style={srOnly}
					>{copy.isCopied ? streamdown.translations.controls.copiedCode : ''}</span
				>
			</div>
		{/if}
	</div>
	<div style="height: fit-content; width: 100%;" class={streamdown.theme.code.container}>
		<pre
			class={streamdown.theme.code.pre}
			style:max-height={streamdown.codeBlockMaxHeight}
			style:overflow-y={streamdown.codeBlockMaxHeight ? 'auto' : undefined}
			{@attach pinnedScroll}><code
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
