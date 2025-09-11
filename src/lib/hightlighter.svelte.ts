import { type BundledLanguage, type BundledTheme } from 'shiki';
import { untrack } from 'svelte';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { StreamdownContext, useStreamdown } from './Streamdown.svelte';

// Remove background styles from <pre> tags (inline style)
const removePreBackground = (html: string) => {
	return html.replace(/<pre[^>]*style="[^"]*background[^";]*;?[^"]*"[^>]*>/g, (match) =>
		match.replace(/style="[^"]*background[^";]*;?[^"]*"/, '')
	);
};

export const loadShiki = async () => {
	return Promise.all([
		import('shiki/engine/javascript').then((mod) =>
			mod.createJavaScriptRegexEngine({ forgiving: true })
		),
		import('shiki').then((mod) => mod.createHighlighter)
	]);
};

type Engine = Awaited<ReturnType<typeof loadShiki>>[0];
type CreateHighlighter = Awaited<ReturnType<typeof loadShiki>>[1];

type Highlighter = Awaited<ReturnType<CreateHighlighter>>;

class HighlighterManager {
	initialized = $state(false);
	private highlighter: Highlighter | null = null;
	private highlighters = new SvelteMap<string, Highlighter>();
	private createHighlighter: CreateHighlighter | null = null;
	private engine: Engine | null = null;
	preloadedThemes: BundledTheme[];
	loadedLanguages = new SvelteSet<BundledLanguage>();
	loadedThemes = new SvelteSet<BundledTheme>();

	constructor(preloadedThemes: BundledTheme[]) {
		this.preloadedThemes = preloadedThemes;
		if (typeof window !== 'undefined') {
			Object.assign(window, {
				STREAMDOWN_HIGHLIGHTER: this
			});
		}
	}

	isReady(theme: BundledTheme, language: BundledLanguage): boolean {
		return this.highlighters.has(`${theme}:${language}`);
	}

	/**
	 * Preloads themes by creating minimal highlighter instances.
	 * This reduces flickering when switching themes.
	 */
	async preloadThemes(themes: BundledTheme[], language: BundledLanguage): Promise<void> {
		if (!themes.length) {
			return;
		}

		await Promise.all(
			themes
				.filter((theme) => !this.highlighters.has(`${theme}:${language}`))
				.map(async (theme) => {
					if (!this.createHighlighter || !this.engine) {
						return;
					}
					const highlighter = await this.createHighlighter?.({
						themes: [theme],
						langs: [language],
						engine: this.engine
					});
					this.highlighters.set(`${theme}:${language}`, highlighter);
				})
		);
	}

	/**
	 * Ensures the highlighter is ready for the given theme and language.
	 */
	async load(theme: BundledTheme, language: BundledLanguage): Promise<void> {
		return untrack(async () => {
			if (!this.createHighlighter || !this.engine) {
				const [engine, createHighlighter] = await loadShiki();
				this.createHighlighter = createHighlighter;
				this.engine = engine;
			}

			if (!this.highlighters.has(`${theme}:${language}`)) {
				const highlighter = await this.createHighlighter({
					themes: [theme],
					langs: [language],
					engine: this.engine
				});
				this.highlighters.set(`${theme}:${language}`, highlighter);
			}

			void this.preloadThemes(this.preloadedThemes || [], language);
		});
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
		const highlighter = this.highlighters.get(`${theme}:${language}`);
		if (!highlighter) {
			return '';
		}

		let html = highlighter.codeToHtml(code, {
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

	static create(preloadedThemes: BundledTheme[]): HighlighterManager {
		if (typeof window !== 'undefined' && 'STREAMDOWN_HIGHLIGHTER' in window) {
			const previousHighlighter = window.STREAMDOWN_HIGHLIGHTER as HighlighterManager;
			previousHighlighter.preloadedThemes = Array.from(
				new Set([...previousHighlighter.preloadedThemes, ...preloadedThemes])
			);
			// @ts-ignore
			return window.STREAMDOWN_HIGHLIGHTER!;
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
