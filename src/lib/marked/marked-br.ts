import type { TokenizerExtensionFunction, TokenizerThis } from 'marked';

export interface BrToken {
	type: 'br';
	raw: string;
}

export function markedBr(): {
	extensions: Array<{
		name: string;
		level: 'inline';
		tokenizer: TokenizerExtensionFunction;
	}>;
} {
	return {
		extensions: [
			{
				name: 'br',
				level: 'inline',
				tokenizer(this: TokenizerThis, src: string) {
					// Match HTML <br> tags (with or without closing slash, case insensitive)
					const match = src.match(/^<br\s*\/?>/i);
					
					if (match) {
						return {
							type: 'br',
							raw: match[0]
						} as any;
					}
					
					return undefined;
				}
			}
		]
	};
}
