// A link refuses what runs code when followed, and only that: an app's own scheme, `file:` and a
// `data:` file to download are the app's business. `URL` has already read the address as a browser
// will, so `JaVa\tScRiPt:` and a leading space are not a way past it.
const RUNS_CODE: ReadonlySet<string> = new Set(['javascript:', 'vbscript:']);
// The type of a `data:` address, up to its first `,` or `;`, when a browser would draw it as a page.
const DATA_DOCUMENT = /^[^,;]*(?:html|xml)/i;

export const runsCode = ({ protocol, pathname }: URL): boolean =>
	RUNS_CODE.has(protocol) || (protocol === 'data:' && DATA_DOCUMENT.test(pathname));
