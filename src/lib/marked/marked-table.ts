import type { TokenizerExtensionFunction, TokenizerStartFunction, TokenizerThis } from 'marked';

// Configuration options for the extended tables extension
export interface SpanTableOptions {
	// Whether to render the table with thead and tbody tags
	useTheadTbody?: boolean;
	// Whether to use tfoot for the last row
	useTfoot?: boolean;
	// Whether to detect and mark the last row as a footer
	detectFooter?: boolean;
	// Maximum number of columns a cell can span (null for no limit)
	maxColspan?: number | null;
	// Enable enhanced handling of complex row+column spanning
	handleComplexSpans?: boolean;
}

// Base cell interface
interface BaseCell {
	// Number of rows this cell spans vertically
	rowspan: number;
	// Number of columns this cell spans horizontally
	colspan: number;
	// The text content of the cell
	text: string;
	// The column position of this cell
	position?: number;
	// Parsed inline tokens from the cell text
	tokens?: unknown[];
	// Reference to the original cell when using rowspan
	rowSpanTarget?: BaseCell;
	// Whether this cell has complex row spanning
	complexRowSpan?: boolean;
	// Related cell for complex spanning
	relatedCell?: BaseCell;
	// Alignment for this cell
	align?: string | null;
}

// Table header cell
export interface TH extends BaseCell {
	type: 'th';
}

// Table data cell
export interface TD extends BaseCell {
	type: 'td';
}

// Table row containing header cells
export interface THeadRow {
	type: 'tr';
	tokens: TH[];
}

// Table row containing data cells
export interface TRow {
	type: 'tr';
	tokens: TD[];
}

// Table header section
export interface THead {
	type: 'thead';
	tokens: THeadRow[];
}

// Table body section
export interface TBody {
	type: 'tbody';
	tokens: TRow[];
}

// Table footer section
export interface TFoot {
	type: 'tfoot';
	tokens: TRow[];
}

// Union type for all table sections
export type TableSection = THead | TBody | TFoot;

// Token representing a table with spans
export interface TableToken {
	// Type identifier for the token
	type: 'table';
	// Array of table sections (thead, tbody, tfoot)
	tokens: TableSection[];
	// Original markdown source of the table
	raw: string;
}

// Internal working cell type for processing
interface WorkingCell extends BaseCell {
	// Internal working type
}

// Internal working row type for processing
type WorkingRow = WorkingCell[];

// Default configuration options for the extended tables extension
export const DEFAULT_OPTIONS: Required<SpanTableOptions> = {
	useTheadTbody: true,
	useTfoot: false,
	detectFooter: true,
	maxColspan: null,
	handleComplexSpans: true
};

// Creates an HTML table cell with appropriate attributes
export const getTableCell = (
	text: string,
	cell: BaseCell,
	type: 'th' | 'td',
	align: string | null
): string => {
	if (!cell.rowspan) return '';

	const tag =
		`<${type}` +
		`${cell.colspan > 1 ? ` colspan=${cell.colspan}` : ''}` +
		`${cell.rowspan > 1 ? ` rowspan=${cell.rowspan}` : ''}` +
		`${align ? ` align=${align}` : ''}>`;

	return `${tag + text}</${type}>\n`;
};

function splitRow(src: string): string[] {
	const out: string[] = [];
	let buf = '';
	let esc = false;
	let inCode = false;
	let fence = 0;

	for (let i = 0; i < src.length; i++) {
		const ch = src[i];
		if (esc) {
			buf += ch;
			esc = false;
			continue;
		}
		if (ch === '\\') {
			esc = true;
			buf += ch;
			continue;
		}
		if (ch === '`') {
			// count backticks
			let run = 1;
			while (i + run < src.length && src[i + run] === '`') run++;
			if (!inCode) {
				inCode = true;
				fence = run;
			} else if (run >= fence) {
				inCode = false;
				fence = 0;
			}
			buf += src.slice(i, i + run);
			i += run - 1;
			continue;
		}
		if (ch === '|' && !inCode) {
			out.push(buf.trim());
			buf = '';
			continue;
		}
		buf += ch;
	}
	out.push(buf.trim());
	return out;
}

