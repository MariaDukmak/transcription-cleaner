/**
 * Transcription Cleaner - Multi-Language Voice-to-Text Cleanup
 *
 * Pipeline (single split -> process arrays once -> single join):
 *   1. Normalize whitespace / punctuation spacing
 *   2. Remove interjections (fillers), including elongated forms ("uhhh")
 *   3. Collapse repeated words ("but but" -> "but")
 *   4. Collapse repeated phrases ("we should we should" -> "we should")
 *   5. Add end punctuation
 *
 * Optional fuzzy matching (opt-in) also collapses *near*-duplicates that
 * voice-to-text produces, e.g. "we should we shoud go", using edit distance.
 */

import { isEqual } from 'lodash';

/* ------------------------------------------------------------------ *
 * String distance (also exported as a public utility)
 * ------------------------------------------------------------------ */

/**
 * Levenshtein edit distance between `a` and `b`.
 *
 * Optimizations: length prefilter, shared prefix/suffix trimming, single-row
 * DP (O(min(n, m)) memory) and a row-min early exit. When `maxDistance` is
 * given the function may return `maxDistance + 1` to signal "further than the
 * threshold" without computing the exact distance — use it for yes/no checks.
 */
export function levenshtein(a: string, b: string, maxDistance: number = Infinity): number {
  if (a === b) return 0;

  const n = a.length;
  const m = b.length;
  if (n === 0) return m <= maxDistance ? m : maxDistance + 1;
  if (m === 0) return n <= maxDistance ? n : maxDistance + 1;
  if (Math.abs(n - m) > maxDistance) return maxDistance + 1;

  // Trim shared prefix/suffix; only the differing middle needs DP.
  let aStart = 0;
  let bStart = 0;
  let aEnd = n - 1;
  let bEnd = m - 1;
  while (aStart <= aEnd && bStart <= bEnd && a.charCodeAt(aStart) === b.charCodeAt(bStart)) {
    aStart++;
    bStart++;
  }
  while (aEnd >= aStart && bEnd >= bStart && a.charCodeAt(aEnd) === b.charCodeAt(bEnd)) {
    aEnd--;
    bEnd--;
  }

  let lenA = aEnd - aStart + 1;
  let lenB = bEnd - bStart + 1;
  if (lenA === 0) return lenB <= maxDistance ? lenB : maxDistance + 1;
  if (lenB === 0) return lenA <= maxDistance ? lenA : maxDistance + 1;

  // Iterate columns over the shorter region to keep the row buffer small.
  if (lenB > lenA) {
    let s = a; a = b; b = s;
    let t = aStart; aStart = bStart; bStart = t;
    t = aEnd; aEnd = bEnd; bEnd = t;
    t = lenA; lenA = lenB; lenB = t;
  }

  const row: number[] = new Array(lenB + 1);
  for (let j = 0; j <= lenB; j++) row[j] = j;

  for (let i = 1; i <= lenA; i++) {
    let prevDiag = row[0] as number; // (i-1, 0)
    row[0] = i; // (i, 0)
    const aChar = a.charCodeAt(aStart + i - 1);
    let rowMin = i;

    for (let j = 1; j <= lenB; j++) {
      const bChar = b.charCodeAt(bStart + j - 1);
      const cost = aChar === bChar ? 0 : 1;
      const sub = prevDiag + cost; // (i-1, j-1)
      const del = (row[j] as number) + 1; // (i-1, j)
      const ins = (row[j - 1] as number) + 1; // (i, j-1)
      prevDiag = row[j] as number; // becomes (i-1, j) for the next column

      let v = sub < del ? sub : del;
      if (ins < v) v = ins;
      row[j] = v;
      if (v < rowMin) rowMin = v;
    }

    if (rowMin > maxDistance) return maxDistance + 1;
  }

  const d = row[lenB] as number;
  return d <= maxDistance ? d : maxDistance + 1;
}

/** `true` if the edit distance between `a` and `b` is at most `k`. */
export function withinDistance(a: string, b: string, k: number): boolean {
  return levenshtein(a, b, k) <= k;
}

