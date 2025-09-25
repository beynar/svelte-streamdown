import type { Extension, GenericToken } from './index.js';

export const markedDl: Extension = {
	name: 'descriptionList',
	level: 'block', // Is this a block-level or inline-level tokenizer?

	tokenizer(this, src) {
		const rule = /^(?:[ \t]*:[^:\n]+:[ \t]?[^\n]*(?:\n|$))+/;
		const match = rule.exec(src);
		if (match) {
			const text = match[0].trim();
			const tokens: DescriptionToken[] = [];

			// Parse each line as a description
			const lines = text.split('\n');
			for (const line of lines) {
				const lineMatch = /^\s*:([^:\n]+):([^:\n]*)(?:\n|$)/.exec(line);
				if (lineMatch) {
					const term = lineMatch[1].trim();
					const detail = lineMatch[2].trim();
					tokens.push({
						type: 'description',
						raw: lineMatch[0],
						tokens: [
							{
								type: 'descriptionTerm',
								raw: term,
								tokens: this.lexer.inlineTokens(term)
							},
							{
								type: 'descriptionDetail',
								raw: detail,
								tokens: this.lexer.inlineTokens(detail)
							}
						]
					});
				}
			}

			const token = {
				type: 'descriptionList',
				raw: match[0],
				text: text,
				tokens: tokens
			};
			return token;
		}
	}
};

export type DescriptionListToken = {
	type: 'descriptionList';
	raw: string;
	text: string;
	tokens: DescriptionToken[];
};

export type DescriptionToken = {
	type: 'description';
	raw: string;
	tokens: [DescriptionTermToken, DescriptionDetailToken];
};

export type DescriptionTermToken = {
	type: 'descriptionTerm';
	raw: string;
	tokens: GenericToken[];
};

export type DescriptionDetailToken = {
	type: 'descriptionDetail';
	raw: string;
	tokens: GenericToken[];
};
