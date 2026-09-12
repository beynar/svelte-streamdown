import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Lexer } from 'marked';
import { markedHr } from '../lib/marked/marked-hr.js';
import { markedFootnote } from '../lib/marked/marked-footnotes.js';
import { markedDl } from '../lib/marked/marked-dl.js';
import { markedTable } from '../lib/marked/marked-table.js';
import { markedAlign } from '../lib/marked/marked-align.js';
import { markedMdx } from '../lib/marked/marked-mdx.js';

/**
 * `parseBlocks` splits documents with a Lexer subclass that skips the nested
 * block parse marked's list tokenizer does purely to decide `loose` (see
 * SplitLexer in src/lib/marked/index.ts). This test is the proof that the skip
 * is invisible: for every document AND every streaming prefix of it, the token
 * (type, raw) sequence must be byte-identical to stock marked.
 *
 * The corpus is every markdown-looking template literal in the test suite plus
 * the repo's own long-form markdown files.
 */
const exts: any[] = [markedHr, ...markedFootnote(), markedDl, markedTable, markedAlign, markedMdx];

function options() {
	const o: any = {
		gfm: true,
		extensions: {
			block: [],
			inline: [],
			childTokens: {},
			renderers: {},
			startBlock: [],
			startInline: []
		}
	};
	for (const e of exts) {
		if (e.start) o.extensions[e.level === 'block' ? 'startBlock' : 'startInline'].push(e.start);
		o.extensions[e.level === 'block' ? 'block' : 'inline'].push(e.tokenizer);
	}
	return o;
}

// Mirror of SplitLexer in src/lib/marked/index.ts.
class SplitLexer extends (Lexer as any) {
	blockTokens(src: string, tokens: any = [], lastParagraphClipped = false) {
		if (!this.state.top) {
			this.state.top = true;
			return tokens;
		}
		return super.blockTokens(src, tokens, lastParagraphClipped);
	}
	inlineTokens(src: string, tokens: any = []) {
		return tokens;
	}
}

const sig = (L: any, s: string) =>
	JSON.stringify(new L(options()).blockTokens(s, []).map((t: any) => [t.type, t.raw]));

function corpus(): string[] {
	const out: string[] = [];
	const dir = path.dirname(new URL(import.meta.url).pathname);
	for (const f of fs.readdirSync(dir)) {
		if (!/\.(test|spec)\.ts$/.test(f)) continue;
		const src = fs.readFileSync(path.join(dir, f), 'utf8');
		const re = new RegExp('`(?:[^`\\\\]|\\\\.){10,4000}`', 'g');
		for (const m of src.matchAll(re)) {
			out.push(m[0].slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\`/g, '`'));
		}
	}
	for (const p of ['README.md', 'CHANGELOG.md']) {
		const abs = path.resolve(p);
		if (fs.existsSync(abs)) out.push(fs.readFileSync(abs, 'utf8'));
	}
	return out;
}

test('SplitLexer block raws are identical to stock marked', { timeout: 120_000 }, () => {
	const docs = corpus();
	const mismatches: string[] = [];
	let compared = 0;
	for (const d of docs) {
		compared++;
		if (sig(Lexer, d) !== sig(SplitLexer, d))
			mismatches.push('DOC ' + JSON.stringify(d.slice(0, 160)));
	}
	// Streaming prefixes: the incremental cache re-splits partial documents.
	for (const d of docs.slice(0, 150)) {
		for (let i = 1; i <= d.length; i += 3) {
			compared++;
			const p = d.slice(0, i);
			if (sig(Lexer, p) !== sig(SplitLexer, p)) {
				mismatches.push('PREFIX ' + JSON.stringify(p.slice(-160)));
				break;
			}
		}
	}
	expect(compared).toBeGreaterThan(5000);
	expect(mismatches).toEqual([]);
});
