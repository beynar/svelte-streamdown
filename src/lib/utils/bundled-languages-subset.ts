/**
 * Curated subset of the most commonly used Shiki languages
 * This reduces bundle size while covering the most essential languages
 */
export const bundledLanguagesSubset = [
	// Web Technologies (Essential)
	{
		id: 'html',
		name: 'HTML',
		import: () => import('shiki/langs/html.mjs')
	},
	{
		id: 'css',
		name: 'CSS',
		import: () => import('shiki/langs/css.mjs')
	},
	{
		id: 'javascript',
		name: 'JavaScript',
		aliases: ['js'],
		import: () => import('shiki/langs/javascript.mjs')
	},
	{
		id: 'typescript',
		name: 'TypeScript',
		aliases: ['ts'],
		import: () => import('shiki/langs/typescript.mjs')
	},
	{
		id: 'jsx',
		name: 'JSX',
		import: () => import('shiki/langs/jsx.mjs')
	},
	{
		id: 'tsx',
		name: 'TSX',
		import: () => import('shiki/langs/tsx.mjs')
	},
	{
		id: 'vue',
		name: 'Vue',
		import: () => import('shiki/langs/vue.mjs')
	},
	{
		id: 'svelte',
		name: 'Svelte',
		import: () => import('shiki/langs/svelte.mjs')
	},
	{
		id: 'json',
		name: 'JSON',
		import: () => import('shiki/langs/json.mjs')
	},
	{
		id: 'yaml',
		name: 'YAML',
		aliases: ['yml'],
		import: () => import('shiki/langs/yaml.mjs')
	},
	{
		id: 'xml',
		name: 'XML',
		import: () => import('shiki/langs/xml.mjs')
	},

	// Popular Programming Languages
	{
		id: 'python',
		name: 'Python',
		aliases: ['py'],
		import: () => import('shiki/langs/python.mjs')
	},
	{
		id: 'java',
		name: 'Java',
		import: () => import('shiki/langs/java.mjs')
	},
	{
		id: 'csharp',
		name: 'C#',
		aliases: ['c#', 'cs'],
		import: () => import('shiki/langs/csharp.mjs')
	},
	{
		id: 'cpp',
		name: 'C++',
		aliases: ['c++'],
		import: () => import('shiki/langs/cpp.mjs')
	},
	{
		id: 'c',
		name: 'C',
		import: () => import('shiki/langs/c.mjs')
	},
	{
		id: 'go',
		name: 'Go',
		import: () => import('shiki/langs/go.mjs')
	},
	{
		id: 'rust',
		name: 'Rust',
		aliases: ['rs'],
		import: () => import('shiki/langs/rust.mjs')
	},
	{
		id: 'php',
		name: 'PHP',
		import: () => import('shiki/langs/php.mjs')
	},
	{
		id: 'ruby',
		name: 'Ruby',
		aliases: ['rb'],
		import: () => import('shiki/langs/ruby.mjs')
	},
	{
		id: 'swift',
		name: 'Swift',
		import: () => import('shiki/langs/swift.mjs')
	},
	{
		id: 'kotlin',
		name: 'Kotlin',
		aliases: ['kt', 'kts'],
		import: () => import('shiki/langs/kotlin.mjs')
	},
	{
		id: 'dart',
		name: 'Dart',
		import: () => import('shiki/langs/dart.mjs')
	},

	// Shell & Scripting
	{
		id: 'shellscript',
		name: 'Shell',
		aliases: ['bash', 'sh', 'shell', 'zsh'],
		import: () => import('shiki/langs/shellscript.mjs')
	},
	{
		id: 'powershell',
		name: 'PowerShell',
		aliases: ['ps', 'ps1'],
		import: () => import('shiki/langs/powershell.mjs')
	},
	{
		id: 'docker',
		name: 'Dockerfile',
		aliases: ['dockerfile'],
		import: () => import('shiki/langs/docker.mjs')
	},

	// Data & Configuration
	{
		id: 'sql',
		name: 'SQL',
		import: () => import('shiki/langs/sql.mjs')
	},
	{
		id: 'graphql',
		name: 'GraphQL',
		aliases: ['gql'],
		import: () => import('shiki/langs/graphql.mjs')
	},
	{
		id: 'toml',
		name: 'TOML',
		import: () => import('shiki/langs/toml.mjs')
	},
	{
		id: 'ini',
		name: 'INI',
		aliases: ['properties'],
		import: () => import('shiki/langs/ini.mjs')
	},

	// Documentation & Markup
	{
		id: 'markdown',
		name: 'Markdown',
		aliases: ['md'],
		import: () => import('shiki/langs/markdown.mjs')
	},
	{
		id: 'mdx',
		name: 'MDX',
		import: () => import('shiki/langs/mdx.mjs')
	},
	{
		id: 'latex',
		name: 'LaTeX',
		import: () => import('shiki/langs/latex.mjs')
	},

	// Specialized Languages
	{
		id: 'mermaid',
		name: 'Mermaid',
		aliases: ['mmd'],
		import: () => import('shiki/langs/mermaid.mjs')
	},
	{
		id: 'diff',
		name: 'Diff',
		import: () => import('shiki/langs/diff.mjs')
	},
	{
		id: 'log',
		name: 'Log file',
		import: () => import('shiki/langs/log.mjs')
	},

	// Functional & Specialized
	{
		id: 'haskell',
		name: 'Haskell',
		aliases: ['hs'],
		import: () => import('shiki/langs/haskell.mjs')
	},
	{
		id: 'clojure',
		name: 'Clojure',
		aliases: ['clj'],
		import: () => import('shiki/langs/clojure.mjs')
	},
	{
		id: 'scala',
		name: 'Scala',
		import: () => import('shiki/langs/scala.mjs')
	},
	{
		id: 'elixir',
		name: 'Elixir',
		import: () => import('shiki/langs/elixir.mjs')
	},
	{
		id: 'lua',
		name: 'Lua',
		import: () => import('shiki/langs/lua.mjs')
	},
	{
		id: 'r',
		name: 'R',
		import: () => import('shiki/langs/r.mjs')
	},
	{
		id: 'julia',
		name: 'Julia',
		aliases: ['jl'],
		import: () => import('shiki/langs/julia.mjs')
	},
	{
		id: 'matlab',
		name: 'MATLAB',
		import: () => import('shiki/langs/matlab.mjs')
	},

	// Build & Config Tools
	{
		id: 'make',
		name: 'Makefile',
		aliases: ['makefile'],
		import: () => import('shiki/langs/make.mjs')
	},
	{
		id: 'cmake',
		name: 'CMake',
		import: () => import('shiki/langs/cmake.mjs')
	},
	{
		id: 'nginx',
		name: 'Nginx',
		import: () => import('shiki/langs/nginx.mjs')
	},
	{
		id: 'apache',
		name: 'Apache Conf',
		import: () => import('shiki/langs/apache.mjs')
	},

	// Version Control
	{
		id: 'git-commit',
		name: 'Git Commit Message',
		import: () => import('shiki/langs/git-commit.mjs')
	},
	{
		id: 'git-rebase',
		name: 'Git Rebase Message',
		import: () => import('shiki/langs/git-rebase.mjs')
	},
	{
		id: 'text',
		name: 'Text',
		import: () => import('shiki/langs/markdown.mjs')
	},
	{
		id: 'markdown',
		name: 'Markdown',
		import: () => import('shiki/langs/markdown.mjs')
	}
];

// Create a map for quick lookup
export const bundledLanguagesSubsetMap = new Map(
	bundledLanguagesSubset.map((lang) => [lang.id, lang])
);

// Helper function to check if a language is in our subset
export function isLanguageInSubset(language: string): boolean {
	return bundledLanguagesSubsetMap.has(language);
}

// Get all language IDs from the subset
export function getSubsetLanguageIds(): string[] {
	return bundledLanguagesSubset.map((lang) => lang.id);
}
