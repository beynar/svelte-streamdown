import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { compile, compileModule } from 'svelte/compiler';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// esbuild is not a dependency of ours; it comes with vite, so resolve it from
// there rather than adding a devDependency just to weigh the bundle.
const esbuild = require(
	require.resolve('esbuild', { paths: [path.dirname(require.resolve('vite/package.json'))] })
) as {
	build(options: Record<string, unknown>): Promise<{ outputFiles: { contents: Uint8Array }[] }>;
	transform(source: string, options: Record<string, unknown>): Promise<{ code: string }>;
};

// esbuild has no idea what a .svelte file is, so hand it the compiler output.
// `svelte` itself stays external: it is a peer dependency the host app already
// ships, so counting it would hide our own growth.
const sveltePlugin = {
	name: 'svelte',
	setup(b: { onLoad(o: { filter: RegExp }, cb: (a: { path: string }) => Promise<unknown>): void }) {
		b.onLoad({ filter: /\.svelte$/ }, async ({ path: file }) => {
			const source = await readFile(file, 'utf8');
			const { js } = compile(source, { filename: file, generate: 'client', css: 'injected' });
			return { contents: js.code, loader: 'js' };
		});
		b.onLoad({ filter: /\.svelte\.[jt]s$/ }, async ({ path: file }) => {
			const source = await readFile(file, 'utf8');
			// compileModule only understands JS, so strip the types first.
			const { code } = await esbuild.transform(source, { loader: 'ts', target: 'esnext' });
			const { js } = compileModule(code, { filename: file, generate: 'client' });
			return { contents: js.code, loader: 'js' };
		});
	}
};

// The three shapes a consumer actually pays for: the root import, the optional
// heavy Code component behind `svelte-streamdown/code`, and the parser layer on
// its own (people embed it without any of our components).
const entries = {
	root: "export * from './src/lib/index.ts';",
	code: "export { default } from './src/lib/Elements/Code.svelte';",
	parser: [
		"export * from './src/lib/marked/index.ts';",
		"export * from './src/lib/utils/parse-incomplete-markdown.ts';"
	].join('\n')
} as const;

export type EntryName = keyof typeof entries;
export type Sizes = Record<EntryName, { min: number; gzip: number }>;

const measure = async (contents: string) => {
	const result = await esbuild.build({
		stdin: { contents, resolveDir: root, loader: 'ts', sourcefile: 'entry.ts' },
		bundle: true,
		minify: true,
		write: false,
		format: 'esm',
		platform: 'browser',
		target: 'es2022',
		legalComments: 'none',
		external: ['svelte', 'svelte/*'],
		alias: { $lib: path.join(root, 'src/lib') },
		plugins: [sveltePlugin]
	});
	const bytes = result.outputFiles[0].contents;
	return { min: bytes.byteLength, gzip: gzipSync(bytes, { level: 9 }).byteLength };
};

/** Minified and gzipped bytes per entry point, as a plain JSON-able object. */
export const measureSizes = async (): Promise<Sizes> => {
	const names = Object.keys(entries) as EntryName[];
	const sizes = await Promise.all(names.map((name) => measure(entries[name])));
	return Object.fromEntries(names.map((name, i) => [name, sizes[i]])) as Sizes;
};