/** Normalized similarity in [0, 1]: 1 = identical, 0 = maximally different. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/* ------------------------------------------------------------------ *
 * Cleaner
 * ------------------------------------------------------------------ */

export enum Language {
  EN = 'en',
  NL = 'nl',
  DE = 'de',
  PT = 'pt',
  CS = 'cs',
  PL = 'pl',
  ES = 'es',
  FR = "fr"
}

/**
 * One fuzzy merge event: the `kept` token/phrase was retained and the
 * `dropped` near-duplicate was discarded. `distance` is the sum of
 * per-token edit distances (0 for an exact match that went through the
 * fuzzy path, ≥1 for a genuine fuzzy collapse).
 *
 * `kind` distinguishes single-word collapses (`"word"`) from multi-token
 * phrase collapses (`"phrase"`).
 */
export interface FuzzyMerge {
  kind: 'word' | 'phrase';
  kept: string;
  dropped: string;
  distance: number;
}

export interface CleanDetails {
  original: string;
  step_1_normalize_whitespace: string;
  step_2_remove_interjections: string;
  step_3_remove_word_repetitions: string;
  step_4_remove_phrase_repetitions: string;
  /**
   * Every merge that was triggered by fuzzy (or exact) matching during
   * steps 3 and 4. Empty when `fuzzy` is `false` and no exact repeats
   * were found; populated whenever a word or phrase was collapsed.
   *
   * Only present on the object returned by `cleanWithDetails` — `clean`
   * does not compute it.
   */
  fuzzyMerges: FuzzyMerge[];
  final: string;
}

export interface CleanerOptions {
  /** Collapse near-duplicate words/phrases via edit distance. Default false. */
  fuzzy?: boolean;
  /** Max edit distance for two words to count as the same. Default 1. */
  maxWordDistance?: number;
  /** Min word length before fuzzy matching applies (guards short words). Default 4. */
  minFuzzyLength?: number;
  /** Max token mismatches tolerated within a fuzzy phrase repetition. Default 1. */
  maxPhraseTokenMismatches?: number;
}

const FILLER_WORDS: Record<Language, Set<string>> = {
  [Language.EN]: new Set(['um', 'uh', 'ah', 'er', 'hmm', 'hm', 'erm', 'umm', 'uhh', 'huh']),
  [Language.NL]: new Set(['ehm', 'eh', 'uh', 'um', 'hm', 'hmm', 'erm', 'huh', 'hè', 'hé', 'hee']),
  [Language.DE]: new Set(['äh', 'ähm', 'ähem', 'uh', 'um', 'hm', 'hmm', 'erm']),
  [Language.PT]: new Set(['é', 'hã', 'ah', 'uh', 'hmm', 'hm', 'erm']),
  [Language.CS]: new Set(['eem', 'ehm', 'hm', 'hmm', 'uh', 'um', 'ah', 'err']),
  [Language.PL]: new Set(['um', 'uh', 'eh', 'hm', 'hmm', 'no', 'ano', 'erm']),
  [Language.ES]: new Set(['um', 'uh', 'eh', 'este', 'hm', 'hmm', 'ah', 'erm']),
  [Language.FR]: new Set(['euh', 'bah', 'ben', 'bon', 'voilà', 'quoi', 'hein', 'hm', 'hmm', 'ah', 'eh']),
};

// Hoisted once (avoids rebuilding arrays/regexes per call).
const LANGUAGES: readonly Language[] = Object.values(Language);
/** Strip everything that isn't a Unicode letter or number (accent-safe). */
const NON_WORD = /[^\p{L}\p{N}]/gu;
const TRAILING_PUNCT = /[,.!?;:]+$/;
const PUNCT_SPACING = / +([,.!?;:])/g;
const SENTENCE_TERMINATORS = new Set(['.', '!', '?', ',', ';', ':']);

/** Collapse runs of the same character: "uhhh" -> "uh", "heee" -> "he". */
const collapseRepeats = (s: string): string => {
  let out = '';
  let prev = '';
  for (const ch of s) {
    if (ch !== prev) {
      out += ch;
      prev = ch;
    }
  }
  return out;
};