// Splits a table row into cells and processes row/column spans
export const splitCells = (
	tableRow: string,
	count: number | null,
	prevRow: WorkingRow | null = null,
	maxColspan: number | null = null
): WorkingRow => {
	// Split by pipe, but handle escaped pipes and empty cells
	const cells = splitRow(tableRow);

	// Remove first/last cell if it's empty (from leading/trailing pipes)
	if (cells.length > 0 && !cells[0]) cells.shift();
	if (cells.length > 0 && !cells[cells.length - 1]) cells.pop();

	return processSpans(cells, count, prevRow || [], maxColspan);
};

// Process row and column spans in table cells
const processSpans = (
	cells: string[],
	count: number | null,
	prevRow: WorkingRow = [],
	maxColspan: number | null = null
): WorkingRow => {
	let numCols = 0;
	let i: number, j: number, trimmedCell: string, prevCell: WorkingCell;
	const processedCells: WorkingRow = [];

	// Track colspan cells that need rowspan
	const colspanCells = new Map<string, { original: WorkingCell; newCell: WorkingCell }>();

	// First pass: Process each cell's colspan and merge consecutive empty cells
	let cellIndex = 0;
	const mergedIndices = new Set<number>();

	for (i = 0; i < cells.length; i++) {
		// Skip cells that were merged into previous colspans
		if (mergedIndices.has(i)) continue;

		trimmedCell = cells[i];

		// Count consecutive empty cells for colspan
		let colspan = 1;
		if (!trimmedCell.trim()) {
			// Count how many consecutive empty cells we have
			let j = i + 1;
			while (j < cells.length && !cells[j].trim()) {
				colspan++;
				mergedIndices.add(j); // Mark as merged
				j++;
			}
		}

		// Apply maxColspan limit if specified
		if (maxColspan !== null && colspan > maxColspan) colspan = maxColspan;

		processedCells[cellIndex] = {
			rowspan: 1,
			colspan: colspan,
			text: trimmedCell.trim().replace(/\\\|/g, '|'),
			position: numCols // Store original column position for better tracking
		};

		numCols += processedCells[cellIndex].colspan;
		cellIndex++;
	}

	// Second pass: Process rowspan by matching cells by position
	for (i = 0; i < processedCells.length; i++) {
		const cell = processedCells[i];
		let cellText = cell.text;

		// Handle Rowspan - cells ending with ^
		if (cellText.slice(-1) === '^' && prevRow.length > 0) {
			// Clean the ^ indicator from the cell text
			cell.text = cellText.slice(0, -1).trim();
			cellText = cell.text;
			let targetFound = false;
			const startPosition = cell.position || 0;
			const endPosition = startPosition + cell.colspan - 1;

			// Try to find a matching cell or combination of cells in previous row
			for (j = 0; j < prevRow.length; j++) {
				prevCell = prevRow[j];
				const prevStartPosition = prevCell.position || 0;
				const prevEndPosition = prevStartPosition + prevCell.colspan - 1;

				// Check for position overlap between cells
				if (
					(startPosition >= prevStartPosition && startPosition <= prevEndPosition) ||
					(endPosition >= prevStartPosition && endPosition <= prevEndPosition) ||
					(prevStartPosition >= startPosition && prevEndPosition <= endPosition)
				) {
					// Complex case: Handle rowspan for colspan cells
					if (cell.colspan > 1 && prevCell.colspan > 1) {
						// If the cell spans exactly match, simple case
						if (cell.colspan === prevCell.colspan && cell.position === prevCell.position) {
							cell.rowSpanTarget = prevCell.rowSpanTarget ?? prevCell;
							// Only append text if it's different from the target cell
							const textToAppend = cell.text.slice(0, -1).trim();
							const targetText = cell.rowSpanTarget.text.trim();

							// Don't append if the text is the same or already contained (common case for rowspan indicators)
							if (
								textToAppend &&
								textToAppend !== targetText &&
								!targetText.includes(textToAppend)
							) {
								cell.rowSpanTarget.text = targetText + (targetText ? ' ' : '') + textToAppend;
							}
							cell.rowSpanTarget.rowspan += 1;
							cell.rowspan = 0;
							targetFound = true;
							break;
						} else {
							// More complex case: Track colspan cells that need rowspan for next row
							const key = `${cell.position}-${cell.colspan}`;
							colspanCells.set(key, {
								original: prevCell,
								newCell: cell
							});
							// Keep the cell visible for now, will be merged in rendering
						}
					} else {
						// Standard case of single column cell with rowspan
						cell.rowSpanTarget = prevCell.rowSpanTarget ?? prevCell;
						// Only append text if it's different from the target cell
						const textToAppend = cell.text.slice(0, -1).trim();
						const targetText = cell.rowSpanTarget.text.trim();

						// Don't append if the text is the same or already contained (common case for rowspan indicators)
						if (textToAppend && textToAppend !== targetText && !targetText.includes(textToAppend)) {
							cell.rowSpanTarget.text = targetText + (targetText ? ' ' : '') + textToAppend;
						}
						cell.rowSpanTarget.rowspan += 1;
						cell.rowspan = 0;
						targetFound = true;
						break;
					}
				}
			}

			// If no target was found but it's a rowspan cell, clean the ^ indicator
			if (!targetFound && cell.rowspan > 0) {
				cell.text = cell.text.slice(0, -1);
			}
		}
	}

	// Process any complex colspan+rowspan combinations we tracked
	colspanCells.forEach((spanData) => {
		const { original, newCell } = spanData;
		if (original && newCell) {
			// Here we could apply more sophisticated merging logic
			// For now, just mark that these cells have a relationship
			newCell.complexRowSpan = true;
			newCell.relatedCell = original;
		}
	});

	// Normalize column count
	return normalizeColumnCount(processedCells, count, numCols);
};

