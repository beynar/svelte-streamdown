export type LanguageInfo = {
	id: string;
	aliases?: string[];
	import: () => Promise<any>;
};

export const bundledLanguagesInfo: LanguageInfo[] = [
	// Web essentials
	{
		id: 'javascript',
		aliases: ['js'],
		import: () => import('@shikijs/langs/javascript')
	},
	{
		id: 'typescript',
		aliases: ['ts'],
		import: () => import('@shikijs/langs/typescript')
	},
	{
		id: 'html',
		import: () => import('@shikijs/langs/html')
	},
	{
		id: 'css',
		import: () => import('@shikijs/langs/css')
	},
	{
		id: 'json',
		import: () => import('@shikijs/langs/json')
	},
	{
		id: 'jsx',
		import: () => import('@shikijs/langs/jsx')
	},
	{
		id: 'tsx',
		import: () => import('@shikijs/langs/tsx')
	},
	{
		id: 'markdown',
		aliases: ['md'],
		import: () => import('@shikijs/langs/markdown')
	},
	{
		id: 'yaml',
		aliases: ['yml'],
		import: () => import('@shikijs/langs/yaml')
	},
	{
		id: 'xml',
		import: () => import('@shikijs/langs/xml')
	},
	// Backend languages
	{
		id: 'python',
		aliases: ['py'],
		import: () => import('@shikijs/langs/python')
	},
	{
		id: 'java',
		import: () => import('@shikijs/langs/java')
	},
	{
		id: 'go',
		import: () => import('@shikijs/langs/go')
	},
	{
		id: 'rust',
		aliases: ['rs'],
		import: () => import('@shikijs/langs/rust')
	},
	{
		id: 'ruby',
		aliases: ['rb'],
		import: () => import('@shikijs/langs/ruby')
	},
	{
		id: 'php',
		import: () => import('@shikijs/langs/php')
	},
	{
		id: 'c',
		import: () => import('@shikijs/langs/c')
	},
	{
		id: 'cpp',
		aliases: ['c++'],
		import: () => import('@shikijs/langs/cpp')
	},
	{
		id: 'csharp',
		aliases: ['c#', 'cs'],
		import: () => import('@shikijs/langs/csharp')
	},
	{
		id: 'sql',
		import: () => import('@shikijs/langs/sql')
	},
	{
		id: 'swift',
		import: () => import('@shikijs/langs/swift')
	},
	{
		id: 'kotlin',
		aliases: ['kt', 'kts'],
		import: () => import('@shikijs/langs/kotlin')
	},
	// Config/Shell
	{
		id: 'shellscript',
		aliases: ['bash', 'sh', 'shell', 'zsh'],
		import: () => import('@shikijs/langs/shellscript')
	},
	{
		id: 'docker',
		aliases: ['dockerfile'],
		import: () => import('@shikijs/langs/docker')
	},
	{
		id: 'toml',
		import: () => import('@shikijs/langs/toml')
	},
	{
		id: 'graphql',
		aliases: ['gql'],
		import: () => import('@shikijs/langs/graphql')
	},
	{
		id: 'svelte',
		import: () => import('@shikijs/langs/svelte')
	},
	{
		id: 'vue',
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