export class TranscriptionCleaner {
  private readonly fillerWords: Set<string>;
  private readonly collapsedFillers: Set<string>;
  private readonly fuzzy: boolean;
  private readonly maxWordDistance: number;
  private readonly minFuzzyLength: number;
  private readonly maxPhraseTokenMismatches: number;

  constructor(language: Language = Language.EN, options: CleanerOptions = {}) {
    if (!LANGUAGES.includes(language)) {
      throw new Error(
        `Unsupported language: ${language}. Use: ${LANGUAGES.join(', ')}`
      );
    }

    this.fillerWords = FILLER_WORDS[language];
    // Pre-collapse the filler set once so elongated forms match in O(1).
    this.collapsedFillers = new Set([...this.fillerWords].map(collapseRepeats));

    this.fuzzy = options.fuzzy ?? true;
    this.maxWordDistance = options.maxWordDistance ?? 1;
    this.minFuzzyLength = options.minFuzzyLength ?? 4;
    this.maxPhraseTokenMismatches = options.maxPhraseTokenMismatches ?? 1;
  }

  private normalizeWord(word: string): string {
    return word.replace(NON_WORD, '').toLowerCase();
  }

  private isFiller(word: string): boolean {
    const wordClean = word.replace(TRAILING_PUNCT, '').toLowerCase();
    if (this.fillerWords.has(wordClean)) return true;
    // Elongated filler ("uhhh"): only when collapsing actually changed the
    // token, so real words are never matched against a collapsed filler.
    const collapsed = collapseRepeats(wordClean);
    return collapsed !== wordClean && this.collapsedFillers.has(collapsed);
  }

  /** Two normalized words count as "the same" word. */
  private wordEq(x: string, y: string): boolean {
    if (x === y) return true;
    if (!this.fuzzy) return false;
    if (x.length < this.minFuzzyLength || y.length < this.minFuzzyLength) return false;
    return withinDistance(x, y, this.maxWordDistance);
  }

  /**
   * Same semantics as `wordEq`, but also returns the exact edit distance.
   * Returns `{ eq: false, distance: -1 }` when the words are considered different.
   */
  private wordEqDist(x: string, y: string): { eq: boolean; distance: number } {
    if (x === y) return { eq: true, distance: 0 };
    if (!this.fuzzy) return { eq: false, distance: -1 };
    if (x.length < this.minFuzzyLength || y.length < this.minFuzzyLength) return { eq: false, distance: -1 };
    const d = levenshtein(x, y, this.maxWordDistance);
    return d <= this.maxWordDistance ? { eq: true, distance: d } : { eq: false, distance: -1 };
  }

  /** Two normalized token slices count as the same phrase. */
  private phraseEq(p1: string[], p2: string[]): boolean {
    if (isEqual(p1, p2)) return true; // exact fast path keeps lodash.isEqual
    if (!this.fuzzy) return false;
    if (p1.length !== p2.length) return false;

    let mismatches = 0;
    for (let t = 0; t < p1.length; t++) {
      if (!this.wordEq(p1[t] as string, p2[t] as string)) {
        mismatches++;
        if (mismatches > this.maxPhraseTokenMismatches) return false;
      }
    }
    return true;
  }

