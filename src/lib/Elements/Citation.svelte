<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import Slot from './Slot.svelte';
	import { useClickOutside } from '$lib/utils/useClickOutside.svelte.js';
	import { scale } from 'svelte/transition';
	import Block from '$lib/Block.svelte';
	import { useKeyDown } from '$lib/utils/useKeyDown.svelte.js';
	import type { CitationToken } from '$lib/marked/marked-citations.js';
	import { StepperState } from './stepperState.svelte.js';
	import { Popover } from './popover.svelte.js';
	let activeStep = $state(0);

	const streamdown = useStreamdown();

	const {
		token
	}: {
		token: CitationToken;
	} = $props();

	const id = $props.id();
	const popover = new Popover();

	const firstKey = $derived(token.keys[0]);
	const firstCitation = $derived(streamdown.sources?.[firstKey] || {});
	const otherKeys = $derived(token.keys.slice(1));
	const citations = $derived(token.keys.map((key) => streamdown.sources?.[key] || {}));

	useKeyDown({
		keys: ['Escape'],
		get isActive() {
			return popover.isOpen;
		},
		callback: () => {
			popover.isOpen = false;
		}
	});
	const clickOutside = useClickOutside({
		get isActive() {
			return popover.isOpen;
		},
		callback: () => {
			popover.isOpen = false;
		}
	});

	const stepper = new StepperState({
		get activeStep() {
			return activeStep;
		},
		set activeStep(value) {
			activeStep = value;
		},
		items: citations,
		onChange: (item) => {
			//
		},
		keyFramesOptions: { duration: 200, easing: 'ease-in-out', fill: 'forwards' }
	});

	type CitationWithSource = Record<string, any> & {
		key: string;
		title: string | null;
		url: URL | null;
		favicon: string | null;
		source: Record<string, any>;
	};
	const citationWithSources = $derived.by(() => {
		return token.keys.reduce((acc, key) => {
			const source = streamdown.sources?.[key];
			if (source) {
				const url = source.url ? new URL(source.url) : null;
				acc.push({
					key,
					title: source.title ?? null,
					url,
					host: url ? url.host.replace('www.', '') : null,
					favicon: url ? `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128` : null,
					source
				});
			}
			return acc;
		}, [] as CitationWithSource[]);
	});
</script>

{#if popover.isOpen}
	<Slot
		props={{
			token,
			isOpen: popover.isOpen
		}}
		render={streamdown.snippets.inlineCitationPopover}
	>
		<dialog
			style="z-index: 1000; position: fixed;"
			id={'citation-popover-' + id}
			aria-modal="false"
			transition:scale|global={{ start: 0.95, duration: 200 }}
			{@attach clickOutside.attachment}
			{@attach popover.popoverAttachment}
			open
			class={`${streamdown.theme.inlineCitation.popover}`}
			style:max-width="400px"
		>
			{#if citations.length > 1}
				<div class="{streamdown.theme.inlineCitation.header} flex items-start justify-between">
					<div
						class="{streamdown.theme.inlineCitation
							.stepCounter} h-fit text-xs font-semibold text-muted-foreground tabular-nums"
					>
						{stepper.activeStep + 1}
						/ {citations.length}
					</div>
					<div class={streamdown.theme.inlineCitation.buttons}>
						<button
							class={streamdown.theme.inlineCitation.button}
							onclick={() => stepper.previous()}
						>
							{@render chevronLeft()}
						</button>
						<button class={streamdown.theme.inlineCitation.button} onclick={() => stepper.next()}>
							{@render chevronRight()}
						</button>
					</div>
				</div>
			{/if}
			<div
				use:stepper.scroller
				style:height="{stepper.stepHeights[activeStep]}px"
				style:overflow="hidden"
				style:position="relative"
				style:transition-duration="200ms"
				style:transition-timing-function="ease-in-out"
			>
				<div
					bind:this={stepper.stepContainer}
					style:display="grid"
					style:transition-duration={`${100}ms`}
					style:width="100%"
					style:grid-template-columns="repeat({citations.length}, 100%)"
				>
					{#each citationWithSources as { favicon, key, source, title, url }, index}
						<div
							bind:offsetHeight={stepper.stepHeights[index]}
							data-step={index}
							tabindex={stepper.activeStep === index ? 0 : -1}
							inert={stepper.activeStep !== index}
							role="tabpanel"
							style:height="fit-content"
							style:width="100%"
							style:flex-grow="1"
							style:focus-outline="none"
							aria-labelledby={`stepper-${index}`}
						>
							<Slot
								render={streamdown.snippets.inlineCitationContent}
								props={{ source, key, token }}
							>
								{#if url || title}
									<div class="mb-4">
										{#if title}
											<div
												class="{streamdown.theme.inlineCitation
													.title} mb-2 line-clamp-2 font-semibold"
											>
												{title}
											</div>
										{/if}
										{#if url}
											<a
												href={url.toString()}
												target="_blank"
												rel="noopener noreferrer"
												class="{streamdown.theme.inlineCitation
													.url} line-clamp-1 flex items-center gap-2 text-sm text-muted-foreground"
											>
												{#if favicon}
													<img
														src={favicon}
														alt={title || url.host}
														class="{streamdown.theme.inlineCitation.favicon} h-4 w-4"
													/>
												{/if}
												<!-- Skip search params -->
												{url.host}{url.pathname === '/' ? '' : url.pathname}
											</a>
										{/if}
									</div>
								{/if}
								{#if source.content}
									<Block block={source.content} />
								{/if}
							</Slot>
						</div>
					{/each}
				</div>
			</div>
		</dialog>
	</Slot>
{/if}

{#snippet chevronRight()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="100%"
		height="100%"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg
	>
{/snippet}

{#snippet chevronLeft()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="100%"
		height="100%"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg
	>
{/snippet}

{#if citationWithSources.length > 0}
	<Slot
		props={{
			token
		}}
		render={streamdown.snippets.inlineCitation}
	>
		<button
			style={streamdown.animationBlockStyle}
			bind:this={popover.reference}
			class={streamdown.theme.inlineCitation.preview}
			onclick={() => (popover.isOpen = !popover.isOpen)}
			aria-expanded={popover.isOpen}
			aria-haspopup="dialog"
			aria-controls={'citation-popover-' + id}
			{@attach clickOutside.attachment}
		>
			<!--  -->
			<Slot
				render={streamdown.snippets.inlineCitationPreview}
				props={{
					token
				}}
			>
				{citationWithSources[0]?.url?.host ??
					citationWithSources[0]?.title ??
					citationWithSources[0]?.key}
				{citationWithSources.length > 1 ? ` +${citationWithSources.length - 1}` : ''}
			</Slot>
		</button>
	</Slot>
{/if}
