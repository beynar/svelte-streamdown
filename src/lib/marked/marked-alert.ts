import type { Token, Tokenizer, Tokens } from 'marked';
import { Lexer } from 'marked';
import type { TokenizerExtensionFunction } from 'marked';
import type { TokenizerThis } from 'marked';

type variantType = 'note' | 'tip' | 'important' | 'warning' | 'caution';
const variants: variantType[] = ['note', 'tip', 'important', 'warning', 'caution'];

export function createSyntaxPattern(type: variantType): string {
	return `^(?:\\[!${type.toUpperCase()}])\\s*?\n*`;
}

export default function markedAlert(): {
	extensions: Array<{
		name: string;
		level: 'block' | 'inline';
		tokenizer: TokenizerExtensionFunction;
	}>;
} {
	const defaultLexer = new Lexer({ gfm: true });
	const defaultTokenizer = defaultLexer.options.tokenizer!;

	return {
		extensions: [
			{
				name: 'alert',
				level: 'block',
				tokenizer(this: TokenizerThis, src: string, tokens: Token[]): Tokens.Generic | undefined {
					const cap = defaultTokenizer.rules.block.blockquote.exec(src);
					if (cap) {
						const blockquoteToken = defaultTokenizer.blockquote(src);

						blockquoteToken && processAlertToken(blockquoteToken, this.lexer.options.tokenizer!);
						return blockquoteToken;
					}
				}
			}
		]
	};
}

export function processAlertToken(token: Token, tokenizer: Tokenizer): void {
	const matchedVariant = variants.find((type) =>
		new RegExp(createSyntaxPattern(type)).test(('text' in token && token.text) || '')
	);

	if (!matchedVariant) return;

	const typeRegexp = new RegExp(createSyntaxPattern(matchedVariant));

	// Transform the token into an alert token
	Object.assign(token, {
		type: 'alert',
		variant: matchedVariant
	});

	const firstLine = ('tokens' in token && token.tokens?.[0]) as Tokens.Paragraph;
	const firstLineText = firstLine.raw?.replace(typeRegexp, '').trim();

	const lines = token.raw
		.split('>')
		.filter((line) => line.trim().replace(typeRegexp, '').length > 0);

	const tokens = lines.map((line) => {
		const lineTokens = tokenizer.lexer.inlineTokens(line);
		return {
			type: 'paragraph',
			tokens: lineTokens
		};
	});

	// Transform the token into an alert token
	Object.assign(token, {
		type: 'alert',
		variant: matchedVariant,
		tokens
	});
}

export type AlertToken = {
	type: 'alert';
	variant: variantType;
	raw: string;
	text: string;
};
