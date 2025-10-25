import {
	type BundledLanguage,
	type BundledTheme,
	type HighlighterGeneric,
	type ThemedToken,
	bundledLanguages
} from 'shiki';
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
						langs: [],
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
		return Object.hasOwn(bundledLanguages, language);
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
