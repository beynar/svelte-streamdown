import { useClickOutside } from '$lib/utils/useClickOutside.svelte.js';
import { autoPlacement, computePosition, autoUpdate, hide, offset, shift } from '@floating-ui/dom';
import { setContext } from 'svelte';

export class Popover {
	isOpen = $state(false);
	content = $state<HTMLDialogElement>();
	reference = $state<HTMLButtonElement>();

	constructor() {
		setContext('POPOVER', true);
	}
	place = async (node: HTMLElement) => {
		const middleware = [
			hide(),
			offset(10),
			shift({
				mainAxis: true
			}),
			autoPlacement({
				allowedPlacements: ['top', 'top-end', 'top-start', 'bottom', 'bottom-end', 'bottom-start']
			})
		];
		const { x, y, strategy, placement, middlewareData } = await computePosition(
			this.reference!,
			node,
			{
				strategy: 'fixed',
				middleware
			}
		);

		Object.assign(node.style, {
			position: strategy,
			left: `${x}px`,
			top: `${y}px`
		});
	};

	popoverAttachment = (node: HTMLDialogElement) => {
		this.content = node;
		void this.place(node);
		const off = autoUpdate(this.reference!, node, () => this.place(node));
		return () => {
			off();
		};
	};
}
