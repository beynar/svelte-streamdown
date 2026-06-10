// Import the README as a raw string: Vite inlines it into the module (works in
// dev and on the Cloudflare adapter) and watches the file itself, so editing
// README.md hot-reloads instead of crashing the dev server with a stale-asset
// 500 (the previous copy-to-src + asset-URL + read() mechanism did exactly that).
import readme from '../../README.md?raw';

export const load = async () => {
	return {
		readme
	};
};
