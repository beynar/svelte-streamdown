import type { Extension, GenericToken } from './index.js';

export const markedDl: Extension = {
	name: 'descriptionList',
	level: 'block', // Is this a block-level or inline-level tokenizer?

	tokenizer(this, src) {
		const rule = /^(?:\s*:[^:\n]+:[^:\n]*(?:\n|$))+/; // Regex for the complete token, anchor to string start
		const match = rule.exec(src);
		if (match) {
			const token = {
				type: 'descriptionList',
				raw: match[0],
				text: match[0].trim(),
				tokens: this.lexer.inlineTokens(match[0].trim())
			};
			return token;
		}
	}
};

export const markedDt: Extension = {
	name: 'description',
	level: 'inline',

	tokenizer(this, src) {
		const rule = /^\s*:([^:\n]+):([^:\n]*)(?:\n|$)/;
		const match = rule.exec(src);
		if (match) {
			const term = match[1].trim();
			const detail = match[2].trim();
			return {
				type: 'description',
				raw: match[0],
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
			};
		} else {
			return undefined;
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
