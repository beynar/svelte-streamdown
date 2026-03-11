import type { ThemedToken, ThemeRegistration } from 'shiki';
import type { HighlighterCore } from 'shiki/core';
import { SvelteMap } from 'svelte/reactivity';
import {
	supportedLanguages,
	createLanguageSet,
	bundledLanguagesInfo,
	type LanguageInfo
} from './bundledLanguages.js';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
// Import default themes directly
import githubDark from '@shikijs/themes/github-dark';
import githubLight from '@shikijs/themes/github-light';

export type Highlighter = HighlighterCore;

// Default themes that are always loaded
const DEFAULT_THEMES = {
	'github-dark': githubDark,
	'github-light': githubLight
};

class HighlighterManager {
	loadedLanguages = new SvelteMap<string, Promise<void> | boolean>();
	highlighter = $state<Highlighter | Promise<Highlighter> | null>(null);
	customLanguages: Set<string>;
	languageLoaders: Map<string, () => Promise<any>>;
	additionalThemes: Record<string, ThemeRegistration>;

	constructor(
		languages: LanguageInfo[],
		additionalThemes?: Record<string, ThemeRegistration>,
		additionalLanguages?: LanguageInfo[]
	) {
		// Store additional themes (will be loaded with highlighter)
		this.additionalThemes = additionalThemes || {};

		// Merge languages: default + additional
		const allLanguages = additionalLanguages ? [...languages, ...additionalLanguages] : languages;
		this.languageLoaders = new Map();
		allLanguages.forEach((l) => {
			this.languageLoaders.set(l.id, l.import);
			if (l.aliases) {
				l.aliases.forEach((alias) => this.languageLoaders.set(alias, l.import));
			}
		});

		// Build custom languages set for validation
		if (additionalLanguages) {
			const additionalSet = createLanguageSet(additionalLanguages);
			this.customLanguages = new Set([...supportedLanguages, ...additionalSet]);
		} else {
			this.customLanguages = supportedLanguages;
		}

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
			this.highlighter = new Promise<Highlighter>(async (resolve, reject) => {
				try {
					const engine = createJavaScriptRegexEngine({ forgiving: true });
					// Load default themes + any additional themes immediately
					const allThemes = [
						...Object.values(DEFAULT_THEMES),
						...Object.values(this.additionalThemes)
					];
					const highlighter = await createHighlighterCore({
						themes: allThemes,
						langs: [],
						engine
					});

					this.highlighter = highlighter;
					resolve(highlighter);
				} catch (error) {
					reject(error);
				}
			});

			return this.highlighter;
		} else {
			return this.highlighter;
		}
	}
	private isThemeAvailable(theme: string): boolean {
		return theme in DEFAULT_THEMES || theme in this.additionalThemes;
	}

	private async loadLanguage(language: string, highlighter: Highlighter): Promise<void> {
		// Skip loading if language is not supported
		if (!this.isLanguageSupported(language)) {
			return;
		}
		const languageLoader = this.loadedLanguages.get(language);
		if (languageLoader instanceof Promise) {
			await languageLoader;
		} else if (!languageLoader) {
			const loader = this.languageLoaders.get(language);
			if (!loader) {
				// Language not available, mark as failed
				this.loadedLanguages.set(language, false);
				return;
			}
			const languageLoaderPromise = loader()
				.then((langModule) => {
					const langObj = langModule.default || langModule;
					return highlighter.loadLanguage(langObj);
				})
				.then(() => {
					this.loadedLanguages.set(language, true);
				})
				.catch((err) => {
					this.loadedLanguages.set(language, false);
					throw err;
				});
			this.loadedLanguages.set(language, languageLoaderPromise);
			await languageLoaderPromise;
		}
	}

	private isLanguageSupported = (language: string): boolean => {
		return this.customLanguages.has(language);
	};

	isReady(theme: string, language: string | undefined): boolean {
		// Check if theme is available
		if (!this.isThemeAvailable(theme)) {
			return false;
		}

		// For unsupported languages, we don't need to load anything (will use plaintext)
		if (!language || !this.isLanguageSupported(language)) {
			return !!this.highlighter && !(this.highlighter instanceof Promise);
		}

		return (
			!!this.highlighter &&
			!(this.highlighter instanceof Promise) &&
			this.loadedLanguages.get(language) === true
		);
	}

	/**
	 * Ensures the highlighter is ready for the given theme and language.
	 */
	async load(theme: string, language: string | undefined): Promise<void> {
		// For unsupported languages, only need to load highlighter (themes are pre-loaded)
		if (!language || !this.isLanguageSupported(language)) {
			if (this.highlighter !== null && !(this.highlighter instanceof Promise)) {
				return;
			}
			await this.loadHighlighter();
			return;
		}

		const languageLoader = this.loadedLanguages.get(language);
		if (
			this.highlighter !== null &&
			!(this.highlighter instanceof Promise) &&
			languageLoader === true
		) {
			return;
		}
		const highlighter = await this.loadHighlighter();
		await this.loadLanguage(language, highlighter);
	}

	/**
	 * Highlights code synchronously. Must call isReady() first.
	 * Returns plaintext tokens for unsupported languages.
	 */
	highlightCode(code: string, language: string | undefined, theme: string): ThemedToken[][] {
		try {
			const highlighter = this.highlighter;
			if (!highlighter || highlighter instanceof Promise) {
				// Return plaintext tokens when highlighter is not ready
				return code.split('\n').map((line) => [
					{
						content: line,
						color: undefined,
						bgColor: undefined
					} as ThemedToken
				]);
			}

			// For unsupported languages, return plaintext tokens
			if (!language || !this.isLanguageSupported(language)) {
				return code.split('\n').map((line) => [
					{
						content: line,
						color: undefined,
						bgColor: undefined
					} as ThemedToken
				]);
			}

			const tokens = highlighter.codeToTokensBase(code, {
				lang: language,
				theme
			});
			return tokens;
		} catch (error) {
			// Return plaintext tokens on error
			return code.split('\n').map((line) => [
				{
					content: line,
					color: undefined,
					bgColor: undefined
				} as ThemedToken
			]);
		}
	}

	static create(
		languages: LanguageInfo[] = bundledLanguagesInfo,
		additionalThemes?: Record<string, ThemeRegistration>,
		additionalLanguages?: LanguageInfo[]
	): HighlighterManager {
		if (typeof window !== 'undefined' && 'STREAMDOWN_HIGHLIGHTER' in window) {
			const previousHighlighter = window.STREAMDOWN_HIGHLIGHTER as HighlighterManager;
			// Merge additional themes
			if (additionalThemes) {
				Object.assign(previousHighlighter.additionalThemes, additionalThemes);
			}
			// Merge additional languages with existing set
			if (additionalLanguages) {
				additionalLanguages.forEach((lang) => {
					previousHighlighter.languageLoaders.set(lang.id, lang.import);
					if (lang.aliases) {
						lang.aliases.forEach((alias) =>
							previousHighlighter.languageLoaders.set(alias, lang.import)
						);
					}
				});
				const additionalSet = createLanguageSet(additionalLanguages);
				additionalSet.forEach((lang) => previousHighlighter.customLanguages.add(lang));
			}
			return previousHighlighter;
		}

		return new HighlighterManager(languages, additionalThemes, additionalLanguages);
	}
}

