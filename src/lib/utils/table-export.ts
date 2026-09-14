export type TableData = {
	headers: string[];
	rows: string[][];
};

export type CsvSeparator = ',' | ';' | '\t' | 'auto';

// textContent flattens a real <br> element, so a multiline cell collapses to
// 'Paragraph one.Paragraph two.'. Walk the cell instead and keep the breaks;
// the serializers below quote or escape them.
const extractCellText = (node: Node): string => {
	if (node.nodeType === 3) return node.textContent || '';
	if ((node as Element).tagName === 'BR') return '\n';
	return Array.from(node.childNodes).map(extractCellText).join('');
};

/**
 * Read a rendered table (or any element containing one) into a plain matrix.
 * `colspan`/`rowspan` are expanded into empty cells so every row lines up.
 */
export const extractTableData = (element: Element): TableData => {
	const trs = Array.from(element.querySelectorAll('tr'));
	const rowSpanFills: Array<{ rowIndex: number; colIndex: number; colSpan: number }> = [];

	const matrix = trs.map((row, rowIndex) => {
		const rowData: string[] = [];
		let actualCol = 0; // column position in the output matrix, not in the DOM row

		Array.from(row.querySelectorAll('td, th')).forEach((cell) => {
			const colSpan = parseInt(cell.getAttribute('colspan') || '1');
			const rowSpan = parseInt(cell.getAttribute('rowspan') || '1');

			rowData.push(extractCellText(cell));
			for (let i = 0; i < colSpan - 1; i++) {
				rowData.push('');
			}

			if (rowSpan > 1) {
				for (let r = 1; r < rowSpan; r++) {
					rowSpanFills.push({ rowIndex: rowIndex + r, colIndex: actualCol, colSpan });
				}
			}

			actualCol += colSpan;
		});

		return rowData;
	});

	rowSpanFills.forEach(({ rowIndex, colIndex, colSpan }) => {
		if (matrix[rowIndex]) {
			matrix[rowIndex].splice(colIndex, 0, ...Array(colSpan).fill(''));
		}
	});

	// A markdown table always renders exactly one <thead> row; a DOM-only caller
	// may hand us a table without one, and then everything is a data row.
	const headers = trs[0]?.closest('thead') ? (matrix.shift() ?? []) : [];
	return { headers, rows: matrix };
};

const allRows = ({ headers, rows }: TableData) => (headers.length ? [headers, ...rows] : rows);

// Spreadsheets in locales that write 1,1 for one-and-a-tenth read ';' as the
// column separator; Intl is the only locale source we have without a dependency.
const resolveSeparator = (separator: CsvSeparator): string =>
	separator === 'auto' ? (Intl.NumberFormat().format(1.1).includes(',') ? ';' : ',') : separator;

export const tableDataToCSV = (data: TableData, separator: CsvSeparator = ','): string => {
	const sep = resolveSeparator(separator);
	const escape = (value: string) =>
		value.includes(sep) || /["\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
	return allRows(data)
		.map((row) => row.map(escape).join(sep))
		.join('\n');
};

export const tableDataToTSV = (data: TableData): string => {
	// TSV has no quoting, so a tab or a break inside a cell has to become an escape.
	const escape = (value: string) =>
		value.replace(/\t/g, '\\t').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
	return allRows(data)
		.map((row) => row.map(escape).join('\t'))
		.join('\n');
};

export const tableDataToMarkdown = (data: TableData): string => {
	const { headers, rows } = data;
	if (headers.length === 0) return '';
	// Backslashes first: escaping pipes adds backslashes of its own.
	const escape = (cell: string) =>
		cell.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
	const line = (cells: string[]) =>
		`| ${headers.map((_, i) => escape(cells[i] ?? '')).join(' | ')} |`;
	return [line(headers), `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map(line)].join(
		'\n'
	);
};

export const tableDataToHTML = (data: TableData): string => {
	const escape = (cell: string) =>
		cell.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
	const row = (cells: string[], tag: 'th' | 'td') =>
		`<tr>${cells.map((cell) => `<${tag}>${escape(cell)}</${tag}>`).join('')}</tr>`;
	const head = data.headers.length ? `<thead>${row(data.headers, 'th')}</thead>` : '';
	const body = data.rows.length
		? `<tbody>${data.rows.map((r) => row(r, 'td')).join('')}</tbody>`
		: '';
	return `<table>${head}${body}</table>`;
};
