import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { type BundledLanguage, type BundledTheme, createHighlighter } from 'shiki';
import { SvelteMap } from 'svelte/reactivity';

// Remove background styles from <pre> tags (inline style)
const removePreBackground = (html: string) => {
	return html.replace(/<pre[^>]*style="[^"]*background[^";]*;?[^"]*"[^>]*>/g, (match) =>
		match.replace(/style="[^"]*background[^";]*;?[^"]*"/, '')
	);
};

type HighlighterState = {
	highlighter: Awaited<ReturnType<typeof createHighlighter>>;
	theme: BundledTheme;
	languages: Set<BundledLanguage>;
};

class HighlighterManager {
	initialized = $state(false);
	private state: HighlighterState | null = null;
	private readonly preloadedThemes = new Set<BundledTheme>();
	private readonly readyCache = new SvelteMap<string, boolean>();
	initPromise: Promise<void> | null = $state(null);

	private getCacheKey(theme: BundledTheme, language: BundledLanguage): string {
		return `${theme}:${language}`;
	}

	isLoaded(theme: BundledTheme, language: BundledLanguage): boolean {
		return this.readyCache.get(this.getCacheKey(theme, language)) ?? false;
	}

	/**
	 * Preloads themes by creating minimal highlighter instances.
	 * This reduces flickering when switching themes.
	 */
	async preloadThemes(themes: BundledTheme[]): Promise<void> {
		const promises = themes
			.filter((theme) => !this.preloadedThemes.has(theme))
			.map(async (theme) => {
				try {
					// Create minimal highlighter just to load theme assets
					const preloader = await createHighlighter({
						themes: [theme],
						langs: ['javascript'], // Minimal language for preloading
						engine: createJavaScriptRegexEngine({ forgiving: true })
					});
					preloader.dispose();
					this.preloadedThemes.add(theme);
				} catch (error) {
					console.warn(`Failed to preload theme ${theme}:`, error);
				}
			});

		await Promise.all(promises);
	}

	/**
	 * Ensures the highlighter is ready for the given theme and language.
	 */
	async isReady(theme: BundledTheme, language: BundledLanguage): Promise<void> {
		const cacheKey = this.getCacheKey(theme, language);

		// Return immediately if already ready
		if (this.readyCache.get(cacheKey)) {
			return;
		}

		// Wait for any ongoing initialization
		if (this.initPromise) {
			await this.initPromise;
		}

		// Check again after waiting
		if (this.readyCache.get(cacheKey)) {
			return;
		}

		// Initialize the highlighter
		this.initPromise = this.initialize(theme, language);
		await this.initPromise;
		this.readyCache.set(cacheKey, true);
		this.initialized = true;
		this.initPromise = null;
	}

	private async initialize(theme: BundledTheme, language: BundledLanguage): Promise<void> {
		const needsNewHighlighter = !this.state || this.state.theme !== theme;

		if (needsNewHighlighter) {
			// Dispose old highlighter if it exists
			this.state?.highlighter.dispose();

			// Clear cache when theme changes
			this.readyCache.clear();

			// Create new highlighter with the theme
			const highlighter = await createHighlighter({
				themes: [theme],
				langs: [language],
				engine: createJavaScriptRegexEngine({ forgiving: true })
			});

			this.state = {
				highlighter,
				theme,
				languages: new Set([language])
			};

			// Mark theme as preloaded since we now have it
			this.preloadedThemes.add(theme);
		} else if (this.state && !this.state.languages.has(language)) {
			// Add language to existing highlighter
			await this.state.highlighter.loadLanguage(language);
			this.state.languages.add(language);
		}
	}

	/**
	 * Highlights code synchronously. Must call isReady() first.
	 */
	highlightCode(
		code: string,
		language: BundledLanguage,
		theme: BundledTheme,
		preClassName?: string
	): string {
		if (!this.isLoaded(theme, language)) {
			throw new Error(
				`Highlighter not ready for theme "${theme}" and language "${language}". ` +
					`Call await highlighter.isReady(theme, language) first.`
			);
		}

		if (!this.state) {
			throw new Error(
				'Highlighter not initialized. This should not happen after calling isReady().'
			);
		}

		let html = this.state.highlighter.codeToHtml(code, {
			lang: language,
			theme: theme
		});

		// Remove background and add custom class if needed
		html = removePreBackground(html);

		if (preClassName) {
			html = html.replace(/<pre(\s|>)/, `<pre class="${preClassName}"$1`);
		}

		return html;
	}

	/**
	 * Clean up resources
	 */
	dispose(): void {
		this.state?.highlighter.dispose();
		this.state = null;
		this.readyCache.clear();
		this.preloadedThemes.clear();
		this.initialized = false;
	}
}

// Export the class for those who want to create their own instances
export { HighlighterManager };

// Create and export a singleton instance
export const highlighter = new HighlighterManager();

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
