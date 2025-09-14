import type { MarkedExtension, TokenizerThis } from 'marked';

// Simplified configuration
export interface TableOptions {
	maxColspan?: number | null;
	detectFooter?: boolean;
}

// Unified cell interface - no need for separate TH/TD types
export interface TableCell {
	type: 'th' | 'td';
	rowspan: number;
	colspan: number;
	text: string;
	align?: string | null;
	tokens?: unknown[];
	// Rowspan tracking
	rowSpanTarget?: TableCell;
	isHidden?: boolean; // Instead of rowspan = 0
}

// Simplified row interface
export interface TableRow {
	type: 'tr';
	tokens: TableCell[];
}

// Table section interface
export interface TableSection {
	type: 'thead' | 'tbody' | 'tfoot';
	tokens: TableRow[];
}

// Main table token
export interface TableToken {
	type: 'table';
	tokens: TableSection[];
	raw: string;
}

const DEFAULT_OPTIONS: Required<TableOptions> = {
	maxColspan: null,
	detectFooter: true
};

// Utility functions
const createCell = (
	text: string,
	type: 'th' | 'td' = 'td',
	colspan = 1,
	rowspan = 1
): TableCell => ({
	type,
	text: text.trim().replace(/\\\|/g, '|'),
	colspan,
	rowspan,
	isHidden: false
});

const parseAlignment = (alignText: string): string | null => {
	if (/^ *-+: *$/.test(alignText)) return 'right';
	if (/^ *:-+: *$/.test(alignText)) return 'center';
	if (/^ *:-+ *$/.test(alignText)) return 'left';
	return null;
};

// Simplified cell parsing
const parseCells = (rowText: string, maxColspan: number | null = null): TableCell[] => {
	const matches = [...rowText.matchAll(/(?:[^|\\]|\\.?)+(?:\|+|$)/g)];
	const cells = matches.map((x) => x[0]);

	// Clean up leading/trailing empty cells
	if (!cells[0]?.trim()) cells.shift();
	if (!cells[cells.length - 1]?.trim()) cells.pop();

	return cells.map((cellText) => {
		const trimmed = cellText.split(/\|+$/)[0];
		let colspan = Math.max(cellText.length - trimmed.length, 1);

		if (maxColspan !== null && colspan > maxColspan) {
			colspan = maxColspan;
		}

		return createCell(trimmed, 'td', colspan);
	});
};

// Simplified rowspan processing
const processRowSpans = (currentRow: TableCell[], previousRow: TableCell[]): void => {
	currentRow.forEach((cell, index) => {
		if (!cell.text.endsWith('^') || !previousRow.length) return;

		// Find matching cell in previous row by position
		let position = 0;
		let targetCell: TableCell | null = null;

		// Calculate this cell's position
		for (let i = 0; i < index; i++) {
			position += currentRow[i].colspan;
		}

		// Find target in previous row
		let prevPosition = 0;
		for (const prevCell of previousRow) {
			if (prevPosition <= position && position < prevPosition + prevCell.colspan) {
				targetCell = prevCell.rowSpanTarget || prevCell;
				break;
			}
			prevPosition += prevCell.colspan;
		}

		if (targetCell) {
			// Append text and hide current cell
			const textToAppend = cell.text.slice(0, -1).trim();
			if (textToAppend) {
				targetCell.text = [targetCell.text, textToAppend].filter(Boolean).join(' ');
			}

			targetCell.rowspan += 1;
			cell.rowSpanTarget = targetCell;
			cell.isHidden = true;
		} else {
			// Remove ^ if no target found
			cell.text = cell.text.slice(0, -1);
		}
	});
};

// Normalize row to match column count
const normalizeRow = (cells: TableCell[], targetColumnCount: number): TableCell[] => {
	let currentColumnCount = cells.reduce((sum, cell) => sum + cell.colspan, 0);

	// Add empty cells if needed
	while (currentColumnCount < targetColumnCount) {
		cells.push(createCell(''));
		currentColumnCount += 1;
	}

	// Trim cells if too many columns
	if (currentColumnCount > targetColumnCount) {
		let position = 0;
		const trimmedCells: TableCell[] = [];

		for (const cell of cells) {
			if (position + cell.colspan <= targetColumnCount) {
				trimmedCells.push(cell);
				position += cell.colspan;
			} else if (position < targetColumnCount) {
				// Partially include this cell
				const adjustedCell = { ...cell, colspan: targetColumnCount - position };
				trimmedCells.push(adjustedCell);
				break;
			} else {
				break;
			}
		}

		return trimmedCells;
	}

	return cells;
};

