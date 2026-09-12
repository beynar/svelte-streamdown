import type { HighlightTheme } from '@tanstack/highlight/theme';
import githubDark from '@tanstack/highlight/themes/github-dark';
import githubLight from '@tanstack/highlight/themes/github-light';

// ponytail: themes live apart from the highlighter so <Streamdown> never pulls in the
// language scanners — those are only reachable from the opt-in <Code> component.
export const DEFAULT_THEMES: Record<string, HighlightTheme> = {
	'github-dark': githubDark,
	'github-light': githubLight
};

/** Resolves the active theme: explicit key, else the first user theme, else the dark-mode default. */
export function resolveHighlightTheme(
	key: string | undefined,
	extra: Record<string, HighlightTheme> | undefined,
	isDark: boolean
): HighlightTheme {
	const themes = { ...DEFAULT_THEMES, ...extra };
	const fallback = DEFAULT_THEMES[isDark ? 'github-dark' : 'github-light'];
	return themes[key ?? (extra ? Object.keys(extra)[0] : fallback.name)] ?? fallback;
}
