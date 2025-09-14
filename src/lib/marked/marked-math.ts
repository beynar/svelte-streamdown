import type { TokenizerThis } from 'marked';
import type { TokenizerAndRendererExtension } from 'marked';

const inlineRule =
	/^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1(?=[\s?!\.,:？！。，：]|$)/;
const inlineRuleNonStandard = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1/; // Non-standard, even if there are no spaces before and after $ or $$, try to parse
const blockRule = /^(\${1,2})\n((?:\\[\s\S]|[^\\])+?)\n\1(?:\n|$)/;

export function markedMath(): {
	extensions: TokenizerAndRendererExtension<string, string>[];
} {
	return {
		extensions: [
			{
				name: 'inline-math',
				level: 'inline',
				start(src) {
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

							if (possibleKatex.match(inlineRuleNonStandard)) {
								return index;
							}
						}

						indexSrc = indexSrc.substring(index + 1).replace(/^\$+/, '');
					}
				},
				tokenizer(this: TokenizerThis, src: string) {
					const match = src.match(inlineRuleNonStandard);
					if (match) {
						return {
							type: 'math',
							isInline: true,
							raw: match[0],
							text: match[2].trim()
						} satisfies MathToken;
					}
				}
			},
			{
				name: 'block-math',
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
				}
			}
		]
	};
}

export type MathToken = {
	type: 'math';
	isInline: boolean;
	raw: string;
	text: string;
};
