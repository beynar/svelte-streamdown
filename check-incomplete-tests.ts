// Script to check all incomplete markdown tests and identify failing ones

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const testFiles = [
  'alert.test.ts',
  'blockquote.test.ts', 
  'br.test.ts',
  'code.test.ts',
  'codespan.test.ts',
  'del.test.ts',
  'em.test.ts',
  'footnoteRef.test.ts',
  'heading.test.ts',
  'hr.test.ts',
  'image.test.ts',
  'li.test.ts',
  'link.test.ts',
  'mermaid.test.ts',
  'ol.test.ts',
  'paragraph.test.ts',
  'strong.test.ts',
  'sub.test.ts',
  'sup.test.ts',
  'table.test.ts',
  'ul.test.ts'
];

async function checkIncompleteTests() {
  console.log('🔍 Checking incomplete markdown tests across all files...\n');
  
  const failingFiles = [];
  
  for (const file of testFiles) {
    try {
      console.log(`Testing ${file}...`);
      const { stdout } = await execAsync(`npm test -- src/tests/${file} -t "incomplete markdown" --reporter=basic`, {
        cwd: process.cwd()
      });
      
      if (stdout.includes('✓')) {
        console.log(`✅ ${file} - All tests passing`);
      }
    } catch (error) {
      console.log(`❌ ${file} - Has failing tests`);
      failingFiles.push(file);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`✅ Passing: ${testFiles.length - failingFiles.length}`);
  console.log(`❌ Failing: ${failingFiles.length}`);
  
  if (failingFiles.length > 0) {
    console.log(`\n🔧 Files needing fixes:`);
    failingFiles.forEach(file => console.log(`  - ${file}`));
  }
}

checkIncompleteTests().catch(console.error);
