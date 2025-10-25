import type { BundledLanguage, BundledTheme, HighlighterGeneric, ThemedToken } from 'shiki';
import { bundledLanguagesSubset, isLanguageInSubset } from './bundled-languages-subset.js';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

export const loadShiki = async () => {
	return Promise.all([
		import('shiki/engine/javascript').then((mod) =>
			mod.createJavaScriptRegexEngine({ forgiving: true })
		),
		import('shiki').then((mod) => mod.createHighlighter)
	]);
};

export type Highlighter = HighlighterGeneric<BundledLanguage, BundledTheme>;

class HighlighterManager {
	loadedLanguages = new SvelteMap<BundledLanguage, Promise<void> | boolean>();
	loadedThemes = new SvelteMap<BundledTheme, Promise<void> | boolean>();
	preloadedThemes = new SvelteSet<BundledTheme>();
	highlighter = $state<Highlighter | Promise<Highlighter> | null>(null);

	constructor(preloadedThemes: BundledTheme[]) {
		preloadedThemes.forEach((theme) => this.preloadedThemes.add(theme));

		if (typeof window !== 'undefined') {
			Object.assign(window, {
				STREAMDOWN_HIGHLIGHTER: this
			});
		}
	}

	private async loadHighlighter(): Promise<Highlighter> {
		if (this.highlighter instanceof Promise) {
			return this.highlighter;
		} else if (!this.highlighter) {
			this.highlighter = new Promise<Highlighter>((resolve, reject) => {
				loadShiki().then(([engine, createHighlighter]) => {
					return createHighlighter({
						themes: [],
						langs: bundledLanguagesSubset.map((lang) => lang.id),
						engine
					}).then((highlighter) => {
						this.highlighter = highlighter;
						resolve(highlighter);
					});
				});
			});

			return this.highlighter;
		} else {
			return this.highlighter;
		}
	}
	private async loadTheme(theme: BundledTheme, highlighter: Highlighter): Promise<void> {
		const themeLoader = this.loadedThemes.get(theme);
		if (themeLoader instanceof Promise) {
			await themeLoader;
		} else {
			const themeLoaderPromise = highlighter!.loadTheme(theme).then(() => {
				this.loadedThemes.set(theme, true);
			});

			this.loadedThemes.set(theme, themeLoaderPromise);
			await themeLoaderPromise;
		}
	}

	private async loadLanguage(language: BundledLanguage, highlighter: Highlighter): Promise<void> {
		const languageLoader = this.loadedLanguages.get(language);
		if (languageLoader instanceof Promise) {
			await languageLoader;
		} else {
			const languageLoaderPromise = highlighter!.loadLanguage(language).then(() => {
				this.loadedLanguages.set(language, true);
			});
			this.loadedLanguages.set(language, languageLoaderPromise);
			await languageLoaderPromise;
		}
	}

	private isLanguageSupported = (language: string): language is BundledLanguage => {
		return isLanguageInSubset(language);
	};

	isReady(theme: BundledTheme, language: string | undefined = 'bash'): boolean {
		return (
			!!this.highlighter &&
			!(this.highlighter instanceof Promise) &&
			this.loadedThemes.get(theme) === true &&
			this.loadedLanguages.get(this.isLanguageSupported(language) ? language : 'bash') === true
		);
	}

	/**
	 * Preloads themes by creating minimal highlighter instances.
	 * This reduces flickering when switching themes.
	 */
	async preloadThemes(highlighter: Highlighter): Promise<void> {
		await Promise.all(
			Array.from(this.preloadedThemes).map((theme) => this.loadTheme(theme, highlighter))
		);
	}