// Ensures the row has the correct number of columns
const normalizeColumnCount = (
	cells: WorkingRow,
	count: number | null,
	numCols: number
): WorkingRow => {
	// If count is null, don't normalize
	if (count === null) return cells;

	if (numCols > count) {
		// We need to keep track of total column count
		let currentColCount = 0;
		const cellsToKeep: WorkingRow = [];

		for (const cell of cells) {
			if (currentColCount + cell.colspan <= count) {
				// This cell fits completely
				cellsToKeep.push(cell);
				currentColCount += cell.colspan;
			} else if (currentColCount < count) {
				// This cell partially fits - adjust its colspan
				const adjustedCell = { ...cell };
				adjustedCell.colspan = count - currentColCount;
				cellsToKeep.push(adjustedCell);
				currentColCount = count;
			} else {
				// This cell doesn't fit at all
				break;
			}
		}

		return cellsToKeep;
	} else {
		while (numCols < count) {
			cells.push({
				colspan: 1,
				rowspan: 1,
				text: '',
				position: numCols
			});
			numCols += 1;
		}
	}
	return cells;
};

// Process alignment indicators in table headers
function processAlignment(alignRow: string[]): (string | null)[] {
	const alignment: (string | null)[] = [];
	for (let i = 0; i < alignRow.length; i++) {
		if (/^ *-+: *$/.test(alignRow[i])) {
			alignment[i] = 'right';
		} else if (/^ *:-+: *$/.test(alignRow[i])) {
			alignment[i] = 'center';
		} else if (/^ *:-+ *$/.test(alignRow[i])) {
			alignment[i] = 'left';
		} else {
			alignment[i] = null;
		}
	}
	return alignment;
}

// Convert working cell to TH
function workingCellToTH(cell: WorkingCell, align?: string | null): TH {
	return {
		type: 'th',
		rowspan: cell.rowspan,
		colspan: cell.colspan,
		text: cell.text,
		position: cell.position,
		tokens: cell.tokens,
		rowSpanTarget: cell.rowSpanTarget,
		complexRowSpan: cell.complexRowSpan,
		relatedCell: cell.relatedCell,
		align
	};
}

// Convert working cell to TD
function workingCellToTD(cell: WorkingCell, align?: string | null): TD {
	return {
		type: 'td',
		rowspan: cell.rowspan,
		colspan: cell.colspan,
		text: cell.text,
		position: cell.position,
		tokens: cell.tokens,
		rowSpanTarget: cell.rowSpanTarget,
		complexRowSpan: cell.complexRowSpan,
		relatedCell: cell.relatedCell,
		align
	};
}

