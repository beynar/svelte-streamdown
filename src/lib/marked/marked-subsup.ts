import type { TokenizerExtensionFunction, TokenizerStartFunction, TokenizerThis } from 'marked';

const subRule = /^~([^~\s](?:[^~]*[^~\s])?)~/; // ~text~
const supRule = /^\^([^\^\s](?:[^\^]*[^\^\s])?)\^/; // ^text^

export function markedSubSup(): {
	extensions: {
		name: string;
		level: 'inline';
		tokenizer: TokenizerExtensionFunction;
		start?: TokenizerStartFunction;
	}[];
} {
	return {
		extensions: [
			{
				name: 'sub',
				level: 'inline',
				start(src: string) {
					const i = src.indexOf('~');
					return i === -1 ? undefined : i;
				},
				tokenizer(this: TokenizerThis, src: string) {
					const match = src.match(subRule);
					if (match) {
						return {
							type: 'sub',
							raw: match[0],
							text: match[1],
							tokens: this.lexer.inlineTokens(match[1])
						} satisfies SubToken;
					}
				}
			},
			{
				name: 'sup',
				level: 'inline',
				start(src: string) {
					return src.indexOf('^');
				},
				tokenizer(this: TokenizerThis, src: string) {
					const match = src.match(supRule);
					if (match) {
						return {
							type: 'sup',
							raw: match[0],
							text: match[1],
							tokens: this.lexer.inlineTokens(match[1])
						} satisfies SupToken;
					}
				}
			}
		]
	} as const;
}

/**
 * Represents a subscript token.
 */
export type SubToken = {
	type: 'sub';
	raw: string;
	text: string;
	tokens: any[];
};

/**
 * Represents a superscript token.
 */
export type SupToken = {
	type: 'sup';
	raw: string;
	text: string;
	tokens: any[];
};

export type SubSupToken = SubToken | SupToken;
