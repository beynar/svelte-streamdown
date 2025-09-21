const linkImagePattern = /(!?\[)([^\]]*?)$/;
const boldPattern = /(\*\*)([^]*?)$/;
const italicPattern = /(__)([^_]*?)$/;
const boldItalicPattern = /(\*\*\*)([^*]*?)$/;
const singleAsteriskPattern = /(\*)([^*]*?)$/;
const singleUnderscorePattern = /(_)([^_]*?)$/;
const inlineCodePattern = /(`)([^`]*?)$/;
const strikethroughPattern = /(~~)([^~]*?)$/;
const subPattern = /(~)([^~]*?)$/;
const supPattern = /(\^)([^\^]*?)$/;
const incompleteLinkUrlPattern = /(!?\[[^\]]*\]\()([^)]*?)$/;

// Helper function to find the end of the line containing a specific position
const findEndOfLineContaining = (text: string, position: number): number => {
	let endPos = position;

	// Move forward to find the end of the line
	while (endPos < text.length && text[endPos] !== '\n') {
		endPos++;
	}

	return endPos;
};

// Helper function to check if we have a complete code block
const hasCompleteCodeBlock = (text: string): boolean => {
	const tripleBackticks = (text.match(/```/g) || []).length;
	return tripleBackticks > 0 && tripleBackticks % 2 === 0 && text.includes('\n');
};

// Handles incomplete links and images by preserving them with a special marker
const handleIncompleteLinksAndImages = (text: string): string => {
	// Check for incomplete link URLs like "[text](incomplete-url"
	const urlMatch = text.match(incompleteLinkUrlPattern);
	if (urlMatch) {
		const isImage = urlMatch[1].startsWith('!');
		const url = urlMatch[2];

		// Only handle if there's actually some URL content
		if (url.length > 0) {
			// Check if the URL is actually incomplete
			const isIncomplete = isUrlIncomplete(url);
			if (isIncomplete) {
				// For incomplete URLs, replace with incomplete marker
				const marker = isImage ? 'streamdown:incomplete-image' : 'streamdown:incomplete-link';
				return text.replace(urlMatch[2], marker) + ')';
			} else {
				// URL is complete, just add closing parenthesis
				return `${text})`;
			}
		} else {
			// If URL is empty (just "[text]("), complete it with incomplete marker
			const marker = isImage ? 'streamdown:incomplete-image' : 'streamdown:incomplete-link';
			return `${text}${marker})`;
		}
	}

	// Check for incomplete link text like "[incomplete-text" (but not "[text](")
	const linkMatch = text.match(linkImagePattern);
	if (linkMatch && !text.includes('](')) {
		const isImage = linkMatch[1].startsWith('!');

		// For incomplete link/image text, complete with incomplete marker
		const marker = isImage ? 'streamdown:incomplete-image' : 'streamdown:incomplete-link';
		return `${text}](${marker})`;
	}

	return text;
};

// Helper function to determine if a URL is incomplete or lacks proper domain extension
const isUrlIncomplete = (url: string): boolean => {
	// If URL is clearly incomplete (too short, no protocol, etc.)
	if (!url || url.length < 4) {
		return true;
	}

	// If URL starts with protocol but is very short
	if (
		(url.startsWith('http://') && url.length < 12) ||
		(url.startsWith('https://') && url.length < 13)
	) {
		return true;
	}

	// If URL has protocol, extract the domain part
	let domain = url;
	if (url.startsWith('http://')) {
		domain = url.substring(7);
	} else if (url.startsWith('https://')) {
		domain = url.substring(8);
	}

	// Remove path, query, and fragment parts to get just the domain
	domain = domain.split('/')[0].split('?')[0].split('#')[0];

	// Check if domain has a proper extension
	const domainParts = domain.split('.');
	if (domainParts.length < 2) {
		return true; // No extension at all
	}

	const extension = domainParts[domainParts.length - 1];

	// Check if extension looks valid (at least 2 characters, only letters)
	if (extension.length < 2 || !/^[a-zA-Z]+$/.test(extension)) {
		return true;
	}

	// If we get here, the URL looks reasonably complete
	return false;
};

// Completes incomplete bold formatting (**)
const handleIncompleteBold = (text: string): string => {
	// Don't process if inside a complete code block
	if (hasCompleteCodeBlock(text)) {
		return text;
	}

	// IMPORTANT SAFEGUARD: Don't modify text that contains complete italic patterns
	// This prevents accidentally converting *italic* to something else
	const completeItalicPattern = /\*[^*\n]+\*/g;
	const completeItalicMatches = text.match(completeItalicPattern);

	const boldMatch = text.match(boldPattern);

	if (boldMatch) {
		// Find the position of the last ** marker
		const lastDoubleAsteriskIndex = text.lastIndexOf('**');
		const contentAfterMarker = text.substring(lastDoubleAsteriskIndex + 2);

		// Don't close if there's no meaningful content after the opening markers
		// Check if content is only whitespace or other emphasis markers
		if (!contentAfterMarker || /^[\s_~*`]*$/.test(contentAfterMarker)) {
			return text;
		}

		// Check if this is a standalone horizontal rule (asterisks on a line by themselves)
		const matchIndex = lastDoubleAsteriskIndex;
		const lineStart = text.lastIndexOf('\n', matchIndex) + 1;
		const lineEnd = text.indexOf('\n', matchIndex);
		const lineContent = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
		const trimmedLine = lineContent.trim();

		// If the line contains only asterisks (2 or more), it's a horizontal rule
		if (/^\*+$/.test(trimmedLine) && trimmedLine.length >= 2) {
			return text;
		}

		// For streaming context, we allow multi-line completion
		// Remove the conservative multi-line restriction for better UX

		// ADDITIONAL SAFEGUARD: Check if the content after ** would interfere with existing italic
		if (contentAfterMarker.endsWith('*') && !contentAfterMarker.endsWith('**')) {
			// Before treating as incomplete closing marker, check if this would break italic formatting
			const potentiallyAffectedText = contentAfterMarker.slice(0, -1);
			if (completeItalicMatches && potentiallyAffectedText.includes('*')) {
				// Don't modify if it would interfere with existing italic patterns
				return text;
			}

			// The content ends with a single *, treat it as an incomplete closing marker
			// Remove the trailing * and add complete closing **
			const contentWithoutTrailingAsterisk = contentAfterMarker.slice(0, -1);
			return text.substring(0, lastDoubleAsteriskIndex + 2) + contentWithoutTrailingAsterisk + '**';
		}

		// Count all ** sequences - if odd, we have an unmatched opening **
		const doubleAsteriskMatches = text.match(/\*\*/g) || [];
		const doubleAsteriskCount = doubleAsteriskMatches.length;
		if (doubleAsteriskCount % 2 === 1) {
			// Find the end of the line containing the incomplete bold marker
			const endOfLine = findEndOfLineContaining(text, lastDoubleAsteriskIndex);
			return text.substring(0, endOfLine) + '**' + text.substring(endOfLine);
		}
	}

	return text;
};

