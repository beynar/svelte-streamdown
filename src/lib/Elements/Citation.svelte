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
	import { get } from '$lib/utils/get.js';

	const {
		token
	}: {
		token: CitationToken;
	} = $props();
	const streamdown = useStreamdown();
	const id = $props.id();
	const popover = new Popover();

	const citationWithSources = $derived.by(() => {
		return token.keys.reduce((acc, key) => {
			const source = get<Record<string, any>>(streamdown.sources, key);
			const safeUrl = (url: string | null) => {
				if (url == null) return null;
				try {
					return new URL(url);
				} catch (error) {
					return null;
				}
			};
			if (source) {
				const url = safeUrl(source.url ?? source.href ?? source.link ?? source.source);
				acc.push({
					key,
					title: source.title ?? source.name ?? source.author ?? null,
					url,
					host: url ? url.host.replace('www.', '') : null,
					favicon: url ? `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128` : null,
					content: source.content ?? source.text ?? source.summary ?? source.excerpt ?? null,
					source
				});
			}
			return acc;
		}, [] as CitationWithSource[]);
	});
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
		get items() {
			return citationWithSources;
		},
		keyFramesOptions: { duration: 200, easing: 'ease-in-out', fill: 'forwards' }
	});

	type CitationWithSource = Record<string, any> & {
		key: string;
		title: string | null;
		url: URL | null;
		favicon: string | null;
		content: string | null;
		source: Record<string, any>;
	};
</script>

{#if popover.isOpen}
	<dialog
		id={'citation-popover-' + id}
		aria-modal="false"
		transition:scale|global={{ start: 0.95, duration: 200 }}
		{@attach clickOutside.attachment}
		{@attach popover.popoverAttachment}
		open
		class={`${streamdown.theme.components.popover}`}
		style:max-width="400px"
	>
		<Slot
			props={{
				token,
				isOpen: popover.isOpen
			}}
			render={streamdown.snippets.inlineCitationPopover}
		>
			{#if streamdown.inlineCitationsMode === 'carousel'}
				{@render carouselView()}
			{:else}
				{@render listView()}
			{/if}
		</Slot>
	</dialog>
{/if}

{#snippet listView()}
	<div class={streamdown.theme.inlineCitation.list.base}>
		{#each citationWithSources as { favicon, key, source, title, url }}
			<Slot render={streamdown.snippets.inlineCitationContent} props={{ source, key, token }}>
				<a
					class={streamdown.theme.inlineCitation.list.item}
					href={url?.toString()}
					target="_blank"
					rel="noopener noreferrer"
				>
					{#if title}
						<span class={streamdown.theme.inlineCitation.list.title}>{title}</span>
					{/if}
					{#if url}
						<span class={streamdown.theme.inlineCitation.list.url}>
							{#if favicon}
								<img
									src={favicon}
									alt={title || url.host}
									class={streamdown.theme.inlineCitation.list.favicon}
								/>
							{/if}
							{url.host}{url.pathname === '/' ? '' : url.pathname}
						</span>
					{/if}
				</a>
			</Slot>
		{/each}
	</div>
{/snippet}

{#snippet carouselView()}
	{#if citationWithSources.length > 1}
		<div class={streamdown.theme.inlineCitation.carousel.header}>
			<div class={streamdown.theme.inlineCitation.carousel.stepCounter}>
				{stepper.activeStep + 1}
				/ {citationWithSources.length}
			</div>
			<div class={streamdown.theme.inlineCitation.carousel.buttons}>
				<button class={streamdown.theme.components.button} onclick={() => stepper.previous()}>
					{@render (streamdown.icons?.chevronLeft || chevronLeft)()}
				</button>
				<button class={streamdown.theme.components.button} onclick={() => stepper.next()}>
					{@render (streamdown.icons?.chevronRight || chevronRight)()}
				</button>
			</div>
		</div>
	{/if}
	<div
		use:stepper.scroller
		style:height={Number.isFinite(stepper.stepHeights[stepper.activeStep])
			? `${stepper.stepHeights[stepper.activeStep]}px`
			: 'auto'}
		style:overflow="hidden"
		style:position="relative"
		style:transition-duration="200ms"
		style:transition-timing-function="ease-in-out"
		aria-label="Citations-${id}"
	>
		<div
			bind:this={stepper.stepContainer}
			style:display="grid"
			style:transition-duration={`${200}ms`}
			style:width="100%"
			style:grid-template-columns="repeat({citationWithSources.length}, 100%)"
		>
			{#each citationWithSources as { favicon, key, source, title, url, content }, index}
				<div
					bind:offsetHeight={stepper.stepHeights[index]}
					data-step={index}
					tabindex={stepper.activeStep === index ? 0 : -1}
					inert={stepper.activeStep !== index}
					role="tabpanel"
					style:height="fit-content"
					style:width="100%"
					style:flex-grow="1"
					aria-label="Citation-${id}"
				>
					<Slot render={streamdown.snippets.inlineCitationContent} props={{ source, key, token }}>
						{#if url || title}
							<div class="mb-4">
								{#if title}
									<div class={streamdown.theme.inlineCitation.carousel.title}>
										{title}
									</div>
								{/if}
								{#if url}
									<a
										href={url.toString()}
										target="_blank"
										rel="noopener noreferrer"
										class={streamdown.theme.inlineCitation.carousel.url}
									>
										{#if favicon}
											<img
												src={favicon}
												alt={title || url.host}
												class={streamdown.theme.inlineCitation.carousel.favicon}
											/>
										{/if}
										<!-- Skip search params -->
										{url.host}{url.pathname === '/' ? '' : url.pathname}
									</a>
								{/if}
							</div>
						{/if}
						{#if content}
							<Block block={content} />
						{/if}
					</Slot>
				</div>
			{/each}
		</div>
	</div>
{/snippet}

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
{/if}
