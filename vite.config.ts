import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { copyFileSync, watchFile } from 'fs';
import { resolve } from 'path';

// Plugin to copy README.md from root to src folder
function copyReadmePlugin() {
	const rootReadme = resolve('README.md');
	const srcReadme = resolve('src/README.md');

	const copyReadme = () => {
		try {
			copyFileSync(rootReadme, srcReadme);
			console.log('📝 Copied README.md to src folder');
		} catch (error) {
			console.error('❌ Failed to copy README.md:', error);
		}
	};

	return {
		name: 'copy-readme',
		buildStart() {
			// Copy on build start
			copyReadme();
		},
		configureServer(server) {
			// Watch and copy during development
			const watcher = watchFile(rootReadme, (curr, prev) => {
				if (curr.mtime !== prev.mtime) {
					copyReadme();
					// Trigger HMR update
					server.ws.send({
						type: 'full-reload'
					});
				}
			});

			// Cleanup on server close
			server.httpServer?.on('close', () => {
				watcher?.close?.();
			});
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson(), copyReadmePlugin()],
	assetsInclude: ['**/*.md'],

	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
