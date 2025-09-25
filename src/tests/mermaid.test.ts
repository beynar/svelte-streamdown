import { expect, describe, test } from 'vitest';
import { lex } from '../lib/marked/index.js';
import { parseIncompleteMarkdown } from '../lib/utils/parse-incomplete-markdown.js';

// Helper functions
function getTokensByType(tokens: any[], type: string) {
	return tokens.filter((token) => token.type === type);
}

function getFirstTokenByType(tokens: any[], type: string) {
	return tokens.find((token) => token.type === type);
}

describe('tokenization', () => {
	test('should parse mermaid flowchart', () => {
		const tokens = lex('```mermaid\nflowchart TD\n    A --> B\n    B --> C\n```');
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('flowchart TD');
		expect(codeToken.text).toContain('A --> B');
		expect(codeToken.text).toContain('B --> C');
	});

	test('should parse mermaid sequence diagram', () => {
		const tokens = lex(
			'```mermaid\nsequenceDiagram\n    Alice->>Bob: Hello Bob\n    Bob-->>Alice: Hello Alice\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('sequenceDiagram');
		expect(codeToken.text).toContain('Alice->>Bob: Hello Bob');
		expect(codeToken.text).toContain('Bob-->>Alice: Hello Alice');
	});

	test('should parse mermaid class diagram', () => {
		const tokens = lex(
			'```mermaid\nclassDiagram\n    class Animal {\n        +name: string\n        +makeSound()\n    }\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('classDiagram');
		expect(codeToken.text).toContain('class Animal');
		expect(codeToken.text).toContain('+name: string');
		expect(codeToken.text).toContain('+makeSound()');
	});

	test('should parse mermaid state diagram', () => {
		const tokens = lex(
			'```mermaid\nstateDiagram-v2\n    [*] --> Still\n    Still --> Moving\n    Moving --> Still\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('stateDiagram-v2');
		expect(codeToken.text).toContain('[*] --> Still');
		expect(codeToken.text).toContain('Still --> Moving');
	});

	test('should parse mermaid entity relationship diagram', () => {
		const tokens = lex(
			'```mermaid\nerDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('erDiagram');
		expect(codeToken.text).toContain('CUSTOMER ||--o{ ORDER : places');
		expect(codeToken.text).toContain('ORDER ||--|{ LINE-ITEM : contains');
	});

	test('should parse mermaid user journey', () => {
		const tokens = lex(
			'```mermaid\njourney\n    title My working day\n    section Go to work\n      Make tea: 5: Me\n      Go upstairs: 3: Me\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('journey');
		expect(codeToken.text).toContain('title My working day');
		expect(codeToken.text).toContain('Make tea: 5: Me');
	});

	test('should parse mermaid gantt chart', () => {
		const tokens = lex(
			'```mermaid\ngantt\n    title A Gantt Diagram\n    dateFormat  YYYY-MM-DD\n    section Section\n    A task           :a1, 2014-01-01, 30d\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('gantt');
		expect(codeToken.text).toContain('title A Gantt Diagram');
		expect(codeToken.text).toContain('A task           :a1, 2014-01-01, 30d');
	});

	test('should parse mermaid pie chart', () => {
		const tokens = lex(
			'```mermaid\npie title Pets adopted by volunteers\n    "Dogs" : 386\n    "Cats" : 85\n    "Rats" : 15\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('pie title Pets adopted by volunteers');
		expect(codeToken.text).toContain('"Dogs" : 386');
		expect(codeToken.text).toContain('"Cats" : 85');
	});

	test('should parse mermaid git graph', () => {
		const tokens = lex(
			'```mermaid\ngitgraph\n    commit\n    branch develop\n    checkout develop\n    commit\n    checkout main\n    merge develop\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('gitgraph');
		expect(codeToken.text).toContain('branch develop');
		expect(codeToken.text).toContain('merge develop');
	});

	test('should parse mermaid with math expressions', () => {
		const tokens = lex(
			'```mermaid\nflowchart TD\n    A["Formula: $E = mc^2$"] --> B["Equation: $a^2 + b^2 = c^2$"]\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('Formula: $E = mc^2$');
		expect(codeToken.text).toContain('Equation: $a^2 + b^2 = c^2$');
	});

	test('should parse mermaid with special characters', () => {
		const tokens = lex(
			'```mermaid\nflowchart TD\n    A["Step 1: Initialize & Setup"] --> B["Step 2: Process @ Runtime"]\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('Step 1: Initialize & Setup');
		expect(codeToken.text).toContain('Step 2: Process @ Runtime');
	});

	test('should parse mermaid with styling', () => {
		const tokens = lex(
			'```mermaid\nflowchart TD\n    A --> B\n    B --> C\n    style A fill:#f9f,stroke:#333,stroke-width:4px\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('style A fill:#f9f,stroke:#333,stroke-width:4px');
	});

	test('should parse mermaid with subgraphs', () => {
		const tokens = lex(
			'```mermaid\nflowchart TD\n    subgraph "Subgraph 1"\n        A --> B\n    end\n    subgraph "Subgraph 2"\n        C --> D\n    end\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('subgraph "Subgraph 1"');
		expect(codeToken.text).toContain('subgraph "Subgraph 2"');
	});

	test('should parse mermaid with links and clicks', () => {
		const tokens = lex(
			'```mermaid\nflowchart TD\n    A --> B\n    click A "https://example.com" "Link to example"\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('click A "https://example.com" "Link to example"');
	});

	test('should parse mermaid mindmap', () => {
		const tokens = lex(
			'```mermaid\nmindmap\n  root((mindmap))\n    Origins\n      Long history\n      ::icon(fa fa-book)\n    Research\n      On effectiveness<br/>and features\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('mindmap');
		expect(codeToken.text).toContain('root((mindmap))');
		expect(codeToken.text).toContain('Long history');
	});

	test('should parse mermaid timeline', () => {
		const tokens = lex(
			'```mermaid\ntimeline\n    title History of Social Media Platform\n    2002 : LinkedIn\n    2004 : Facebook\n    2005 : Youtube\n    2006 : Twitter\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('timeline');
		expect(codeToken.text).toContain('History of Social Media Platform');
		expect(codeToken.text).toContain('2002 : LinkedIn');
	});

	test('should parse complex mermaid flowchart with multiple elements', () => {
		const tokens = lex(
			'```mermaid\nflowchart TD\n    Start([Start]) --> Input[/Input Data/]\n    Input --> Process{Process?}\n    Process -->|Yes| Output[Output Result]\n    Process -->|No| Error[Error Handler]\n    Output --> End([End])\n    Error --> End\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('Start([Start])');
		expect(codeToken.text).toContain('Input[/Input Data/]');
		expect(codeToken.text).toContain('Process{Process?}');
		expect(codeToken.text).toContain('Process -->|Yes| Output');
	});

	test('should handle empty mermaid block', () => {
		const tokens = lex('```mermaid\n\n```');
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
	});

	test('should parse mermaid with comments', () => {
		const tokens = lex(
			'```mermaid\nflowchart TD\n    %% This is a comment\n    A --> B\n    %% Another comment\n    B --> C\n```'
		);
		const codeToken = getFirstTokenByType(tokens, 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('mermaid');
		expect(codeToken.text).toContain('%% This is a comment');
		expect(codeToken.text).toContain('%% Another comment');
	});
});

describe('incomplete markdown', () => {
	test('should leave incomplete mermaid code blocks unchanged', () => {
		const input = '```mermaid\nflowchart TD\n    A --> B';
		const result = parseIncompleteMarkdown(input);

		// Should remain unchanged as it's an incomplete code block
		expect(result).toBe('```mermaid\nflowchart TD\n    A --> B\n```');
	});

	test('should handle formatting outside incomplete mermaid blocks', () => {
		const input = 'Text with **incomplete\n\n```mermaid\nflowchart TD\n    A --> B';
		const result = parseIncompleteMarkdown(input);

		// Should complete the bold formatting outside mermaid block
		expect(result).toBe('Text with **incomplete**\n\n```mermaid\nflowchart TD\n    A --> B\n```');
	});

	test('should not process formatting inside incomplete mermaid blocks', () => {
		const input = '```mermaid\nflowchart TD\n    A["**Bold Text**"] --> B';
		const result = parseIncompleteMarkdown(input);

		// Should not process markdown formatting inside mermaid code
		expect(result).toBe('```mermaid\nflowchart TD\n    A["**Bold Text**"] --> B\n```');
	});

	test('should handle different mermaid diagram types', () => {
		const input =
			'```mermaid\nclassDiagram\n    class Animal {\n        +name: string\n        +makeSound()\n    }';
		const result = parseIncompleteMarkdown(input);

		// Should remain unchanged as incomplete code block regardless of diagram type
		expect(result).toBe(
			'```mermaid\nclassDiagram\n    class Animal {\n        +name: string\n        +makeSound()\n    }\n```'
		);
	});
});
