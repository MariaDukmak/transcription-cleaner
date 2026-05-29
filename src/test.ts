/**
 * Smoke tests - TranscriptionCleaner (TypeScript)
 *
 * A tiny zero-dependency assertion runner so the whole package is TS and runnable
 * via `ts-node src/test.ts`.
 */

import TranscriptionCleaner, { Language } from './index';

let passed = 0;
let failed = 0;

function assertEqual(actual: string, expected: string, name: string): void {
  if (actual === expected) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        expected: "${expected}"`);
    console.log(`        actual:   "${actual}"`);
  }
}

const en = new TranscriptionCleaner(Language.EN);

assertEqual(en.clean('but but i think'), 'but i think.', 'exact word repetition');
assertEqual(en.clean('we should we should go'), 'we should go.', 'phrase repetition');
assertEqual(en.clean('um we should go'), 'we should go.', 'interjection removal');
assertEqual(en.clean('we   should    go'), 'we should go.', 'whitespace normalization');
assertEqual(en.clean('hello'), 'hello.', 'punctuation added');
assertEqual(en.clean('hello.'), 'hello.', 'punctuation not duplicated');
assertEqual(en.clean(''), '', 'empty input');

try {
  // @ts-expect-error - invalid language should be rejected at runtime
  new TranscriptionCleaner('xx');
  failed++;
  console.log('  FAIL  invalid language throws');
} catch {
  passed++;
  console.log('  PASS  invalid language throws');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);