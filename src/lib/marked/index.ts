import {
	Lexer,
	type MarkedToken,
	type RendererExtensionFunction,
	type Token,
	type TokenizerExtensionFunction,
	type TokenizerStartFunction,
	type TokenizerThis,
	type Tokens,
	type TokensList
} from 'marked';
import { markedAlert, type AlertToken } from './marked-alert.js';
import { markedFootnote, type FootnoteToken } from './marked-footnotes.js';
import { markedMath, type MathToken } from './marked-math.js';
import { markedSub, markedSup, type SubSupToken } from './marked-subsup.js';
import { markedList, type ListItemToken, type ListToken } from './marked-list.js';
import { markedBr, type BrToken } from './marked-br.js';
import { markedHr, type HrToken } from './marked-hr.js';
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
import {
	markedDl,
	type DescriptionDetailToken,
	type DescriptionListToken,
	type DescriptionTermToken,
	type DescriptionToken
} from './marked-dl.js';
import { markedAlign, type AlignToken } from './marked-align.js';
import { markedCitations, type CitationToken } from './marked-citations.js';
import { markedMdx, type MdxToken } from './marked-mdx.js';

export type GenericToken = {
	type: string;
	raw: string;
	tokens?: Token[];
} & Record<string, any>;

export type Extension = {
	name: string;
	level: 'block' | 'inline';
	tokenizer: (
		this: TokenizerThis,
		src: string,
		tokens: Token[] | TokensList
	) => GenericToken | undefined;
	start?: TokenizerStartFunction;
	applyInBlockParsing?: boolean;
};

export type StreamdownToken =
	| Exclude<MarkedToken, Tokens.List | Tokens.ListItem | Tokens.Table>
	| ListToken
	| ListItemToken
	| MathToken
	| AlertToken
	| FootnoteToken
	| SubSupToken
	| BrToken
	| HrToken
	| TableToken
	| THead
	| TBody
	| TFoot
	| THeadRow
	| TRow
	| TH
	| TD
	| DescriptionListToken
	| DescriptionToken
	| DescriptionDetailToken
	| DescriptionTermToken
	| AlignToken
	| CitationToken
	| MdxToken;

// Re-export table types from marked-table
export type { TableToken, THead, TBody, TFoot, THeadRow, TRow, TH, TD } from './marked-table.js';

const parseExtensions = (...extensions: Extension[]) => {
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

	return options;
};

export const lex = (markdown: string, extensions: Extension[] = []): StreamdownToken[] => {
	return new Lexer(
		parseExtensions(
			markedHr,
			markedTable,
			...markedFootnote(),
			markedAlert,
			...markedMath,
			markedSub,
			markedSup,
			markedList,
			markedBr,
			markedDl,
			markedAlign,
			markedCitations,
			markedMdx,
			...extensions
		)
	)
		.lex(markdown)
		.filter((token) => token.type !== 'space' && token.type !== 'footnote') as StreamdownToken[];
};

export const parseBlocks = (markdown: string, extensions: Extension[] = []): string[] => {
	const blockLexer = new Lexer(
		parseExtensions(
			markedHr,
			...markedFootnote(),
			markedDl,
			markedTable,
			markedAlign,
			markedMdx,
			...extensions.filter(
				({ level, applyInBlockParsing }) => level === 'block' && applyInBlockParsing
			)
		)
	);

	return blockLexer.blockTokens(markdown, []).reduce((acc, block) => {
		if (block.type === 'space' || block.type === 'footnote') {
			return acc;
		} else {
			acc.push(block.raw);
		}
		return acc;
	}, [] as string[]);
};

export type {
	MathToken,
	AlertToken,
	FootnoteToken,
	SubSupToken,
	BrToken,
	HrToken,
	AlignToken,
	CitationToken,
	MdxToken
};
