import { marked, use } from 'marked';
import { markedAlert } from './src/lib/marked/marked-alert';
import { markedFootnote } from './src/lib/marked/marked-footnotes';
import { markedMath } from './src/lib/marked/marked-math';
import { markedSubSup } from './src/lib/marked/marked-subsup';
import { markedList } from './src/lib/marked/marked-list';
import { markedTable } from './src/lib/marked/marked-table';
import fs from 'node:fs';
import { lex, parseBlocks } from './src/lib/marked';
const readme = fs.readFileSync('./README.md', 'utf8');

const startMark = performance.now();

marked
	.use(markedAlert())
	.use(markedFootnote())
	.use(markedMath())
	.use(markedSubSup())
	.use(markedList())
	.use(markedTable());

const tokens = marked.lexer('- Visit [Google\n- Another item](streamdown:incomplete-link)');
console.dir(tokens, { depth: null });
// console.log(tokens.length);
// const endMark = performance.now();
// console.log(`Time taken: ${endMark - startMark} milliseconds`);

// const startLex = performance.now();
// const tokensLex = lex(readme);
// console.log(tokensLex.length);
// const endLex = performance.now();
// console.log(`Time taken: ${endLex - startLex} milliseconds`);

// const blockStart = performance.now();
// const blocks = parseBlocks(readme);
// console.log(blocks.length);
// const endBlock = performance.now();
// console.log(`Time taken: ${endBlock - blockStart} milliseconds`);

// const firstBLock = blocks[0];

// const startFirstBlock = performance.now();
// const tokensFirstBlock = lex(firstBLock);
// const endFirstBlock = performance.now();
// console.log(`Time taken: ${endFirstBlock - startFirstBlock} milliseconds`);
