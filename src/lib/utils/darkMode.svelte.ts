import { onMount } from 'svelte';

export const useDarkMode = () => {
	let isDark = $state(false);

	const checkTheme = () => {
		const elements = [document.documentElement, document.body];

		// First check for explicit light mode
		for (const element of elements) {
			if (
				element.classList.contains('light') ||
				element.dataset.theme === 'light' ||
				element.style.colorScheme === 'light'
			) {
				isDark = false;
				return;
			}
		}

		// Then check for dark mode
		for (const element of elements) {
			if (
				element.classList.contains('dark') ||
				element.dataset.theme === 'dark' ||
				element.style.colorScheme === 'dark'
			) {
				isDark = true;
				return;
			}
		}

		// Default to light mode if no explicit theme is set
		isDark = false;
	};

	onMount(() => {
		// Initial check
		checkTheme();

		// Watch for class, attribute, and style changes on html and body
		const observer = new MutationObserver(() => {
			checkTheme();
		});

		const observerOptions: MutationObserverInit = {
			attributes: true,
			attributeFilter: ['class', 'data-theme', 'style']
		};

		observer.observe(document.documentElement, observerOptions);
		observer.observe(document.body, observerOptions);

		return () => {
			observer.disconnect();
		};
	});

	return {
		get current() {
			return isDark;
		}
	};
};