// Completes incomplete italic formatting with double underscores (__)
const handleIncompleteDoubleUnderscoreItalic = (text: string): string => {
	const italicMatch = text.match(italicPattern);

	if (italicMatch) {
		// Don't close if there's no meaningful content after the opening markers
		// italicMatch[2] contains the content after __
		// Check if content is only whitespace or other emphasis markers
		const contentAfterMarker = italicMatch[2];
		if (!contentAfterMarker || /^[\s_~*`]*$/.test(contentAfterMarker)) {
			return text;
		}

		// Check if this is a standalone horizontal rule (underscores on a line by themselves)
		const matchIndex = text.lastIndexOf('__');
		const lineStart = text.lastIndexOf('\n', matchIndex) + 1;
		const lineEnd = text.indexOf('\n', matchIndex);
		const lineContent = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
		const trimmedLine = lineContent.trim();

		// If the line contains only underscores (3 or more), it's a horizontal rule
		if (/^_+$/.test(trimmedLine) && trimmedLine.length >= 3) {
			return text;
		}

		// Check if the underscore marker is in a list item context
		// Find the position of the matched underscore marker
		const markerIndex = text.lastIndexOf(italicMatch[1]);
		const beforeMarker = text.substring(0, markerIndex);
		const lastNewlineBeforeMarker = beforeMarker.lastIndexOf('\n');
		const lineStart2 = lastNewlineBeforeMarker === -1 ? 0 : lastNewlineBeforeMarker + 1;
		const lineBeforeMarker = text.substring(lineStart2, markerIndex);

		// Check if this line is a list item with just the underscore marker
		if (/^[\s]*[-*+][\s]+$/.test(lineBeforeMarker)) {
			// This is a list item with just emphasis markers
			// Check if content after marker spans multiple lines
			const hasNewlineInContent = contentAfterMarker.includes('\n');
			if (hasNewlineInContent) {
				// Don't complete if the content spans to another line
				return text;
			}
		}

		const underscorePairs = (text.match(/__/g) || []).length;
		if (underscorePairs % 2 === 1) {
			// Find the position of the last __ marker
			const lastDoubleUnderscoreIndex = text.lastIndexOf('__');
			// Find the end of the line containing the incomplete italic marker
			const endOfLine = findEndOfLineContaining(text, lastDoubleUnderscoreIndex);
			return text.substring(0, endOfLine) + '__' + text.substring(endOfLine);
		}
	}

	return text;
};

// Counts single asterisks that are not part of double asterisks, not escaped, and not list markers
const countSingleAsterisks = (text: string): number => {
	let count = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '*') {
			const prevChar = i > 0 ? text[i - 1] : '';
			const nextChar = i < text.length - 1 ? text[i + 1] : '';
			// Skip if escaped with backslash
			if (prevChar === '\\') {
				continue;
			}
			// Check if this is a list marker (asterisk at start of line followed by space)
			// Look backwards to find the start of the current line
			let lineStartIndex = i;
			for (let j = i - 1; j >= 0; j--) {
				if (text[j] === '\n') {
					lineStartIndex = j + 1;
					break;
				}
				if (j === 0) {
					lineStartIndex = 0;
					break;
				}
			}
			// Check if this asterisk is at the beginning of a line (with optional whitespace)
			const beforeAsterisk = text.substring(lineStartIndex, i);
			if (beforeAsterisk.trim() === '' && (nextChar === ' ' || nextChar === '\t')) {
				// This is likely a list marker, don't count it
				continue;
			}
			if (prevChar !== '*' && nextChar !== '*') {
				count++;
			}
		}
	}
	return count;
};

// Completes incomplete italic formatting with single asterisks (*)
const handleIncompleteSingleAsteriskItalic = (text: string): string => {
	// Don't process if inside a complete code block
	if (hasCompleteCodeBlock(text)) {
		return text;
	}

	// IMPORTANT SAFEGUARD: Check if we already have complete italic formatting patterns
	// If text contains complete *word* patterns, don't modify them
	const completeItalicPattern = /\*[^*\n]+\*/g;
	const completeMatches = text.match(completeItalicPattern);
	if (completeMatches) {
		// Count asterisks in complete matches
		const asterisksInCompleteMatches = completeMatches.join('').split('*').length - 1;
		const totalAsterisks = (text.match(/\*/g) || []).length;

		// If most asterisks are already in complete italic patterns, don't process
		if (asterisksInCompleteMatches >= totalAsterisks) {
			return text;
		}
	}

	const singleAsteriskMatch = text.match(singleAsteriskPattern);

	if (singleAsteriskMatch) {
		// Find the first single asterisk position (not part of **)
		let firstSingleAsteriskIndex = -1;
		for (let i = 0; i < text.length; i++) {
			if (text[i] === '*' && text[i - 1] !== '*' && text[i + 1] !== '*') {
				firstSingleAsteriskIndex = i;
				break;
			}
		}

		if (firstSingleAsteriskIndex === -1) {
			return text;
		}

		// Get content after the first single asterisk
		const contentAfterFirstAsterisk = text.substring(firstSingleAsteriskIndex + 1);

		// Check if there's meaningful content after the asterisk
		// Don't close if content is only whitespace or emphasis markers
		if (!contentAfterFirstAsterisk || /^[\s_~*`]*$/.test(contentAfterFirstAsterisk)) {
			return text;
		}

		// Additional check: be more conservative about single asterisks
		// Only complete if the asterisk appears to be intended for formatting
		const prevChar = firstSingleAsteriskIndex > 0 ? text[firstSingleAsteriskIndex - 1] : '';
		const nextChar =
			firstSingleAsteriskIndex < text.length - 1 ? text[firstSingleAsteriskIndex + 1] : '';

		// If asterisk is surrounded by word characters, it's likely literal (e.g., test*var)
		if (/\w/.test(prevChar) && /\w/.test(nextChar)) {
			return text;
		}

		// If asterisk is at the end of a word/phrase, be more cautious
		// Only complete if there's clear whitespace before it (typical italic pattern)
		if (/\w/.test(prevChar) && !/\s/.test(prevChar)) {
			return text;
		}

		const singleAsterisks = countSingleAsterisks(text);
		if (singleAsterisks % 2 === 1) {
			// Find the end of the line containing the incomplete italic marker
			const endOfLine = findEndOfLineContaining(text, firstSingleAsteriskIndex);
			return text.substring(0, endOfLine) + '*' + text.substring(endOfLine);
		}
	}

	return text;
};

