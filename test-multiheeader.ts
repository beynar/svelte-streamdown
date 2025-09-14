import { lex } from './src/lib/marked/index.js';

console.log('Testing multi header text functionality...');
const md = `
#### Column alignment

| Left | Center | Right |
| :--- | :----: | ----: |
| A    |   B    |     C |

#### Everything 


| Product Category ||| Sales Data Q1-Q4 2024 ||||
| Product | Region || Q1 | Q2 | Q3 | Q4 |
| Name | Type | Area | Revenue | Revenue | Revenue | Revenue |
|-------------|---------|------------|---------|---------|---------|---------|
| Laptop Pro | Electronics | North America || $45,000 | $52,000 | $48,000 |
| Laptop Pro | Electronics | North America || $45,000 | $52,000 | $48,000 |
| Laptop Pro | Electronics | North America || $45,000 | $52,000 | $48,000 |
| Laptop Pro | Electronics | North America || $45,000 | $52,000 | $48,000 |
`;
console.dir(lex(md), { depth: null });
