/**
 * Smoke tests - TranscriptionCleaner (TypeScript)
 *
 * A tiny zero-dependency assertion runner so the whole package is TS and runnable
 * via `ts-node src/test.ts`.
 */

import TranscriptionCleaner, {
  Language,
  levenshtein,
  withinDistance,
  similarity,
} from './index';

let passed = 0;
let failed = 0;

function assertEqual(actual: unknown, expected: unknown, name: string): void {
  if (actual === expected) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        expected: ${JSON.stringify(expected)}`);
    console.log(`        actual:   ${JSON.stringify(actual)}`);
  }
}

function assertTrue(cond: boolean, name: string): void {
  assertEqual(cond, true, name);
}

const en = new TranscriptionCleaner(Language.EN);

console.log('--- core cleaning (exact, default) ---');
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

console.log('--- levenshtein ---');
assertEqual(levenshtein('abc', 'abc'), 0, 'identical');
assertEqual(levenshtein('', ''), 0, 'empty vs empty');
assertEqual(levenshtein('', 'abc'), 3, 'empty vs non-empty');
assertEqual(levenshtein('cat', 'cot'), 1, 'substitution');
assertEqual(levenshtein('cat', 'cats'), 1, 'insertion');
assertEqual(levenshtein('cats', 'cat'), 1, 'deletion');
assertEqual(levenshtein('kitten', 'sitting'), 3, 'kitten/sitting');
assertEqual(levenshtein('mussen', 'müssen'), 1, 'accent (BMP)');
assertEqual(levenshtein('shoud', 'should', 2), 1, 'within threshold returns exact');
assertEqual(levenshtein('cat', 'elephant', 2), 3, 'beyond threshold returns k+1');
assertEqual(levenshtein('a', 'abcdef', 2), 3, 'length prefilter');
assertEqual(levenshtein('preXXXfix', 'preYYYfix', 5), 3, 'prefix/suffix trim');
assertTrue(withinDistance('should', 'shoud', 1), 'withinDistance true');
assertTrue(!withinDistance('cat', 'dog', 1), 'withinDistance false');
assertEqual(similarity('abc', 'abc'), 1, 'similarity identical');
assertTrue(similarity('kitten', 'sitting') > 0 && similarity('kitten', 'sitting') < 1, 'similarity partial');

console.log('--- elongated / extra fillers (on by default) ---');
assertEqual(en.clean('uhhh we should go'), 'we should go.', 'elongated uhhh removed');
assertEqual(en.clean('see the cat'), 'see the cat.', 'real word "see" kept');
assertEqual(en.clean('me too'), 'me too.', 'real word "too" kept');
const nl = new TranscriptionCleaner(Language.NL);
assertEqual(nl.clean('hallo huh hee hallo'), 'hallo.', 'huh+hee removed then deduped');
assertEqual(nl.clean('hallo huh heee hallo'), 'hallo.', 'elongated heee handled');

console.log('--- fuzzy OFF by default ---');
assertEqual(en.clean('should shoud go'), 'should shoud go.', 'near word repeat kept');
assertEqual(en.clean('we should we shoud go'), 'we should we shoud go.', 'near phrase repeat kept');

console.log('--- fuzzy ON ---');
const fz = new TranscriptionCleaner(Language.EN, { fuzzy: true });
assertEqual(fz.clean('should shoud go'), 'should go.', 'near word repeat collapsed');
assertEqual(fz.clean('we should we shoud go'), 'we should go.', 'near phrase repeat collapsed');
assertEqual(fz.clean('we should we should go'), 'we should go.', 'exact still works with fuzzy on');
assertEqual(
  new TranscriptionCleaner(Language.NL, { fuzzy: true }).clean('de je boom'),
  'de je boom.',
  'short words not merged'
);
assertEqual(fz.clean('de kat en de hond'), 'de kat en de hond.', 'legit repeated short word preserved');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);