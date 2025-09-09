import { onDestroy } from 'svelte';

export const useCopy = (opts: { content: string; timeout?: number }) => {
	let isCopied = $state(false);
	let timeoutId: number | undefined;
	const copy = async () => {
		if (typeof window === 'undefined' || !navigator?.clipboard?.writeText) {
			console.error('Clipboard API not available');
			return;
		}

		try {
			if (!isCopied) {
				await navigator.clipboard.writeText(opts.content);
				isCopied = true;

				if (timeoutId) clearTimeout(timeoutId);
				timeoutId = window.setTimeout(() => {
					isCopied = false;
				}, opts.timeout ?? 2000);
			}
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
		}
	};

	onDestroy(() => {
		if (timeoutId) clearTimeout(timeoutId);
	});

	return {
		get isCopied() {
			return isCopied;
		},
		copy
	};
};
