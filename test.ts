import { marked } from 'marked';
import { markedTable } from './src/lib/marked/marked-table.js';
const md = `
| H1      | H2      | H3      |
|---------|---------|---------|
| This cell spans 3 columns |||
`;

const html = marked.use(markedTable()).lexer(md);

console.dir(html, { depth: null });