// Check if a position is within a math block (between $ or $$)
const isWithinMathBlock = (text: string, position: number): boolean => {
	// Count dollar signs before this position
	let inInlineMath = false;
	let inBlockMath = false;

	for (let i = 0; i < text.length && i < position; i++) {
		// Skip escaped dollar signs
		if (text[i] === '\\' && text[i + 1] === '$') {
			i++; // Skip the next character
			continue;
		}

		if (text[i] === '$') {
			// Check for block math ($$)
			if (text[i + 1] === '$') {
				inBlockMath = !inBlockMath;
				i++; // Skip the second $
				inInlineMath = false; // Block math takes precedence
			} else if (!inBlockMath) {
				// Only toggle inline math if not in block math
				inInlineMath = !inInlineMath;
			}
		}
	}

	return inInlineMath || inBlockMath;
};

// Check if a position is within a footnote reference pattern [^label]
const isWithinFootnoteRef = (text: string, position: number): boolean => {
	// Look backwards from position to find if we're inside [^...]
	let openBracketPos = -1;
	let caretPos = -1;

	for (let i = position; i >= 0; i--) {
		if (text[i] === ']') {
			// Found closing bracket before our position, not in footnote
			return false;
		}
		if (text[i] === '^' && caretPos === -1) {
			caretPos = i;
		}
		if (text[i] === '[') {
			openBracketPos = i;
			break;
		}
	}

	// Check if we have the pattern [^ and our position is after the caret
	if (openBracketPos !== -1 && caretPos === openBracketPos + 1 && position >= caretPos) {
		// Look forward to see if there's a closing bracket
		for (let i = position + 1; i < text.length; i++) {
			if (text[i] === ']') {
				return true; // We're inside [^...] pattern
			}
			if (text[i] === '[' || text[i] === '\n') {
				break; // Invalid pattern
			}
		}
	}

	return false;
};

