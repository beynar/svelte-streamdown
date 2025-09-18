import { untrack, type Component } from 'svelte';

interface TokenSpeedControls {}

interface TokenSpeedProps {
	content: string;
	sep: string;
}

export interface TokenSpeed extends TokenSpeedProps {}
export class TokenSpeed {
	data = $state({
		currentText: '',
		previousText: ''
	});
	private tokenizeNewContent = (text: string) => {
		if (!text) return [];

		let splitRegex;
		if (this.sep === 'word') {
			splitRegex = /(\s+)/;
		} else if (this.sep === 'char') {
			splitRegex = /(.)/;
		} else {
			// For diff mode, you'll need more complex logic for streaming
			splitRegex = /(\s+)/; // Start with word for now
		}

		return text.split(splitRegex).filter((token) => token.length > 0);
	};
	previousText = $state('');
	constructor(props: TokenSpeedProps) {
		$effect(() => {
			const newText = props.content;
			untrack(() => {
				this.data = {
					currentText: newText,
					previousText: this.data.currentText
				};
			});
		});
	}
}