  /** Collapse adjacent repeated words. Returns kept words + their normals. */
  private dedupeWords(
    words: string[],
    norm: string[],
    merges?: FuzzyMerge[],
  ): { words: string[]; norm: string[] } {
    const outWords: string[] = [];
    const outNorm: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const cur = norm[i] as string;
      const prev = i > 0 ? (norm[i - 1] as string) : '';
      if (i === 0) {
        outWords.push(words[i] as string);
        outNorm.push(cur);
      } else {
        const { eq, distance } = this.wordEqDist(cur, prev);
        if (!eq) {
          outWords.push(words[i] as string);
          outNorm.push(cur);
        } else if (merges) {
          merges.push({
            kind: 'word',
            kept: outWords[outWords.length - 1] as string,
            dropped: words[i] as string,
            distance,
          });
        }
      }
    }
    return { words: outWords, norm: outNorm };
  }

  /** Collapse adjacent repeated phrases (length 2..5), longest first. */
  private dedupePhrases(
    words: string[],
    norm: string[],
    merges?: FuzzyMerge[],
  ): string[] {
    const result: string[] = [];
    let i = 0;
    while (i < words.length) {
      let foundRep = false;
      for (let len = Math.min(5, words.length - i); len > 1; len--) {
        if (i + len * 2 <= words.length) {
          const p1 = norm.slice(i, i + len);
          const p2 = norm.slice(i + len, i + len * 2);
          if (this.phraseEq(p1, p2)) {
            const keptTokens = words.slice(i, i + len);
            const droppedTokens = words.slice(i + len, i + len * 2);
            for (let j = i; j < i + len; j++) result.push(words[j] as string);
            if (merges) {
              // Sum per-token distances for a meaningful "how fuzzy was this" number.
              let totalDist = 0;
              for (let t = 0; t < len; t++) {
                totalDist += levenshtein(p1[t] as string, p2[t] as string);
              }
              merges.push({
                kind: 'phrase',
                kept: keptTokens.join(' '),
                dropped: droppedTokens.join(' '),
                distance: totalDist,
              });
            }
            i += len * 2;
            foundRep = true;
            break;
          }
        }
      }
      if (!foundRep) {
        result.push(words[i] as string);
        i++;
      }
    }
    return result;
  }

  private addPunctuation(text: string): string {
    if (!text) return text;
    text = text.trimEnd();
    const last = text[text.length - 1];
    if (last && !SENTENCE_TERMINATORS.has(last)) {
      text += '.';
    }
    return text;
  }

  /**
   * Shared pipeline. Runs the full clean once and returns every intermediate
   * stage as a word array, so `clean` and `cleanWithDetails` can never drift.
   * OPTIMIZED: 1 split -> process arrays once -> 1 join, each token normalized once.
   *
   * When `collectMerges` is true a `FuzzyMerge[]` is populated and returned;
   * pass false (the default) for the hot path in `clean()` to avoid allocation.
   */
  private run(rawText: string, collectMerges?: false): {
    step1: string[];
    step2: string[];
    step3: string[];
    step4: string[];
    final: string;
    merges: undefined;
  };
  private run(rawText: string, collectMerges: true): {
    step1: string[];
    step2: string[];
    step3: string[];
    step4: string[];
    final: string;
    merges: FuzzyMerge[];
  };
  private run(rawText: string, collectMerges?: boolean): {
    step1: string[];
    step2: string[];
    step3: string[];
    step4: string[];
    final: string;
    merges: FuzzyMerge[] | undefined;
  } {
    const merges: FuzzyMerge[] | undefined = collectMerges ? [] : undefined;
    const normalized = rawText.replace(PUNCT_SPACING, '$1').trim();
    const step1 = normalized.split(' ').filter(Boolean); // whitespace normalized
    const step2 = step1.filter((w) => !this.isFiller(w)); // interjections removed
    const norm = step2.map((w) => this.normalizeWord(w));
    const deduped = this.dedupeWords(step2, norm, merges); // word repetitions removed
    const step4 = this.dedupePhrases(deduped.words, deduped.norm, merges); // phrases removed
    const final = this.addPunctuation(step4.join(' '));
    return { step1, step2, step3: deduped.words, step4, final, merges };
  }

  /** Returns the cleaned transcription. */
  clean(rawText: string): string {
    return this.run(rawText).final;
  }

  /** Debug version with step-by-step output (same pipeline as `clean`). */
  cleanWithDetails(rawText: string): CleanDetails {
    const r = this.run(rawText, true);
    return {
      original: rawText,
      step_1_normalize_whitespace: r.step1.join(' '),
      step_2_remove_interjections: r.step2.join(' '),
      step_3_remove_word_repetitions: r.step3.join(' '),
      step_4_remove_phrase_repetitions: r.step4.join(' '),
      fuzzyMerges: r.merges,
      final: r.final,
    };
  }
}

export default TranscriptionCleaner;