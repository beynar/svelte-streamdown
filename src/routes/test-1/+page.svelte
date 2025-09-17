<script lang="ts">
	import Streamdown from '$lib/Streamdown.svelte';
	import { useTheme } from 'svelte-themes';

	let { data } = $props();

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
		<Streamdown
			controls={{
				code: false
			}}
			baseTheme="shadcn"
			mermaidConfig={{
				theme: theme.resolvedTheme === 'dark' ? 'dark' : 'default'
			}}
			allowedLinkPrefixes={['*']}
			shikiTheme="vitesse-dark"
			content={`
[testJesuisunsuperlongtextequivafaireplusieurslignesetquivaêtrecoupéparleblocdecodeci-dessus ](https://www.google.com)

First Term
: This is the definition of the first term.

Second Term
: This is one definition of the second term.
: This is another definition of the second term.


			`}
		/>
	</div>
</div>