// Process table rows and add inline tokens to cells
function processRows(
	headerRows: string[],
	bodyRows: string[],
	alignment: (string | null)[],
	colCount: number,
	lexer: any,
	maxColspan: number | null,
	detectFooter: boolean
): TableSection[] {
	const tokens: TableSection[] = [];

	// Process header rows
	const processedHeaderRows: WorkingRow[] = [];
	for (let i = 0; i < headerRows.length; i++) {
		const prevRow = i > 0 ? processedHeaderRows[i - 1] : null;
		processedHeaderRows[i] = splitCells(headerRows[i], colCount, prevRow, maxColspan);
	}

	// Convert header rows to THead (only if we have header rows)
	if (processedHeaderRows.length > 0) {
		const theadRows: THeadRow[] = processedHeaderRows.map((row) => ({
			type: 'tr',
			tokens: row.map((cell) => {
				// Use the cell's position to get the correct alignment
				const cellAlignment = cell.position !== undefined ? alignment[cell.position] : null;
				const th = workingCellToTH(cell, cellAlignment);
				// Add inline tokens
				th.tokens = lexer.inline(th.text, th.tokens as any);
				return th;
			})
		}));

		tokens.push({
			type: 'thead',
			tokens: theadRows
		});
	}

	// Process body rows
	if (bodyRows.length > 0) {
		const processedBodyRows: WorkingRow[] = [];
		for (let i = 0; i < bodyRows.length; i++) {
			const prevRow =
				i > 0 ? processedBodyRows[i - 1] : processedHeaderRows[processedHeaderRows.length - 1];
			processedBodyRows[i] = splitCells(bodyRows[i], colCount, prevRow, maxColspan);
		}

		// Handle footer detection
		let tbodyRows = processedBodyRows;
		let tfootRows: WorkingRow[] = [];

		if (detectFooter && processedBodyRows.length > 0) {
			const lastRowIndex = processedBodyRows.length - 1;
			tfootRows = [processedBodyRows[lastRowIndex]];
			tbodyRows = processedBodyRows.slice(0, lastRowIndex);
		}

		// Convert body rows to TBody if there are any
		if (tbodyRows.length > 0) {
			const tbodyRowTokens: TRow[] = tbodyRows.map((row) => ({
				type: 'tr',
				tokens: row.map((cell) => {
					// Use the cell's position to get the correct alignment
					const cellAlignment = cell.position !== undefined ? alignment[cell.position] : null;
					const td = workingCellToTD(cell, cellAlignment);
					// Add inline tokens

					td.tokens = lexer.inline(td.text, td.tokens as any);
					return td;
				})
			}));

			tokens.push({
				type: 'tbody',
				tokens: tbodyRowTokens
			});
		}

		// Convert footer rows to TFoot if there are any
		if (tfootRows.length > 0) {
			const tfootRowTokens: TRow[] = tfootRows.map((row) => ({
				type: 'tr',
				tokens: row.map((cell) => {
					// Use the cell's position to get the correct alignment
					const cellAlignment = cell.position !== undefined ? alignment[cell.position] : null;
					const td = workingCellToTD(cell, cellAlignment);
					// Add inline tokens
					td.tokens = lexer.inline(td.text, td.tokens as any);
					return td;
				})
			}));

			tokens.push({
				type: 'tfoot',
				tokens: tfootRowTokens
			});
		}
	}

	return tokens;
}

