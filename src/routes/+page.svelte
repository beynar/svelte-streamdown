<script lang="ts">
	import Streamdown from '$lib/Streamdown.svelte';
	import { useTheme } from 'svelte-themes';

	let { data } = $props();

	let content = $state(data.readme);
	let isStreaming = $state(false);
	let streamingProgress = $state(0);
	let cancelRequested = $state(false);
	let progress = $state(10);

	// Update content based on progress percentage
	$effect(() => {
		if (!isStreaming) {
			const totalLength = data.readme.length;
			const showLength = Math.floor((progress / 100) * totalLength);
			content = data.readme.slice(0, showLength);
		}
	});

	const simulateStreaming = async () => {
		if (isStreaming) return;

		isStreaming = true;
		cancelRequested = false;
		content = '';
		streamingProgress = 0;

		// Split by words and whitespace/newlines for more realistic streaming
		const tokens = data.readme.split(/(\s+|\n+)/);
		const totalTokens = tokens.length;

		for (let i = 0; i < tokens.length; i++) {
			if (cancelRequested) break;
			const token = tokens[i];
			content += token;

			streamingProgress = Math.round(((i + 1) / totalTokens) * 100);

			// Calculate delay based on token type
			let delay = streamSpeed; // Base delay for words

			// Add some randomness (±30ms) to make it feel more natural
			delay += (Math.random() - 0.5) * 10;

			// Ensure minimum delay
			delay = Math.max(delay, 1);

			await new Promise((resolve) => setTimeout(resolve, delay));

			if (cancelRequested) {
				break;
			} else {
				window.scrollTo({
					top: document.body.scrollHeight
				});
			}
		}

		isStreaming = false;
		if (!cancelRequested) {
			streamingProgress = 100;
		}
	};

	const stopStreaming = () => {
		if (!isStreaming) return;
		cancelRequested = true;
	};

	let streamSpeed = $state(2); // Default speed in milliseconds

	const theme = useTheme();
</script>

<div
	class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="flex items-center gap-2">
		<button
			class="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
			onclick={() => (theme.theme = theme.resolvedTheme === 'dark' ? 'light' : 'dark')}
		>
			{theme.resolvedTheme === 'dark' ? '☀️ Light' : '🌙 Dark'}
		</button>
		<button
			class="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
			onclick={() => simulateStreaming()}
			disabled={isStreaming}
		>
			{isStreaming ? `⏳ ${streamingProgress}%` : '▶️ Stream'}
		</button>
		<button
			class="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
			onclick={() => stopStreaming()}
			disabled={!isStreaming}
		>
			⏹️ Stop
		</button>
		<button
			class="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
			onclick={() => {
				stopStreaming();
				content = data.readme;
			}}
		>
			📄 Show All
		</button>
		<button
			class="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
			onclick={() => {
				stopStreaming();
				content = '';
			}}
		>
			🗑️ Clear
		</button>

		<div class="ml-4 flex items-center gap-2">
			<label for="speed-slider" class="text-xs text-muted-foreground">Speed:</label>
			<input
				id="speed-slider"
				type="range"
				min="1"
				max="50"
				step="1"
				bind:value={streamSpeed}
				disabled={isStreaming}
				class="h-2 w-20 cursor-pointer appearance-none rounded-lg bg-muted outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-foreground [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:transition-colors hover:[&::-webkit-slider-thumb]:bg-foreground/80"
			/>
			<span class="w-8 text-xs text-muted-foreground">{streamSpeed}ms</span>
		</div>
	</div>
	<div class="ml-4 flex w-full flex-1 items-center gap-2">
		<label for="progress-slider" class="text-xs text-muted-foreground">Progress:</label>
		<input
			id="progress-slider"
			type="range"
			min="0"
			max="100"
			step="0.5"
			bind:value={progress}
			disabled={isStreaming}
			class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-foreground [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:transition-colors hover:[&::-webkit-slider-thumb]:bg-foreground/80"
		/>
		<span class="w-8 text-xs text-muted-foreground">{progress}%</span>
	</div>

	<div>
		<a
			class="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
			href="https://github.com/beynar/svelte-streamdown"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="size-6"
				><path
					d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
				/><path d="M9 18c-4.51 2-5-2-7-2" /></svg
			>
			GitHub
		</a>
	</div>
</div>

<div class="pr-10 pl-10">
	<div
		class="mx-auto max-w-4xl border border-t-0 border-dashed border-border px-4 pt-10 [&>h1]:mt-0"
	>
		{content}
		<Streamdown
			animation={{
				enabled: true
			}}
			baseTheme="shadcn"
			mermaidConfig={{
				theme: theme.resolvedTheme === 'dark' ? 'dark' : 'default'
			}}
			shikiTheme={theme.resolvedTheme === 'dark' ? 'github-dark' : 'github-light'}
			shikiPreloadThemes={['github-dark', 'github-light']}
			allowedLinkPrefixes={['*']}
			{content}
		/>
	</div>
</div>