	/**
	 * Ensures the highlighter is ready for the given theme and language.
	 */
	async load(theme: BundledTheme, language: string | undefined = 'bash'): Promise<void> {
		const themeLoader = this.loadedThemes.get(theme);
		const languageLoader = this.loadedLanguages.get(
			this.isLanguageSupported(language) ? language : 'bash'
		);
		if (
			this.highlighter !== null &&
			!(this.highlighter instanceof Promise) &&
			themeLoader === true &&
			languageLoader === true
		) {
			return;
		}
		const highlighter = await this.loadHighlighter();
		await Promise.all([
			this.loadTheme(theme, highlighter),
			this.loadLanguage(this.isLanguageSupported(language) ? language : 'bash', highlighter)
		]);
		await this.preloadThemes(highlighter);
	}

	/**
	 * Highlights code synchronously. Must call isReady() first.
	 */
	highlightCode(
		code: string,
		language: string | undefined = 'bash',
		theme: BundledTheme
	): ThemedToken[][] {
		try {
			// const highlighter = this.highlighters.get(`${theme}:${language}`);
			const highlighter = this.highlighter;
			if (!highlighter || highlighter instanceof Promise) {
				return [];
			}

			const tokens = highlighter.codeToTokensBase(code, {
				lang: this.isLanguageSupported(language) ? language : 'bash',
				theme
			});
			return tokens;
		} catch (error) {
			return [];
		}
	}

	static create(preloadedThemes: BundledTheme[] = []): HighlighterManager {
		if (typeof window !== 'undefined' && 'STREAMDOWN_HIGHLIGHTER' in window) {
			const previousHighlighter = window.STREAMDOWN_HIGHLIGHTER as HighlighterManager;
			preloadedThemes.forEach((theme) => previousHighlighter.preloadedThemes.add(theme));
			return previousHighlighter;
		}

		return new HighlighterManager(preloadedThemes);
	}
}

// Export the class for those who want to create their own instances
export { HighlighterManager };

// Filtered language extension map containing only languages from our subset
export const languageExtensionMap: Record<string, string> = {
	// Web Technologies
	html: 'html',
	css: 'css',
	js: 'js',
	javascript: 'js',
	ts: 'ts',
	typescript: 'ts',
	jsx: 'jsx',
	tsx: 'tsx',
	vue: 'vue',
	svelte: 'svelte',
	json: 'json',
	yaml: 'yaml',
	yml: 'yml',
	xml: 'xml',

	// Popular Programming Languages
	py: 'py',
	python: 'py',
	java: 'java',
	cs: 'cs',
	'c#': 'cs',
	csharp: 'cs',
	cpp: 'cpp',
	'c++': 'cpp',
	c: 'c',
	go: 'go',
	rs: 'rs',
	rust: 'rs',
	php: 'php',
	rb: 'rb',
	ruby: 'rb',
	swift: 'swift',
	kt: 'kt',
	kts: 'kts',
	kotlin: 'kt',
	dart: 'dart',

	// Shell & Scripting
	sh: 'sh',
	bash: 'sh',
	shell: 'sh',
	shellscript: 'sh',
	zsh: 'zsh',
	ps: 'ps',
	ps1: 'ps1',
	powershell: 'ps1',
	docker: 'dockerfile',
	dockerfile: 'dockerfile',

	// Data & Configuration
	sql: 'sql',
	gql: 'gql',
	graphql: 'graphql',
	toml: 'toml',
	ini: 'ini',
	properties: 'properties',

	// Documentation & Markup
	md: 'md',
	markdown: 'md',
	mdx: 'mdx',
	tex: 'tex',
	latex: 'tex',

	// Specialized Languages
	mmd: 'mmd',
	mermaid: 'mmd',
	diff: 'diff',
	log: 'log',

	// Functional & Specialized
	hs: 'hs',
	haskell: 'hs',
	clj: 'clj',
	clojure: 'clj',
	scala: 'scala',
	elixir: 'ex',
	lua: 'lua',
	r: 'r',
	jl: 'jl',
	julia: 'jl',
	matlab: 'm',

	// Build & Config Tools
	mak: 'mak',
	make: 'mak',
	makefile: 'mak',
	cmake: 'cmake',
	nginx: 'conf',
	apache: 'conf',

	// Version Control
	'git-commit': 'gitcommit',
	'git-rebase': 'gitrebase'
};