// Adds support for extended tables in marked with row spanning, column spanning,
// multi-row headers, and column alignment
export function markedTable(options: SpanTableOptions = {}): {
	extensions: {
		name: string;
		level: 'block' | 'inline';
		start: TokenizerStartFunction;
		tokenizer: TokenizerExtensionFunction;
	}[];
} {
	const config = { ...DEFAULT_OPTIONS, ...options };
	const { detectFooter, maxColspan } = config;

	return {
		extensions: [
			{
				name: 'table',
				level: 'block',
				start(src: string) {
					// Check for table with potential header alignment
					let match = src.match(/^\n *([^\n ].*\|.*)\n/);
					if (match) return match.index;

					// Check for simple table without header alignment
					match = src.match(/^\n *(\|.*\|)\n/);
					if (match) return match.index;

					return undefined;
				},
				tokenizer(this: TokenizerThis, src: string): any {
					// Try to match table with header and alignment first
					let regex = new RegExp(
						'^' +
							'([^\\n ].*\\|.*\\n(?: *[^\\s].*\\n)*?)' + // Header
							' {0,3}(?:\\| *)?(:?-+:? *(?:\\| *:?-+:? *)*)(?:\\| *)?' + // Header Align
							'(?:\\n((?:(?! *\\n| {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})' + // Body Cells
							'(?:\\n+|$)| {0,3}#{1,6} | {0,3}>| {4}[^\\n]| {0,3}(?:`{3,}' +
							'(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n| {0,3}(?:[*+-]|1[.)]) |' +
							'<\\/?(?:address|article|aside|base|basefont|blockquote|body|' +
							'caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:script|pre|style|textarea|!--)).*(?:\\n|$))*)\\n*|$)'
					);

					let cap = regex.exec(src);
					let hasHeaderAlignment = true;

					// If no match with header alignment, try table without header alignment
					if (!cap) {
						// Simple regex for tables without header alignment
						regex = /^(\|.*\|(?:\n\|.*\|)*)/;
						cap = regex.exec(src);
						hasHeaderAlignment = false;
					}

					if (!cap) return null;

					// Combine all captured groups to get complete table rows
					let allTableContent = cap[1]; // Headers
					if (cap[2]) allTableContent += '\n' + cap[2]; // Alignment row
					if (cap[3]) allTableContent += '\n' + cap[3]; // Body rows

					const allRows = allTableContent.replace(/\n$/, '').split('\n');
					let headerRows: string[] = [];
					let bodyRows: string[] = [];
					let alignRow: string[] = [];
					let alignment: (string | null)[] = [];
					let colCount = 0;

					if (hasHeaderAlignment) {
						// Traditional table with header and alignment
						// Parse all rows and identify which are headers vs body
						let headerEndIndex = -1;

						// Find the FIRST alignment row (contains dashes/underscores/asterisks)
						for (let i = 0; i < allRows.length; i++) {
							const row = allRows[i].trim();
							const isAlignment = /^ *(\| *)?:?-+:? *(\| *:?-+:? *)*(\| *)?$/.test(row);
							// Check if this row matches alignment pattern (contains only |, spaces, and alignment chars)
							if (isAlignment) {
								headerEndIndex = i;
								alignRow = row.replace(/^ *\| *| *\| *$/g, '').split(/ *\| */);
								break; // Stop at the first alignment row
							}
						}

						if (headerEndIndex === -1) {
							// No alignment row found, treat as simple table
							bodyRows = allRows;
							colCount = bodyRows[0].split('|').filter((cell) => cell.trim() !== '').length;
							alignment = new Array(colCount).fill(null);
						} else {
							// Found alignment row, split headers and body
							// Filter out empty rows and the alignment row itself from headers

							headerRows = allRows.slice(0, headerEndIndex).filter((row) => row.trim() !== '');

							bodyRows =
								headerEndIndex + 1 < allRows.length ? allRows.slice(headerEndIndex + 1) : [];

							// Use alignment row length as the authoritative column count
							colCount = alignRow.length;

							// Validate that we have a reasonable table structure
							if (colCount === 0) return null;

							// Process alignment
							alignment = processAlignment(alignRow);
						}
					} else {
						// Table without header alignment - treat all rows as body rows
						bodyRows = allRows;
						const firstRowCells = bodyRows[0].split('|').filter((cell) => cell.trim() !== '');
						colCount = firstRowCells.length;
						alignment = new Array(colCount).fill(null); // No alignment for tables without headers
					}

					// Detect footer alignment row pattern in body rows (only for tables with header alignment)
					let shouldDetectFooter = false;
					let processedBodyRows = bodyRows;

					if (detectFooter && hasHeaderAlignment && bodyRows.length > 0) {
						// Check if any row matches the alignment pattern (contains only dashes, pipes, colons, and spaces)
						for (let i = bodyRows.length - 1; i >= 0; i--) {
							const row = bodyRows[i];
							if (/^ *\| *:?-+:? *(\| *:?-+:? *)*\| *$/.test(row)) {
								// Found footer alignment row - remove it and enable footer detection
								shouldDetectFooter = true;
								processedBodyRows = bodyRows.slice(0, i).concat(bodyRows.slice(i + 1));
								break;
							}
						}
					}

					// Process all rows and create table sections
					const tokens = processRows(
						headerRows,
						processedBodyRows,
						alignment,
						colCount,
						this.lexer,
						maxColspan,
						shouldDetectFooter
					);

					const item: TableToken = {
						type: 'table',
						tokens,
						raw: cap[0]
					};

					return item;
				}
			}
		]
	};
}
