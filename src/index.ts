/**
 * Transcription Cleaner - Multi-Language Voice-to-Text Cleanup
 * 
 * FULLY OPTIMIZED:
 * - Single split() at start
 * - Process entire array once
 * - Single join() at end
 * - No intermediate string conversions
 */

import { isEqual } from 'lodash';

export enum Language {
  EN = 'en',
  NL = 'nl',
  DE = 'de',
  PT = 'pt',
  CS = 'cs',
  PL = 'pl',
  ES = 'es',
}

export interface CleanDetails {
  original: string;
  step_1_normalize_whitespace: string;
  step_2_remove_interjections: string;
  step_3_remove_word_repetitions: string;
  step_4_remove_phrase_repetitions: string;
  final: string;
}

const FILLER_WORDS: Record<Language, Set<string>> = {
  [Language.EN]: new Set(['um', 'uh', 'ah', 'er', 'hmm', 'hm', 'erm', 'umm', 'uhh']),
  [Language.NL]: new Set(['ehm', 'eh', 'uh', 'um', 'hm', 'hmm', 'erm']),
  [Language.DE]: new Set(['äh', 'ähm', 'ähem', 'uh', 'um', 'hm', 'hmm', 'erm']),
  [Language.PT]: new Set(['é', 'hã', 'ah', 'uh', 'hmm', 'hm', 'erm']),
  [Language.CS]: new Set(['eem', 'ehm', 'hm', 'hmm', 'uh', 'um', 'ah', 'err']),
  [Language.PL]: new Set(['um', 'uh', 'eh', 'hm', 'hmm', 'no', 'ano', 'erm']),
  [Language.ES]: new Set(['um', 'uh', 'eh', 'este', 'hm', 'hmm', 'ah', 'erm']),
};

const createCleaner = (language: Language = Language.EN) => {
  if (!Object.values(Language).includes(language)) {
    throw new Error(
      `Unsupported language: ${language}. Use: ${Object.values(Language).join(', ')}`
    );
  }

  const fillerWords = FILLER_WORDS[language];

  const normalizeWord = (word: string): string => {
    return word.replace(/[^\w]/g, '').toLowerCase();
  };

  const isFiller = (word: string): boolean => {
    const wordClean = word.replace(/[,.!?;:]+$/, '').toLowerCase();
    return fillerWords.has(wordClean);
  };

  /** OPTIMIZED: Single pass through array. */
  const processArray = (words: string[]): string[] => {
    // Step 1: Remove empty strings + interjections
    let arr = words.filter(Boolean).filter(w => !isFiller(w));

    // Step 2: Remove word repetitions
    const noWordReps: string[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (i === 0 || normalizeWord(arr[i]) !== normalizeWord(arr[i - 1])) {
        noWordReps.push(arr[i]);
      }
    }

    // Step 3: Remove phrase repetitions
    const result: string[] = [];
    let i = 0;
    while (i < noWordReps.length) {
      let foundRep = false;
      for (let len = Math.min(5, noWordReps.length - i); len > 1; len--) {
        if (i + len * 2 <= noWordReps.length) {
          const p1 = noWordReps.slice(i, i + len).map(normalizeWord);
          const p2 = noWordReps.slice(i + len, i + len * 2).map(normalizeWord);
          if (isEqual(p1, p2)) {
            result.push(...noWordReps.slice(i, i + len));
            i += len * 2;
            foundRep = true;
            break;
          }
        }
      }
      if (!foundRep) {
        result.push(noWordReps[i]);
        i++;
      }
    }
    return result;
  };

  const addPunctuation = (text: string): string => {
    if (!text) return text;
    text = text.trimEnd();
    const last = text[text.length - 1];
    if (last && !['.', '!', '?', ',', ';', ':'].includes(last)) {
      text += '.';
    }
    return text;
  };

  /**
   * Main clean function.
   * OPTIMIZED: 1 split → process → 1 join
   */
  const clean = (rawText: string): string => {
    if (!rawText) return '';

    // Normalize punctuation spacing
    let normalized = rawText.replace(/ +([,.!?;:])/g, '$1').trim();

    // Single split, process, join
    const words = normalized.split(' ');
    const cleaned = processArray(words);
    const result = cleaned.join(' ');

    return addPunctuation(result);
  };

  /**
   * Debug version with step-by-step output.
   */
  const cleanWithDetails = (rawText: string): CleanDetails => {
    if (!rawText) {
      return {
        original: rawText,
        step_1_normalize_whitespace: '',
        step_2_remove_interjections: '',
        step_3_remove_word_repetitions: '',
        step_4_remove_phrase_repetitions: '',
        final: '',
      };
    }

    // Step 1: Normalize whitespace
    let normalized = rawText.replace(/ +([,.!?;:])/g, '$1').trim();
    const step_1 = normalized.split(' ').filter(Boolean).join(' ');

    // Split once
    const words = step_1.split(' ');

    // Step 2: Remove interjections
    const afterInterjections = words.filter(w => !isFiller(w));
    const step_2 = afterInterjections.join(' ');

    // Step 3: Remove word repetitions
    const afterWordReps: string[] = [];
    for (let i = 0; i < afterInterjections.length; i++) {
      if (i === 0 || normalizeWord(afterInterjections[i]) !== normalizeWord(afterInterjections[i - 1])) {
        afterWordReps.push(afterInterjections[i]);
      }
    }
    const step_3 = afterWordReps.join(' ');

    // Step 4: Remove phrase repetitions
    const afterPhraseReps: string[] = [];
    let i = 0;
    while (i < afterWordReps.length) {
      let foundRep = false;
      for (let len = Math.min(5, afterWordReps.length - i); len > 1; len--) {
        if (i + len * 2 <= afterWordReps.length) {
          const p1 = afterWordReps.slice(i, i + len).map(normalizeWord);
          const p2 = afterWordReps.slice(i + len, i + len * 2).map(normalizeWord);
          if (isEqual(p1, p2)) {
            afterPhraseReps.push(...afterWordReps.slice(i, i + len));
            i += len * 2;
            foundRep = true;
            break;
          }
        }
      }
      if (!foundRep) {
        afterPhraseReps.push(afterWordReps[i]);
        i++;
      }
    }
    const step_4 = afterPhraseReps.join(' ');

    // Final: Add punctuation
    const final = addPunctuation(step_4);

    return {
      original: rawText,
      step_1_normalize_whitespace: step_1,
      step_2_remove_interjections: step_2,
      step_3_remove_word_repetitions: step_3,
      step_4_remove_phrase_repetitions: step_4,
      final,
    };
  };

  return { clean, cleanWithDetails };
};

export const TranscriptionCleaner = (language: Language = Language.EN) => {
  return createCleaner(language);
};

export default TranscriptionCleaner;