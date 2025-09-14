import { Lexer, Marked, type MarkedToken, type Tokens } from 'marked';
import markedAlert, { type AlertToken } from './marked-alert.js';
import markedFootnote, { type FootnoteToken } from './marked-footnotes.js';
import { markedMath, type MathToken } from './marked-math.js';
import markedSubSup, { type SubSupToken } from './marked-subsup.js';
import { markedList, type ListItemToken, type ListToken } from './marked-list.js';

export type StreamdownToken =
	| Exclude<MarkedToken, Tokens.List | Tokens.ListItem>
	| ListToken
	| ListItemToken
	| MathToken
	| AlertToken
	| FootnoteToken
	| SubSupToken
	| TableRow
	| TD
	| TH
	| TableHead;

export type TD = Tokens.TableCell & {
	type: 'td';
	raw: string;
};
export type TH = Tokens.TableCell & {
	type: 'th';
	raw: string;
};

export type TableRow = {
	type: 'tableRow';
	raw: string;
	tokens: (TD | TH)[];
	isHeader: boolean;
};

export type TableHead = {
	type: 'tableHead';
	raw: string;
	tokens: TableRow[];
};

const completeLexer = new Marked()
	.use({
		gfm: true
	})
	.use({
		gfm: true
	})
	.use(markedAlert())
	.use(markedFootnote())
	.use(markedMath())
	.use(markedSubSup())
	.use(markedList());

const blockLexer = new Lexer({
	gfm: true,
	extensions: {
		childTokens: {},
		renderers: {},
		block: [markedFootnote().extensions[0].tokenizer]
	}
});
export const lex = (markdown: string): StreamdownToken[] => {
	return completeLexer
		.lexer(markdown)
		.filter((token) => token.type !== 'space' && token.type !== 'footnote') as StreamdownToken[];
};

export const parseBlocks = (markdown: string): string[] => {
	return blockLexer.blockTokens(markdown, []).reduce((acc, block) => {
		if (block.type === 'space' || block.type === 'footnote') {
			return acc;
		} else {
			acc.push(block.raw);
		}
		return acc;
	}, [] as string[]);
};

export type { MathToken, AlertToken, FootnoteToken, SubSupToken };
