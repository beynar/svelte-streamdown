import { useKeyDown } from './useKeyDown.svelte.js';

/**
 * The fullscreen half of the mermaid expand behaviour (Mermaid.svelte:264-267)
 * without panzoom's `expand()`, which is entangled with `zoomToFit` and a FLIP
 * animation a table has no use for: state, Escape and focus only. The
 * `position: fixed` comes from the global
 * `:where([data-streamdown-expandable])[data-expanded='true']` rule in
 * Streamdown.svelte.
 *
 * The flag lives in the caller (so the markup can drive `role`/`aria-*`/the
 * expanded class from it); this only drives it.
 *
 * // ponytail: no open/close animation. Upgrade path: measure the target rect
 * // either side of `set()` and run the same first/last invert panzoom does,
 * // once that block is untangled from the zoom state it reads today.
 */
export const useExpand = (opts: {
	expanded: boolean;
	getTarget: () => HTMLElement | null | undefined;
}) => {
	// The control that opened the overlay, so focus can return to it on close.
	let trigger: HTMLElement | null = null;

	const set = (next: boolean) => {
		const target = opts.getTarget();
		opts.expanded = next;
		if (target) {
			target.dataset.streamdownExpandable = '';
			target.dataset.expanded = String(next);
		}
		if (next) target?.focus();
		else trigger?.focus();
	};

	useKeyDown({
		keys: ['Escape'],
		get isActive() {
			return opts.expanded;
		},
		callback: () => set(false)
	});

	return {
		get expanded() {
			return opts.expanded;
		},
		toggle: (from?: HTMLElement | null) => {
			if (!opts.expanded) trigger = from ?? null;
			set(!opts.expanded);
		}
	};
};