// Export the class for those who want to create their own instances
export { HighlighterManager };

export const languageExtensionMap: Record<string, string> = {
	'1c': '1c',
	'1c-query': '1cq',
	abap: 'abap',
	'actionscript-3': 'as',
	ada: 'ada',
	adoc: 'adoc',
	'angular-html': 'html',
	'angular-ts': 'ts',
	apache: 'conf',
	apex: 'cls',
	apl: 'apl',
	applescript: 'applescript',
	ara: 'ara',
	asciidoc: 'adoc',
	asm: 'asm',
	astro: 'astro',
	awk: 'awk',
	ballerina: 'bal',
	bash: 'sh',
	bat: 'bat',
	batch: 'bat',
	be: 'be',
	beancount: 'beancount',
	berry: 'berry',
	bibtex: 'bib',
	bicep: 'bicep',
	blade: 'blade.php',
	bsl: 'bsl',
	c: 'c',
	'c#': 'cs',
	'c++': 'cpp',
	cadence: 'cdc',
	cairo: 'cairo',
	cdc: 'cdc',
	clarity: 'clar',
	clj: 'clj',
	clojure: 'clj',
	'closure-templates': 'soy',
	cmake: 'cmake',
	cmd: 'cmd',
	cobol: 'cob',
	codeowners: 'CODEOWNERS',
	codeql: 'ql',
	coffee: 'coffee',
	coffeescript: 'coffee',
	'common-lisp': 'lisp',
	console: 'sh',
	coq: 'v',
	cpp: 'cpp',
	cql: 'cql',
	crystal: 'cr',
	cs: 'cs',
	csharp: 'cs',
	css: 'css',
	csv: 'csv',
	cue: 'cue',
	cypher: 'cql',
	d: 'd',
	dart: 'dart',
	dax: 'dax',
	desktop: 'desktop',
	diff: 'diff',
	docker: 'dockerfile',
	dockerfile: 'dockerfile',
	dotenv: 'env',
	'dream-maker': 'dm',
	edge: 'edge',
	elisp: 'el',
	elixir: 'ex',
	elm: 'elm',
	'emacs-lisp': 'el',
	erb: 'erb',
	erl: 'erl',
	erlang: 'erl',
	f: 'f',
	'f#': 'fs',
	f03: 'f03',
	f08: 'f08',
	f18: 'f18',
	f77: 'f77',
	f90: 'f90',
	f95: 'f95',
	fennel: 'fnl',
	fish: 'fish',
	fluent: 'ftl',
	for: 'for',
	'fortran-fixed-form': 'f',
	'fortran-free-form': 'f90',
	fs: 'fs',
	fsharp: 'fs',
	fsl: 'fsl',
	ftl: 'ftl',
	gdresource: 'tres',
	gdscript: 'gd',
	gdshader: 'gdshader',
	genie: 'gs',
	gherkin: 'feature',
	'git-commit': 'gitcommit',
	'git-rebase': 'gitrebase',
	gjs: 'js',
	gleam: 'gleam',
	'glimmer-js': 'js',
	'glimmer-ts': 'ts',
	glsl: 'glsl',
	gnuplot: 'plt',
	go: 'go',
	gql: 'gql',
	graphql: 'graphql',
	groovy: 'groovy',
	gts: 'gts',
	hack: 'hack',
	haml: 'haml',
	handlebars: 'hbs',
	haskell: 'hs',
	haxe: 'hx',
	hbs: 'hbs',
	hcl: 'hcl',
	hjson: 'hjson',
	hlsl: 'hlsl',
	hs: 'hs',
	html: 'html',
	'html-derivative': 'html',
	http: 'http',
	hxml: 'hxml',
	hy: 'hy',
	imba: 'imba',
	ini: 'ini',
	jade: 'jade',
	java: 'java',
	javascript: 'js',
	jinja: 'jinja',
	jison: 'jison',
	jl: 'jl',
	js: 'js',
	json: 'json',
	json5: 'json5',
	jsonc: 'jsonc',
	jsonl: 'jsonl',
	jsonnet: 'jsonnet',
	jssm: 'jssm',
	jsx: 'jsx',
	julia: 'jl',
	kotlin: 'kt',
	kql: 'kql',
	kt: 'kt',
	kts: 'kts',
	kusto: 'kql',
	latex: 'tex',
	lean: 'lean',
	lean4: 'lean',
	less: 'less',
	liquid: 'liquid',
	lisp: 'lisp',
	lit: 'lit',
	llvm: 'll',
	log: 'log',
	logo: 'logo',
	lua: 'lua',
	luau: 'luau',
	make: 'mak',
	makefile: 'mak',
	markdown: 'md',
	marko: 'marko',
	matlab: 'm',
	md: 'md',
	mdc: 'mdc',
	mdx: 'mdx',
	mediawiki: 'wiki',
	mermaid: 'mmd',
	mips: 's',
	mipsasm: 's',
	mmd: 'mmd',
	mojo: 'mojo',
	move: 'move',
	nar: 'nar',
	narrat: 'narrat',
	nextflow: 'nf',
	nf: 'nf',
	nginx: 'conf',
	nim: 'nim',
	nix: 'nix',
	nu: 'nu',
	nushell: 'nu',
	objc: 'm',
	'objective-c': 'm',
	'objective-cpp': 'mm',
	ocaml: 'ml',
	pascal: 'pas',
	perl: 'pl',
	perl6: 'p6',
	php: 'php',
	plsql: 'pls',
	po: 'po',
	polar: 'polar',
	postcss: 'pcss',
	pot: 'pot',
	potx: 'potx',
	powerquery: 'pq',
	powershell: 'ps1',
	prisma: 'prisma',
	prolog: 'pl',
	properties: 'properties',
	proto: 'proto',
	protobuf: 'proto',
	ps: 'ps',
	ps1: 'ps1',
	pug: 'pug',
	puppet: 'pp',
	purescript: 'purs',
	py: 'py',
	python: 'py',
	ql: 'ql',
	qml: 'qml',
	qmldir: 'qmldir',
	qss: 'qss',
	r: 'r',
	racket: 'rkt',
	raku: 'raku',
	razor: 'cshtml',
	rb: 'rb',
	reg: 'reg',
	regex: 'regex',
	regexp: 'regexp',
	rel: 'rel',
	riscv: 's',
	rs: 'rs',
	rst: 'rst',
	ruby: 'rb',
	rust: 'rs',
	sas: 'sas',
	sass: 'sass',
	scala: 'scala',
	scheme: 'scm',
	scss: 'scss',
	sdbl: 'sdbl',
	sh: 'sh',
	shader: 'shader',
	shaderlab: 'shader',
	shell: 'sh',
	shellscript: 'sh',
	shellsession: 'sh',
	smalltalk: 'st',
	solidity: 'sol',
	soy: 'soy',
	sparql: 'rq',
	spl: 'spl',
	splunk: 'spl',
	sql: 'sql',
	'ssh-config': 'config',
	stata: 'do',
	styl: 'styl',
	stylus: 'styl',
	svelte: 'svelte',
	swift: 'swift',
	'system-verilog': 'sv',
	systemd: 'service',
	talon: 'talon',
	talonscript: 'talon',
	tasl: 'tasl',
	tcl: 'tcl',
	templ: 'templ',
	terraform: 'tf',
	tex: 'tex',
	tf: 'tf',
	tfvars: 'tfvars',
	toml: 'toml',
	ts: 'ts',
	'ts-tags': 'ts',
	tsp: 'tsp',
	tsv: 'tsv',
	tsx: 'tsx',
	turtle: 'ttl',
	twig: 'twig',
	typ: 'typ',
	typescript: 'ts',
	typespec: 'tsp',
	typst: 'typ',
	v: 'v',
	vala: 'vala',
	vb: 'vb',
	verilog: 'v',
	vhdl: 'vhdl',
	vim: 'vim',
	viml: 'vim',
	vimscript: 'vim',
	vue: 'vue',
	'vue-html': 'html',
	'vue-vine': 'vine',
	vy: 'vy',
	vyper: 'vy',
	wasm: 'wasm',
	wenyan: 'wy',
	wgsl: 'wgsl',
	wiki: 'wiki',
	wikitext: 'wiki',
	wit: 'wit',
	wl: 'wl',
	wolfram: 'wl',
	xml: 'xml',
	xsl: 'xsl',
	yaml: 'yaml',
	yml: 'yml',
	zenscript: 'zs',
	zig: 'zig',
	zsh: 'zsh',
	文言: 'wy'
};