// Counts single underscores that are not part of double underscores, not escaped, and not in math blocks
const countSingleUnderscores = (text: string): number => {
	let count = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '_') {
			const prevChar = i > 0 ? text[i - 1] : '';
			const nextChar = i < text.length - 1 ? text[i + 1] : '';
			// Skip if escaped with backslash
			if (prevChar === '\\') {
				continue;
			}
			// Skip if within math block
			if (isWithinMathBlock(text, i)) {
				continue;
			}
			// Skip if underscore is word-internal (between word characters)
			if (
				prevChar &&
				nextChar &&
				/[\p{L}\p{N}_]/u.test(prevChar) &&
				/[\p{L}\p{N}_]/u.test(nextChar)
			) {
				continue;
			}
			if (prevChar !== '_' && nextChar !== '_') {
				count++;
			}
		}
	}
	return count;
};

// Completes incomplete italic formatting with single underscores (_)
const handleIncompleteSingleUnderscoreItalic = (text: string): string => {
	// Don't process if inside a complete code block
	if (hasCompleteCodeBlock(text)) {
		return text;
	}

	const singleUnderscoreMatch = text.match(singleUnderscorePattern);

	if (singleUnderscoreMatch) {
		// Find the first single underscore position (not part of __ and not word-internal)
		let firstSingleUnderscoreIndex = -1;
		for (let i = 0; i < text.length; i++) {
			if (
				text[i] === '_' &&
				text[i - 1] !== '_' &&
				text[i + 1] !== '_' &&
				text[i - 1] !== '\\' &&
				!isWithinMathBlock(text, i)
			) {
				// Check if underscore is word-internal (between word characters)
				const prevChar = i > 0 ? text[i - 1] : '';
				const nextChar = i < text.length - 1 ? text[i + 1] : '';
				if (
					prevChar &&
					nextChar &&
					/[\p{L}\p{N}_]/u.test(prevChar) &&
					/[\p{L}\p{N}_]/u.test(nextChar)
				) {
					continue;
				}

				firstSingleUnderscoreIndex = i;
				break;
			}
		}

		if (firstSingleUnderscoreIndex === -1) {
			return text;
		}

		// Get content after the first single underscore
		const contentAfterFirstUnderscore = text.substring(firstSingleUnderscoreIndex + 1);

		// Check if there's meaningful content after the underscore
		// Don't close if content is only whitespace or emphasis markers
		if (!contentAfterFirstUnderscore || /^[\s_~*`]*$/.test(contentAfterFirstUnderscore)) {
			return text;
		}

		const singleUnderscores = countSingleUnderscores(text);
		if (singleUnderscores % 2 === 1) {
			// Find the end of the line containing the incomplete underscore italic marker
			const endOfLine = findEndOfLineContaining(text, firstSingleUnderscoreIndex);
			return text.substring(0, endOfLine) + '_' + text.substring(endOfLine);
		}
	}

	return text;
};

// Checks if a backtick at position i is part of a triple backtick sequence
const isPartOfTripleBacktick = (text: string, i: number): boolean => {
	const isTripleStart = text.substring(i, i + 3) === '```';
	const isTripleMiddle = i > 0 && text.substring(i - 1, i + 2) === '```';
	const isTripleEnd = i > 1 && text.substring(i - 2, i + 1) === '```';

	return isTripleStart || isTripleMiddle || isTripleEnd;
};

// Counts single backticks that are not part of triple backticks
const countSingleBackticks = (text: string): number => {
	let count = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '`' && !isPartOfTripleBacktick(text, i)) {
			count++;
		}
	}
	return count;
};

// Completes incomplete inline code formatting (`)
// Avoids completing if inside an incomplete code block
const handleIncompleteInlineCode = (text: string): string => {
	// Check if we have inline triple backticks (starts with ``` and should end with ```)
	// This pattern should ONLY match truly inline code (no newlines)
	// Examples: ```code``` or ```python code```
	const inlineTripleBacktickMatch = text.match(/^```[^`\n]*```?$/);
	if (inlineTripleBacktickMatch && !text.includes('\n')) {
		// Check if it ends with exactly 2 backticks (incomplete)
		if (text.endsWith('``') && !text.endsWith('```')) {
			return `${text}\``;
		}
		// Already complete inline triple backticks
		return text;
	}

	// Check if we're inside a multi-line code block (complete or incomplete)
	const allTripleBackticks = (text.match(/```/g) || []).length;
	const insideIncompleteCodeBlock = allTripleBackticks % 2 === 1;

	// Don't modify text if we have complete multi-line code blocks (even pairs of ```)
	if (allTripleBackticks > 0 && allTripleBackticks % 2 === 0 && text.includes('\n')) {
		// We have complete multi-line code blocks, don't add any backticks
		return text;
	}

	// Special case: if text ends with ```\n (triple backticks followed by newline)
	// This is actually a complete code block, not incomplete
	if (text.endsWith('```\n') || text.endsWith('```')) {
		// Count all triple backticks - if even, it's complete
		if (allTripleBackticks % 2 === 0) {
			return text;
		}
	}

	const inlineCodeMatch = text.match(inlineCodePattern);

	if (inlineCodeMatch && !insideIncompleteCodeBlock) {
		// Don't close if there's no meaningful content after the opening marker
		// inlineCodeMatch[2] contains the content after `
		// Check if content is only whitespace or other emphasis markers
		const contentAfterMarker = inlineCodeMatch[2];
		if (!contentAfterMarker || /^[\s_~*`]*$/.test(contentAfterMarker)) {
			return text;
		}

		const singleBacktickCount = countSingleBackticks(text);
		if (singleBacktickCount % 2 === 1) {
			// Find the position of the last backtick
			const lastBacktickIndex = text.lastIndexOf('`');
			// Find the end of the line containing the incomplete code marker
			const endOfLine = findEndOfLineContaining(text, lastBacktickIndex);
			return text.substring(0, endOfLine) + '`' + text.substring(endOfLine);
		}
	}

	return text;
};

// Completes incomplete strikethrough formatting (~~)
const handleIncompleteStrikethrough = (text: string): string => {
	const strikethroughMatch = text.match(strikethroughPattern);

	if (strikethroughMatch) {
		// Don't close if there's no meaningful content after the opening markers
		// strikethroughMatch[2] contains the content after ~~
		// Check if content is only whitespace or other emphasis markers
		const contentAfterMarker = strikethroughMatch[2];
		if (!contentAfterMarker || /^[\s_~*`]*$/.test(contentAfterMarker)) {
			return text;
		}

		const tildePairs = (text.match(/~~/g) || []).length;
		if (tildePairs % 2 === 1) {
			// Find the position of the last ~~ marker
			const lastDoubleTildeIndex = text.lastIndexOf('~~');
			// Find the end of the line containing the incomplete strikethrough marker
			const endOfLine = findEndOfLineContaining(text, lastDoubleTildeIndex);
			return text.substring(0, endOfLine) + '~~' + text.substring(endOfLine);
		}
	}

	return text;
};

// Counts single tildes that are not part of double tildes and not escaped
const countSingleTildes = (text: string): number => {
	let count = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '~') {
			const prevChar = i > 0 ? text[i - 1] : '';
			const nextChar = i < text.length - 1 ? text[i + 1] : '';
			// Skip if escaped with backslash
			if (prevChar === '\\') {
				continue;
			}
			// Skip if part of double tilde
			if (prevChar !== '~' && nextChar !== '~') {
				count++;
			}
		}
	}
	return count;
};

// Completes incomplete subscript formatting (~)
const handleIncompleteSub = (text: string): string => {
	// Don't process if inside a complete code block
	if (hasCompleteCodeBlock(text)) {
		return text;
	}

	const singleTildes = countSingleTildes(text);
	if (singleTildes % 2 === 1) {
		// Find the last unmatched tilde
		const lastTildeIndex = text.lastIndexOf('~');
		if (lastTildeIndex !== -1) {
			// Check if the tilde is within a math block - if so, don't process
			if (isWithinMathBlock(text, lastTildeIndex)) {
				return text;
			}

			const afterTilde = text.substring(lastTildeIndex + 1);

			// Don't close if there's no meaningful content after the opening marker
			if (!afterTilde || /^[\s_~*`^]*$/.test(afterTilde)) {
				return text;
			}

			// Find the end of the line containing the incomplete subscript marker
			const endOfLine = findEndOfLineContaining(text, lastTildeIndex);
			return text.substring(0, endOfLine) + '~' + text.substring(endOfLine);
		}
	}

	return text;
};

