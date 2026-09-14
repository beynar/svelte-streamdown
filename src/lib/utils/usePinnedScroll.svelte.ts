import { on } from 'svelte/events';

// A scroll position this close to the bottom counts as "at the bottom": browsers
// report fractional scrollTop on zoomed/hi-dpi displays, so an exact compare
// would unpin the container on its own.
const BOTTOM_THRESHOLD_PX = 8;

/**
 * The whole pin/unpin decision, kept pure so it can be tested without a DOM.
 * The user scrolling away from the bottom is what unpins; scrolling back pins
 * again. There is no separate latch: "was the user at the bottom last time they
 * scrolled" is the latch.
 */
export const isAtBottom = (scrollTop: number, scrollHeight: number, clientHeight: number) =>
	scrollHeight - scrollTop - clientHeight < BOTTOM_THRESHOLD_PX;

export interface PinnedScrollOptions {
	/** The resolved max-height; pinning is off (and costs nothing) without one. */
	readonly maxHeight: string | undefined;
	/** Anything that changes when the content grows — re-runs the scroll. */
	readonly content: unknown;
}

/**
 * Attachment that keeps a capped scroll container stuck to the bottom while its
 * content grows, unless the user has scrolled up.
 *
 * Scrolling is always instant: this fires on every streamed chunk, so a smooth
 * animation would never finish before the next one starts (and would ignore
 * `prefers-reduced-motion`).
 */
export const usePinnedScroll = (options: PinnedScrollOptions) => {
	return (node: HTMLElement) => {
		if (!options.maxHeight) return;

		let pinned = true;
		const off = on(
			node,
			'scroll',
			() => {
				pinned = isAtBottom(node.scrollTop, node.scrollHeight, node.clientHeight);
			},
			{ passive: true }
		);

		$effect(() => {
			options.content;
			if (pinned) node.scrollTop = node.scrollHeight;
		});

		return off;
	};
};