// Process table rows into sections
const processTableRows = (
	headerRows: string[],
	bodyRows: string[],
	alignment: (string | null)[],
	columnCount: number,
	lexer: any,
	options: Required<TableOptions>
): TableSection[] => {
	const sections: TableSection[] = [];

	// Process headers
	const processedHeaders: TableCell[][] = [];
	headerRows.forEach((rowText, index) => {
		const cells = parseCells(rowText, options.maxColspan);
		const normalizedCells = normalizeRow(cells, columnCount);

		// Set cell types and alignment
		normalizedCells.forEach((cell, cellIndex) => {
			cell.type = 'th';
			cell.align = alignment[cellIndex] || null;
			// Add inline tokens
			cell.tokens = [];
			lexer.inline(cell.text, cell.tokens);
		});

		// Process rowspans
		if (index > 0) {
			processRowSpans(normalizedCells, processedHeaders[index - 1]);
		}

		processedHeaders.push(normalizedCells);
	});

	// Create thead
	sections.push({
		type: 'thead',
		tokens: processedHeaders.map((cells) => ({ type: 'tr', tokens: cells }))
	});

	// Process body rows
	if (bodyRows.length > 0) {
		const processedBody: TableCell[][] = [];
		bodyRows.forEach((rowText, index) => {
			const cells = parseCells(rowText, options.maxColspan);
			const normalizedCells = normalizeRow(cells, columnCount);

			// Set alignment
			normalizedCells.forEach((cell, cellIndex) => {
				cell.align = alignment[cellIndex] || null;
				// Add inline tokens
				cell.tokens = [];
				lexer.inline(cell.text, cell.tokens);
			});

			// Process rowspans (reference previous body row or last header row)
			const previousRow =
				index > 0 ? processedBody[index - 1] : processedHeaders[processedHeaders.length - 1];

			if (previousRow) {
				processRowSpans(normalizedCells, previousRow);
			}

			processedBody.push(normalizedCells);
		});

		// Handle footer detection
		if (options.detectFooter && processedBody.length > 1) {
			const footerRow = processedBody.pop()!;
			sections.push({
				type: 'tbody',
				tokens: processedBody.map((cells) => ({ type: 'tr', tokens: cells }))
			});
			sections.push({
				type: 'tfoot',
				tokens: [{ type: 'tr', tokens: footerRow }]
			});
		} else {
			sections.push({
				type: 'tbody',
				tokens: processedBody.map((cells) => ({ type: 'tr', tokens: cells }))
			});
		}
	}

	return sections;
};

// Main extension function
export function markedTable(options: TableOptions = {}): MarkedExtension {
	const config = { ...DEFAULT_OPTIONS, ...options };

	return {
		extensions: [
			{
				name: 'table',
				level: 'block',
				start(src: string) {
					return src.match(/^\n *([^\n ].*\|.*)\n/)?.index;
				},
				tokenizer(this: TokenizerThis, src: string): TableToken | null {
					// Simplified regex - same functionality, more readable
					const tableRegex =
						/^([^\n ].*\|.*\n(?: *[^\s].*\n)*?) {0,3}(?:\| *)?(:?-+:? *(?:\| *:?-+:? *)*)(?:\| *)?(?:\n((?:(?! *\n|[^\n]*(?:(?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)| {0,3}#{1,6} | {0,3}>| {4}[^\n]| {0,3}(?:`{3,}(?=[^`\n]*\n)|~{3,})[^\n]*\n| {0,3}(?:[*+-]|1[.)]) |<[^>]*>).*(?:\n|$))*))?/;

					const match = tableRegex.exec(src);
					if (!match) return null;

					const headerRows = match[1].replace(/\n$/, '').split('\n');
					const alignmentRow = match[2].replace(/^ *|\| *$/g, '').split(/ *\| */);
					const bodyRows = match[3] ? match[3].replace(/\n$/, '').split('\n') : [];

					// Use alignment row as authoritative column count
					const columnCount = alignmentRow.length;
					if (columnCount === 0) return null;

					// Process alignment
					const alignment = alignmentRow.map(parseAlignment);

					// Process table sections
					const tokens = processTableRows(
						headerRows,
						bodyRows,
						alignment,
						columnCount,
						this.lexer,
						config
					);

					return {
						type: 'table',
						tokens,
						raw: match[0]
					};
				}
			}
		]
	};
}

// Export utility functions for testing
export { parseCells, processRowSpans, normalizeRow, parseAlignment };
