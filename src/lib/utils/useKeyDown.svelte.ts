import { on } from 'svelte/events';

export const useKeyDown = (opts: { isActive: boolean; callback: () => void; keys: string[] }) => {
	let listener: (() => void) | null;

	const eventCallback = (event: KeyboardEvent) => {
		if (opts.keys.includes(event.key)) {
			event.preventDefault();
			opts.callback();
		}
	};

	$effect(() => {
		if (opts.isActive && !listener) {
			listener = on(window, 'keydown', eventCallback);
		} else {
			listener?.();
			listener = null;
		}

		return () => {
			listener?.();
			listener = null;
		};
	});
};
