export type LanguageInfo = {
	id: string;
	name: string;
	aliases?: string[];
	import: () => Promise<any>;
};

export const bundledLanguagesInfo: LanguageInfo[] = [
	// Web essentials
	{
		id: 'javascript',
		name: 'JavaScript',
		aliases: ['js'],
		import: () => import('@shikijs/langs/javascript')
	},
	{
		id: 'typescript',
		name: 'TypeScript',
		aliases: ['ts'],
		import: () => import('@shikijs/langs/typescript')
	},
	{
		id: 'html',
		name: 'HTML',
		import: () => import('@shikijs/langs/html')
	},
	{
		id: 'css',
		name: 'CSS',
		import: () => import('@shikijs/langs/css')
	},
	{
		id: 'json',
		name: 'JSON',
		import: () => import('@shikijs/langs/json')
	},
	{
		id: 'jsx',
		name: 'JSX',
		import: () => import('@shikijs/langs/jsx')
	},
	{
		id: 'tsx',
		name: 'TSX',
		import: () => import('@shikijs/langs/tsx')
	},
	{
		id: 'markdown',
		name: 'Markdown',
		aliases: ['md'],
		import: () => import('@shikijs/langs/markdown')
	},
	{
		id: 'yaml',
		name: 'YAML',
		aliases: ['yml'],
		import: () => import('@shikijs/langs/yaml')
	},
	{
		id: 'xml',
		name: 'XML',
		import: () => import('@shikijs/langs/xml')
	},
	// Backend languages
	{
		id: 'python',
		name: 'Python',
		aliases: ['py'],
		import: () => import('@shikijs/langs/python')
	},
	{
		id: 'java',
		name: 'Java',
		import: () => import('@shikijs/langs/java')
	},
	{
		id: 'go',
		name: 'Go',
		import: () => import('@shikijs/langs/go')
	},
	{
		id: 'rust',
		name: 'Rust',
		aliases: ['rs'],
		import: () => import('@shikijs/langs/rust')
	},
	{
		id: 'ruby',
		name: 'Ruby',
		aliases: ['rb'],
		import: () => import('@shikijs/langs/ruby')
	},
	{
		id: 'php',
		name: 'PHP',
		import: () => import('@shikijs/langs/php')
	},
	{
		id: 'c',
		name: 'C',
		import: () => import('@shikijs/langs/c')
	},
	{
		id: 'cpp',
		name: 'C++',
		aliases: ['c++'],
		import: () => import('@shikijs/langs/cpp')
	},
	{
		id: 'csharp',
		name: 'C#',
		aliases: ['c#', 'cs'],
		import: () => import('@shikijs/langs/csharp')
	},
	{
		id: 'sql',
		name: 'SQL',
		import: () => import('@shikijs/langs/sql')
	},
	{
		id: 'swift',
		name: 'Swift',
		import: () => import('@shikijs/langs/swift')
	},
	{
		id: 'kotlin',
		name: 'Kotlin',
		aliases: ['kt', 'kts'],
		import: () => import('@shikijs/langs/kotlin')
	},
	// Config/Shell
	{
		id: 'shellscript',
		name: 'Shell',
		aliases: ['bash', 'sh', 'shell', 'zsh'],
		import: () => import('@shikijs/langs/shellscript')
	},
	{
		id: 'docker',
		name: 'Dockerfile',
		aliases: ['dockerfile'],
		import: () => import('@shikijs/langs/docker')
	},
	{
		id: 'toml',
		name: 'TOML',
		import: () => import('@shikijs/langs/toml')
	},
	{
		id: 'graphql',
		name: 'GraphQL',
		aliases: ['gql'],
		import: () => import('@shikijs/langs/graphql')
	},
	{
		id: 'svelte',
		name: 'Svelte',
		import: () => import('@shikijs/langs/svelte')
	},
	{
		id: 'vue',
		name: 'Vue',
		import: () => import('@shikijs/langs/vue')
	}
];

// Helper function to create a Set of all language IDs and aliases from language info
export function createLanguageSet(languages: LanguageInfo[]): Set<string> {
	const set = new Set<string>();
	languages.forEach((lang) => {
		set.add(lang.id);
		if (lang.aliases) {
			lang.aliases.forEach((alias) => set.add(alias));
		}
	});
	return set;
}

// Create a Set of all supported language IDs and aliases for fast lookup (default set)
export const supportedLanguages = createLanguageSet(bundledLanguagesInfo);
