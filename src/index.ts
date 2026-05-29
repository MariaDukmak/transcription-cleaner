/**
 * Transcription Cleaner - Multi-Language Voice-to-Text Cleanup
 *
 * PRIMARY FOCUS: Remove repeated words and phrases
 */

import isEqual from 'lodash/isEqual';

/** Supported transcription languages. */
export enum Language {
  EN = 'en',
  NL = 'nl',
  DE = 'de',
  PT = 'pt',
  CS = 'cs',
  PL = 'pl',
  ES = 'es',
}

/** Step-by-step output returned by cleanWithDetails. */
export interface CleanDetails {
  original: string;
  step_1_normalize_whitespace: string;
  step_2_remove_interjections: string;
  step_3_remove_word_repetitions: string;
  step_4_remove_phrase_repetitions: string;
  final: string;
}

class TranscriptionCleaner {
  /** Pure interjections - only filler sounds that add nothing. */
  static readonly FILLER_WORDS: Record<Language, Set<string>> = {
    [Language.EN]: new Set(['um', 'uh', 'ah', 'er', 'hmm', 'hm', 'erm', 'umm', 'uhh']),
    [Language.NL]: new Set(['ehm', 'eh', 'uh', 'um', 'hm', 'hmm', 'erm']),
    [Language.DE]: new Set(['äh', 'ähm', 'ähem', 'uh', 'um', 'hm', 'hmm', 'erm']),
    [Language.PT]: new Set(['é', 'hã', 'ah', 'uh', 'hmm', 'hm', 'erm']),
    [Language.CS]: new Set(['eem', 'ehm', 'hm', 'hmm', 'uh', 'um', 'ah', 'err']),
    [Language.PL]: new Set(['um', 'uh', 'eh', 'hm', 'hmm', 'no', 'ano', 'erm']),
    [Language.ES]: new Set(['um', 'uh', 'eh', 'este', 'hm', 'hmm', 'ah', 'erm']),
  };

  private readonly language: Language;
  private readonly fillerWords: Set<string>;

  constructor(language: Language = Language.EN) {
    if (!Object.values(Language).includes(language)) {
      throw new Error(
        `Unsupported language: ${language}. Use: ${Object.values(Language).join(', ')}`
      );
    }

    this.language = language;
    this.fillerWords = TranscriptionCleaner.FILLER_WORDS[language];
  }

  /** Main cleaning function. */
  clean(rawText: string): string {
    if (!rawText) return '';

    let text = this._normalizeWhitespace(rawText);
    text = this._removePureInterjections(text);
    text = this._removeExactWordRepetitions(text);
    text = this._removePhraseRepetitions(text);
    text = this._addPunctuation(text);

    return text;
  }

  /** Clean with detailed step-by-step output for debugging. */
  cleanWithDetails(rawText: string): CleanDetails {
    const step_1_normalize_whitespace = this._normalizeWhitespace(rawText);
    const step_2_remove_interjections = this._removePureInterjections(step_1_normalize_whitespace);
    const step_3_remove_word_repetitions = this._removeExactWordRepetitions(
      step_2_remove_interjections
    );
    const step_4_remove_phrase_repetitions = this._removePhraseRepetitions(
      step_3_remove_word_repetitions
    );
    const final = this._addPunctuation(step_4_remove_phrase_repetitions);

    return {
      original: rawText,
      step_1_normalize_whitespace,
      step_2_remove_interjections,
      step_3_remove_word_repetitions,
      step_4_remove_phrase_repetitions,
      final,
    };
  }

  /** Collapse multiple spaces and remove spaces before punctuation. */
  private _normalizeWhitespace(text: string): string {
    text = text.replaceAll(/ +/g, ' ');
    text = text.replaceAll(/ +([,.!?;:])/g, '$1');
    return text.trim();
  }

  /** Remove only pure interjection words. */
  private _removePureInterjections(text: string): string {
    const words = text.split(' ');
    const cleanedWords: string[] = [];

    for (const word of words) {
      const wordClean = word.replace(/[,.!?;:]+$/, '').toLowerCase();
      if (!this.fillerWords.has(wordClean)) {
        cleanedWords.push(word);
      }
    }

    return cleanedWords.join(' ');
  }

  /** Remove exact word repetitions (but but → but, i i i → i). */
  private _removeExactWordRepetitions(text: string): string {
    const words = text.split(' ');
    if (words.length < 2) return text;

    const cleanedWords: string[] = [];
    let i = 0;

    while (i < words.length) {
      const currentWord = this._normalizeWord(words[i] ?? '');

      if (i > 0 && currentWord === this._normalizeWord(words[i - 1] ?? '')) {
        i++;
        continue;
      }

      cleanedWords.push(words[i] ?? '');
      i++;
    }

    return cleanedWords.join(' ');
  }

  /** Remove phrase repetitions (we should we should → we should). */
  private _removePhraseRepetitions(text: string): string {
    const words = text.split(' ');
    if (words.length < 4) return text;

    const cleanedWords: string[] = [];
    let i = 0;

    while (i < words.length) {
      let foundRepetition = false;

      for (let phraseLen = Math.min(5, words.length - i); phraseLen > 1; phraseLen--) {
        if (i + phraseLen * 2 <= words.length) {
          const phrase1 = words.slice(i, i + phraseLen).map(w => this._normalizeWord(w));
          const phrase2 = words
            .slice(i + phraseLen, i + phraseLen * 2)
            .map(w => this._normalizeWord(w));

          if (this._arraysEqual(phrase1, phrase2)) {
            cleanedWords.push(...words.slice(i, i + phraseLen));
            i += phraseLen * 2;
            foundRepetition = true;
            break;
          }
        }
      }

      if (!foundRepetition) {
        cleanedWords.push(words[i] ?? '');
        i++;
      }
    }

    return cleanedWords.join(' ');
  }

  /** Normalize a word for comparison (strips punctuation, lowercases). */
  private _normalizeWord(word: string): string {
    return word.replace(/[^\w]/g, '').toLowerCase();
  }

  /** Check whether two string arrays are equal. */
  private _arraysEqual(arr1: string[], arr2: string[]): boolean {
    return isEqual(arr1, arr2);
  }

  /** Add a period at the end if punctuation is missing. */
  private _addPunctuation(text: string): string {
    if (!text) return text;

    text = text.trimEnd();
    const last = text[text.length - 1];
    if (last && !['.', '!', '?', ',', ';', ':'].includes(last)) {
      text += '.';
    }

    return text;
  }
}

export default TranscriptionCleaner;

// CommonJS interop
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranscriptionCleaner;
  module.exports.default = TranscriptionCleaner;
  module.exports.Language = Language;
}
