import type { TokenizerExtensionFunction, TokenizerStartFunction, TokenizerThis } from 'marked';
import type { TokenizerAndRendererExtension } from 'marked';

// Use the standard rule that requires proper spacing after math expressions
const inlineRule = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1(?=[\s?!\.,:？！。，：]|$)/;
const blockRule = /^(\${1,2})\n((?:\\[\s\S]|[^\\])+?)\n\1(?:\n|$)/;

export function markedMath() {
	return {
		extensions: [
			{
				name: 'math',
				level: 'block',
				tokenizer(this: TokenizerThis, src: string) {
					const match = src.match(blockRule);

					if (match) {
						return {
							type: 'math',
							isInline: false,
							raw: match[0],
							text: match[2].trim()
						} satisfies MathToken;
					}
				},
				renderer(token: any) {
					return `<div class="math block">$$\n${token.text}\n$$</div>`;
				}
			},
			{
				name: 'math',
				level: 'inline',
				start(src: string) {
					let index;
					let indexSrc = src;

					while (indexSrc) {
						index = indexSrc.indexOf('$');
						if (index === -1) {
							return;
						}
						const f = index > -1;
						if (f) {
							const possibleKatex = indexSrc.substring(index);

							if (possibleKatex.match(inlineRule)) {
								return index;
							}
						}

						indexSrc = indexSrc.substring(index + 1).replace(/^\$+/, '');
					}
				},
				tokenizer(this: TokenizerThis, src: string) {
					const match = src.match(inlineRule);
					if (match) {
						return {
							type: 'math',
							isInline: true,
							raw: match[0],
							text: match[2].trim()
						} satisfies MathToken;
					}
				},
				renderer(token: any) {
					return `<span class="math inline">$${token.text}$</span>`;
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
};
