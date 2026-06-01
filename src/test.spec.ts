import TranscriptionCleaner, {
  Language,
  levenshtein,
  withinDistance,
  similarity,
} from './index';

const en = new TranscriptionCleaner(Language.EN);

describe('core cleaning', () => {
  test('exact word repetition', () => expect(en.clean('but but i think')).toBe('but i think.'));
  test('phrase repetition', () => expect(en.clean('we should we should go')).toBe('we should go.'));
  test('interjection removal', () => expect(en.clean('um we should go')).toBe('we should go.'));
  test('whitespace normalization', () => expect(en.clean('we   should    go')).toBe('we should go.'));
  test('punctuation added', () => expect(en.clean('hello')).toBe('hello.'));
  test('punctuation not duplicated', () => expect(en.clean('hello.')).toBe('hello.'));
  test('empty input', () => expect(en.clean('')).toBe(''));
  test('invalid language throws', () => {
    // @ts-expect-error
    expect(() => new TranscriptionCleaner('xx')).toThrow();
  });
});

describe('levenshtein', () => {
  test('identical', () => expect(levenshtein('abc', 'abc')).toBe(0));
  test('empty vs empty', () => expect(levenshtein('', '')).toBe(0));
  test('empty vs non-empty', () => expect(levenshtein('', 'abc')).toBe(3));
  test('substitution', () => expect(levenshtein('cat', 'cot')).toBe(1));
  test('insertion', () => expect(levenshtein('cat', 'cats')).toBe(1));
  test('deletion', () => expect(levenshtein('cats', 'cat')).toBe(1));
  test('kitten/sitting', () => expect(levenshtein('kitten', 'sitting')).toBe(3));
  test('accent (BMP)', () => expect(levenshtein('mussen', 'müssen')).toBe(1));
  test('within threshold returns exact', () => expect(levenshtein('shoud', 'should', 2)).toBe(1));
  test('beyond threshold returns k+1', () => expect(levenshtein('cat', 'elephant', 2)).toBe(3));
  test('length prefilter', () => expect(levenshtein('a', 'abcdef', 2)).toBe(3));
  test('prefix/suffix trim', () => expect(levenshtein('preXXXfix', 'preYYYfix', 5)).toBe(3));
  test('withinDistance true', () => expect(withinDistance('should', 'shoud', 1)).toBe(true));
  test('withinDistance false', () => expect(withinDistance('cat', 'dog', 1)).toBe(false));
  test('similarity identical', () => expect(similarity('abc', 'abc')).toBe(1));
  test('similarity partial', () => {
    const s = similarity('kitten', 'sitting');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
});

describe('elongated fillers', () => {
  test('elongated uhhh removed', () => expect(en.clean('uhhh we should go')).toBe('we should go.'));
  test('real word "see" kept', () => expect(en.clean('see the cat')).toBe('see the cat.'));
  test('real word "too" kept', () => expect(en.clean('me too')).toBe('me too.'));

  const nl = new TranscriptionCleaner(Language.NL);
  test('huh+hee removed then deduped', () => expect(nl.clean('hallo huh hee hallo')).toBe('hallo.'));
  test('elongated heee handled', () => expect(nl.clean('hallo huh heee hallo')).toBe('hallo.'));
});

describe('fuzzy ON by default', () => {
  test('near word repeat collapsed', () => expect(en.clean('should shoud go')).toBe('should go.'));
  test('near phrase repeat collapsed', () => expect(en.clean('we should we shoud go')).toBe('we should go.'));
  test('exact still works', () => expect(en.clean('we should we should go')).toBe('we should go.'));
  test('legit repeated short word preserved', () => expect(en.clean('de kat en de hond')).toBe('de kat en de hond.'));
});

describe('fuzzy OFF', () => {
  const noFuzz = new TranscriptionCleaner(Language.EN, { fuzzy: false });
  test('near word repeat kept', () => expect(noFuzz.clean('should shoud go')).toBe('should shoud go.'));
  test('near phrase repeat kept', () => expect(noFuzz.clean('we should we shoud go')).toBe('we should we shoud go.'));

  const nl = new TranscriptionCleaner(Language.NL, { fuzzy: false });
  test('short words not merged', () => expect(nl.clean('de je boom')).toBe('de je boom.'));
});