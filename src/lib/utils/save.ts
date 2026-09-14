export const save = (filename: string, content: string, mimeType: string) => {
	// Excel on Windows assumes the system codepage without a BOM, so accented
	// and CJK text in a downloaded CSV opens as mojibake.
	const body = mimeType.startsWith('text/csv') ? '\uFEFF' + content : content;
	const blob = new Blob([body], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};
