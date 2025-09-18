import {
	Lexer,
	type MarkedToken,
	type RendererExtensionFunction,
	type TokenizerExtensionFunction,
	type TokenizerStartFunction,
	type Tokens
} from 'marked';
import markedAlert, { type AlertToken } from './marked-alert.js';
import markedFootnote, { type FootnoteToken } from './marked-footnotes.js';
import { markedMath, type MathToken } from './marked-math.js';
import markedSubSup, { type SubSupToken } from './marked-subsup.js';
import { markedList, type ListItemToken, type ListToken } from './marked-list.js';
import {
	markedTable,
	type TableToken,
	type THead,
	type TBody,
	type TFoot,
	type THeadRow,
	type TRow,
	type TH,
	type TD
} from './marked-table.js';

export type StreamdownToken =
	| Exclude<MarkedToken, Tokens.List | Tokens.ListItem>
	| ListToken
	| ListItemToken
	| MathToken
	| AlertToken
	| FootnoteToken
	| SubSupToken
	| TableToken
	| THead
	| TBody
	| TFoot
	| THeadRow
	| TRow
	| TH
	| TD;

// Re-export table types from marked-table
export type { TableToken, THead, TBody, TFoot, THeadRow, TRow, TH, TD } from './marked-table.js';

const extensions = [
	markedTable(),
	markedFootnote(),
	markedAlert(),
	markedMath(),
	markedSubSup(),
	markedList()
] as const;

const parseExtensions = (...ext: (typeof extensions)[number][]) => {
	const options: {
		gfm: boolean;
		extensions: {
			block: TokenizerExtensionFunction[];
			inline: TokenizerExtensionFunction[];
			childTokens: Record<string, string[]>;
			renderers: Record<string, RendererExtensionFunction>;
			startBlock: TokenizerStartFunction[];
			startInline: TokenizerStartFunction[];
		};
	} = {
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

	ext.forEach(({ extensions }) => {
		extensions.forEach(({ level, name, tokenizer, ...rest }) => {
			if ('start' in rest && rest.start) {
				if (level === 'block') {
					options.extensions.startBlock!.push(rest.start as TokenizerStartFunction);
				} else {
					options.extensions.startInline!.push(rest.start as TokenizerStartFunction);
				}
			}
			if (tokenizer) {
				if (level === 'block') {
					options.extensions.block.push(tokenizer);
				} else {
					options.extensions.inline.push(tokenizer);
				}
			}
		});
	});
	return options;
};

const blockLexer = new Lexer(parseExtensions(markedFootnote(), markedTable()));
export const lex = (markdown: string): StreamdownToken[] => {
	return new Lexer(parseExtensions(...extensions))
		.lex(markdown)
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