// Counts single carets that are not escaped and not in footnote references
const countSingleCarets = (text: string): number => {
	let count = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '^') {
			const prevChar = i > 0 ? text[i - 1] : '';
			// Skip if escaped with backslash
			if (prevChar === '\\') {
				continue;
			}
			// Skip if within footnote reference
			if (isWithinFootnoteRef(text, i)) {
				continue;
			}
			count++;
		}
	}
	return count;
};

// Completes incomplete superscript formatting (^)
const handleIncompleteSup = (text: string): string => {
	// Don't process if inside a complete code block
	if (hasCompleteCodeBlock(text)) {
		return text;
	}

	const singleCarets = countSingleCarets(text);
	if (singleCarets % 2 === 1) {
		// Find the last unmatched caret
		const lastCaretIndex = text.lastIndexOf('^');
		if (lastCaretIndex !== -1) {
			// Check if the caret is within a math block - if so, don't process
			if (isWithinMathBlock(text, lastCaretIndex)) {
				return text;
			}

			// Check if the caret is within a footnote reference - if so, don't process
			if (isWithinFootnoteRef(text, lastCaretIndex)) {
				return text;
			}

			const afterCaret = text.substring(lastCaretIndex + 1);

			// Don't close if there's no meaningful content after the opening marker
			if (!afterCaret || /^[\s_~*`^]*$/.test(afterCaret)) {
				return text;
			}

			// Find the end of the line containing the incomplete superscript marker
			const endOfLine = findEndOfLineContaining(text, lastCaretIndex);
			return text.substring(0, endOfLine) + '^' + text.substring(endOfLine);
		}
	}

	return text;
};

// Counts single dollar signs that are not part of double dollar signs, not escaped, and not currency
const countSingleDollarSigns = (text: string): number => {
	let count = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '$') {
			const prevChar = i > 0 ? text[i - 1] : '';
			const nextChar = i < text.length - 1 ? text[i + 1] : '';
			// Skip if escaped with backslash
			if (prevChar === '\\') {
				continue;
			}
			// Skip if part of double dollar
			if (prevChar === '$' || nextChar === '$') {
				continue;
			}
			// Skip if this looks like currency (digit immediately after $)
			if (nextChar && /\d/.test(nextChar)) {
				continue;
			}
			count++;
		}
	}
	return count;
};

// Completes incomplete inline math formatting ($)
const handleIncompleteInlineMath = (text: string): string => {
	// Don't process if inside a complete code block
	if (hasCompleteCodeBlock(text)) {
		return text;
	}

	// Count single dollar signs (excluding currency patterns)
	const singleDollars = countSingleDollarSigns(text);

	// If we have an odd number of single dollars, we need to complete
	if (singleDollars % 2 === 1) {
		// Find the last unmatched dollar sign
		let lastDollarIndex = -1;
		for (let i = text.length - 1; i >= 0; i--) {
			if (text[i] === '$') {
				const prevChar = i > 0 ? text[i - 1] : '';
				const nextChar = i < text.length - 1 ? text[i + 1] : '';

				// Skip if escaped or part of double dollar
				if (prevChar === '\\' || prevChar === '$' || nextChar === '$') {
					continue;
				}

				// Skip if this looks like currency
				if (nextChar && /\d/.test(nextChar)) {
					continue;
				}

				lastDollarIndex = i;
				break;
			}
		}

		if (lastDollarIndex !== -1) {
			const afterDollar = text.substring(lastDollarIndex + 1);

			// Don't complete if there's no meaningful content after the dollar
			if (!afterDollar || /^[\s$]*$/.test(afterDollar)) {
				return text;
			}

			// Check if content after dollar looks like math (contains letters, spaces, symbols)
			// but not pure numbers (which would be currency)
			if (/^\d+(\.\d{2})?\s*$/.test(afterDollar.trim())) {
				// This looks like currency, don't complete
				return text;
			}

			// Find the end of the line containing the incomplete inline math marker
			const endOfLine = findEndOfLineContaining(text, lastDollarIndex);
			return text.substring(0, endOfLine) + '$' + text.substring(endOfLine);
		}
	}

	return text;
};

// Completes incomplete block KaTeX formatting ($$)
const handleIncompleteBlockKatex = (text: string): string => {
	// Count all $$ pairs in the text
	const dollarPairs = (text.match(/\$\$/g) || []).length;

	// If we have an even number of $$, the block is complete
	if (dollarPairs % 2 === 0) {
		return text;
	}

	// If we have an odd number, add closing $$
	// Check if this looks like a multi-line math block (contains newlines after opening $$)
	const firstDollarIndex = text.indexOf('$$');
	const hasNewlineAfterStart =
		firstDollarIndex !== -1 && text.indexOf('\n', firstDollarIndex) !== -1;

	// For multi-line blocks, add newline before closing $$ if not present
	if (hasNewlineAfterStart && !text.endsWith('\n')) {
		return `${text}\n$$`;
	}

	// For inline blocks or when already ending with newline, just add $$
	return `${text}$$`;
};

// Counts triple asterisks that are not part of quadruple or more asterisks
const countTripleAsterisks = (text: string): number => {
	let count = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '*') {
			// Count consecutive asterisks
			let asteriskCount = 0;
			while (i < text.length && text[i] === '*') {
				asteriskCount++;
				i++;
			}
			i--; // Adjust back one position since the outer loop will increment

			// Each group of exactly 3 asterisks counts as one triple asterisk marker
			if (asteriskCount >= 3) {
				count += Math.floor(asteriskCount / 3);
			}
		}
	}
	return count;
};

// Completes incomplete bold-italic formatting (***)
const handleIncompleteBoldItalic = (text: string): string => {
	// Don't process if inside a complete code block
	if (hasCompleteCodeBlock(text)) {
		return text;
	}

	// Don't process if text is only asterisks and has 4 or more consecutive asterisks
	// This prevents cases like **** from being treated as incomplete ***
	if (/^\*{4,}$/.test(text)) {
		return text;
	}

	const boldItalicMatch = text.match(boldItalicPattern);

	if (boldItalicMatch) {
		// Don't close if there's no meaningful content after the opening markers
		// boldItalicMatch[2] contains the content after ***
		// Check if content is only whitespace or other emphasis markers
		const contentAfterMarker = boldItalicMatch[2];
		if (!contentAfterMarker || /^[\s_~*`]*$/.test(contentAfterMarker)) {
			return text;
		}

		// Check if this is a standalone horizontal rule (*** on a line by itself)
		const matchIndex = text.lastIndexOf('***');
		const lineStart = text.lastIndexOf('\n', matchIndex) + 1;
		const lineEnd = text.indexOf('\n', matchIndex);
		const lineContent = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
		const trimmedLine = lineContent.trim();

		// If the line contains only *** (possibly with whitespace), it's a horizontal rule
		if (trimmedLine === '***') {
			return text;
		}

		const tripleAsteriskCount = countTripleAsterisks(text);
		if (tripleAsteriskCount % 2 === 1) {
			// Find the position of the last *** marker
			const lastTripleAsteriskIndex = text.lastIndexOf('***');
			// Find the end of the line containing the incomplete bold-italic marker
			const endOfLine = findEndOfLineContaining(text, lastTripleAsteriskIndex);
			return text.substring(0, endOfLine) + '***' + text.substring(endOfLine);
		}
	}

	return text;
};

// Handles incomplete code blocks by leaving them unchanged
const handleIncompleteCodeBlock = (text: string): string => {
	// Check if we have an incomplete code block (odd number of triple backticks with newlines)
	const tripleBackticks = (text.match(/```/g) || []).length;

	// If we have an odd number of triple backticks and the text contains newlines,
	// this is likely an incomplete code block - leave it unchanged
	if (tripleBackticks % 2 === 1 && text.includes('\n')) {
		return text;
	}

	return text;
};

// Handles incomplete footnote references
const handleIncompleteFootnotes = (text: string): string => {
	// Check for incomplete footnote references like [^ or [^label
	// Match [^ followed by optional simple label, but ensure no ] follows immediately
	// and no complex characters that would indicate this isn't a footnote
	const footnotePattern = /\[\^([a-zA-Z0-9_-]*)(?![^\]\s,])/g;

	let result = text;
	let match;

	while ((match = footnotePattern.exec(text)) !== null) {
		const fullMatch = match[0];
		const label = match[1];

		// Check if this is at the end of a line or followed by simple separators
		const matchIndex = match.index;
		const afterMatch = text.substring(matchIndex + fullMatch.length);

		// If followed by end of string, newline, space, or comma, it's likely a footnote
		if (
			afterMatch === '' ||
			/^\s/.test(afterMatch) ||
			afterMatch.startsWith('\n') ||
			afterMatch.startsWith(',')
		) {
			const marker = 'streamdown-footnote';
			const replacement = `[^${marker}]`;
			result = result.replace(fullMatch, replacement);
			break; // Only process the first match to avoid conflicts
		}
	}

	return result;
};

// Parses markdown text and removes incomplete tokens to prevent partial rendering
export const parseIncompleteMarkdown = (text: string): string => {
	if (!text || typeof text !== 'string') {
		return text;
	}

	let result = text;

	// Handle incomplete code blocks FIRST - this prevents other formatters
	// from processing content that should be treated as literal code
	result = handleIncompleteCodeBlock(result);

	// Handle incomplete footnotes FIRST (before any other processing to avoid conflicts)
	result = handleIncompleteFootnotes(result);

	// Handle various formatting completions ONLY if not inside a code block
	// Handle double patterns before single patterns for proper priority
	result = handleIncompleteBoldItalic(result); // ***
	result = handleIncompleteBold(result); // **
	result = handleIncompleteDoubleUnderscoreItalic(result); // __
	result = handleIncompleteStrikethrough(result); // ~~
	result = handleIncompleteInlineCode(result); // `
	result = handleIncompleteSingleAsteriskItalic(result); // *
	result = handleIncompleteSingleUnderscoreItalic(result); // _
	result = handleIncompleteSub(result); // ~
	result = handleIncompleteSup(result); // ^

	// Handle KaTeX formatting
	result = handleIncompleteBlockKatex(result);
	result = handleIncompleteInlineMath(result);

	// Handle incomplete links and images LAST
	result = handleIncompleteLinksAndImages(result);

	return result;
};
