import type { TokenizerExtensionFunction, TokenizerStartFunction, TokenizerThis } from 'marked';

// Math parsing rules
// Block math: supports both newline format ($$\nmath\n$$) and single-line format ($$math$$)
const blockRule = /^(\$\$)(?:\n((?:\\[\s\S]|[^\\])+?)\n\1(?:\n|$)|([^$\n]+?)\1(?=\s|$|$))/;
// Inline math: handles both single ($) and double ($$) dollar delimiters
// Avoids matching currency by checking context and requiring proper content
const inlineRule = /^(\${1,2})(?!\$)((?:[^$\n]|\\\$)*?)\1(?!\d)/;

export function markedMath(): {
	extensions: Array<{
		name: string;
		level: 'block' | 'inline';
		tokenizer: TokenizerExtensionFunction;
		start?: TokenizerStartFunction;
	}>;
} {
	return {
		extensions: [
			{
				name: 'math',
				level: 'block',
				tokenizer(this: TokenizerThis, src: string) {
					const match = src.match(blockRule);

					if (match) {
						// match[2] is multiline format, match[3] is single-line format
						const content = (match[2] || match[3]).trim();
						return {
							type: 'math',
							isInline: false,
							displayMode: true,
							raw: match[0],
							text: content
						} satisfies MathToken;
					}
				}
			},
			{
				name: 'math',
				level: 'inline',
				start(src: string) {
					let index = 0;
					let searchSrc = src;

					while (searchSrc) {
						const dollarIndex = searchSrc.indexOf('$');
						if (dollarIndex === -1) {
							return;
						}
						
						const currentIndex = index + dollarIndex;
						const possibleMath = src.substring(currentIndex);

						// Check if this could be math (not currency)
						if (possibleMath.match(inlineRule)) {
							// Additional check: avoid currency patterns like $5.00
							const beforeChar = currentIndex > 0 ? src[currentIndex - 1] : '';
							const afterDollar = possibleMath.substring(1, 6); // Check first few chars after $
							
							// Skip if it looks like currency (digit immediately after $ or decimal pattern)
							if (!/^\d+(\.\d{2})?\s/.test(afterDollar)) {
								return currentIndex;
							}
						}

						index += dollarIndex + 1;
						searchSrc = src.substring(index);
					}
				},
				tokenizer(this: TokenizerThis, src: string) {
					const match = src.match(inlineRule);
					if (match) {
						// Additional validation: avoid currency patterns
						const content = match[2];
						if (/^\d+(\.\d{2})?$/.test(content.trim())) {
							// This looks like currency, skip it
							return;
						}
						
						// Double dollars are display mode, single dollars are inline
						const isDisplayMode = match[1] === '$$';
						return {
							type: 'math',
							isInline: !isDisplayMode,
							displayMode: isDisplayMode,
							raw: match[0],
							text: content.trim()
						} satisfies MathToken;
					}
				}
			}
		]
	};
}

export type MathToken = {
	type: 'math';
	raw: string;
	text: string;
	isInline: boolean;
	displayMode: boolean;
};
