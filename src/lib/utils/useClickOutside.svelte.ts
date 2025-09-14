import { SvelteSet } from 'svelte/reactivity';
import { on } from 'svelte/events';

type ClickOutsideHandlerOptions = {
	isActive: boolean;
	callback: () => void;
};

export const useClickOutside = (props: ClickOutsideHandlerOptions) => {
	const refs = new SvelteSet<HTMLElement>();
	let listener: (() => void) | null = null;
	const onClickOutside = (e: PointerEvent) => {
		let inRef = false;
		if (props.isActive) {
			const path = e.composedPath();
			path.forEach((node) => {
				refs.forEach((ref) => {
					if (ref instanceof Node && node instanceof Node && ref?.isSameNode(node as HTMLElement)) {
						inRef = true;
					}
				});
			});

			if (!inRef) {
				props.callback();
			}
		}
	};

	return {
		get attachment() {
			return props.isActive
				? (node: HTMLElement) => {
						refs.add(node);
						if (!listener) {
							listener = on(node.ownerDocument, 'pointerdown', onClickOutside);
						}
						return () => {
							refs.delete(node);
							if (listener && refs.size === 0) {
								listener();
								listener = null;
								console.log('clean up', listener);
							}
						};
					}
				: null;
		}
	};
};
