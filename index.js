/**
 * Transcription Cleaner - Multi-Language Voice-to-Text Cleanup
 * 
 * PRIMARY FOCUS: Remove repeated words and phrases
 * 
 * Supported Languages:
 * - EN: English
 * - NL: Dutch
 * - DE: German
 * - PT: Portuguese
 * - CS: Czech
 * - PL: Polish
 * - ES: Spanish
 */

class TranscriptionCleaner {
  // Pure interjections - only filler sounds that add nothing
  static FILLER_WORDS = {
    'en': new Set(['um', 'uh', 'ah', 'er', 'hmm', 'hm', 'erm', 'umm', 'uhh']),
    'nl': new Set(['ehm', 'eh', 'uh', 'um', 'hm', 'hmm', 'erm']),
    'de': new Set(['äh', 'ähm', 'ähem', 'uh', 'um', 'hm', 'hmm', 'erm']),
    'pt': new Set(['é', 'hã', 'ah', 'uh', 'hmm', 'hm', 'erm']),
    'cs': new Set(['eem', 'ehm', 'hm', 'hmm', 'uh', 'um', 'ah', 'err']),
    'pl': new Set(['um', 'uh', 'eh', 'hm', 'hmm', 'no', 'ano', 'erm']),
    'es': new Set(['um', 'uh', 'eh', 'este', 'hm', 'hmm', 'ah', 'erm'])
  };

  constructor(language = 'en') {
    const supportedLanguages = ['en', 'nl', 'de', 'pt', 'cs', 'pl', 'es'];
    
    if (!supportedLanguages.includes(language)) {
      throw new Error(
        `Unsupported language: ${language}. Use: ${supportedLanguages.join(', ')}`
      );
    }

    this.language = language;
    this.fillerWords = TranscriptionCleaner.FILLER_WORDS[language];
  }

  /**
   * Main cleaning function
   * @param {string} rawText - Raw voice-to-text output
   * @returns {string} Cleaned transcription
   */
  clean(rawText) {
    if (!rawText) return '';

    // Step 1: Normalize whitespace
    let text = this._normalizeWhitespace(rawText);

    // Step 2: Remove pure interjections
    text = this._removePureInterjections(text);

    // Step 3: Normalize whitespace
    text = this._normalizeWhitespace(text);

    // Step 4: MAIN FOCUS - Remove exact word repetitions
    text = this._removeExactWordRepetitions(text);

    // Step 5: Normalize whitespace
    text = this._normalizeWhitespace(text);

    // Step 6: MAIN FOCUS - Remove phrase repetitions
    text = this._removePhraseRepetitions(text);

    // Step 7: Normalize whitespace
    text = this._normalizeWhitespace(text);

    // Step 8: Add punctuation
    text = this._addPunctuation(text);

    return text;
  }

  /**
   * Clean with detailed step-by-step output for debugging
   * @param {string} rawText - Raw voice-to-text output
   * @returns {object} Dictionary with step-by-step results
   */
  cleanWithDetails(rawText) {
    const result = { original: rawText };

    let text = this._normalizeWhitespace(rawText);
    result.step_1_normalize_whitespace = text;

    text = this._removePureInterjections(text);
    result.step_2_remove_interjections = text;

    text = this._normalizeWhitespace(text);
    result.step_3_normalize_whitespace = text;

    text = this._removeExactWordRepetitions(text);
    result.step_4_remove_word_repetitions = text;

    text = this._normalizeWhitespace(text);
    result.step_5_normalize_whitespace = text;

    text = this._removePhraseRepetitions(text);
    result.step_6_remove_phrase_repetitions = text;

    text = this._normalizeWhitespace(text);
    result.step_7_normalize_whitespace = text;

    text = this._addPunctuation(text);
    result.final = text;

    return result;
  }

  /**
   * Remove extra whitespace
   * @private
   */
  _normalizeWhitespace(text) {
    // Multiple spaces to single space
    text = text.replace(/ +/g, ' ');
    // Remove space before punctuation
    text = text.replace(/ +([,.!?;:])/g, '$1');
    return text.trim();
  }

  /**
   * Remove only pure interjection words
   * @private
   */
  _removePureInterjections(text) {
    const words = text.split(' ');
    const cleanedWords = [];

    for (const word of words) {
      const wordClean = word.replace(/[,.!?;:]+$/, '').toLowerCase();
      if (!this.fillerWords.has(wordClean)) {
        cleanedWords.push(word);
      }
    }

    return cleanedWords.join(' ');
  }

  /**
   * Remove exact word repetitions (but but → but, i i i → i)
   * @private
   */
  _removeExactWordRepetitions(text) {
    const words = text.split(' ');
    if (words.length < 2) return text;

    const cleanedWords = [];
    let i = 0;

    while (i < words.length) {
      const currentWord = this._normalizeWord(words[i]);

      // Skip if this is a duplicate of the previous word
      if (i > 0 && currentWord === this._normalizeWord(words[i - 1])) {
        i++;
        continue;
      }

      cleanedWords.push(words[i]);
      i++;
    }

    return cleanedWords.join(' ');
  }

  /**
   * Remove phrase repetitions (we should we should → we should)
   * @private
   */
  _removePhraseRepetitions(text) {
    const words = text.split(' ');
    if (words.length < 4) return text;

    const cleanedWords = [];
    let i = 0;

    while (i < words.length) {
      let foundRepetition = false;

      // Try phrases from longest to shortest
      for (let phraseLen = Math.min(5, words.length - i); phraseLen > 1; phraseLen--) {
        if (i + phraseLen * 2 <= words.length) {
          // Check if the next phraseLen words repeat
          const phrase1 = words.slice(i, i + phraseLen)
            .map(w => this._normalizeWord(w));
          const phrase2 = words.slice(i + phraseLen, i + phraseLen * 2)
            .map(w => this._normalizeWord(w));

          if (this._arraysEqual(phrase1, phrase2)) {
            // Found a repetition! Keep only first
            cleanedWords.push(...words.slice(i, i + phraseLen));
            i += phraseLen * 2;
            foundRepetition = true;
            break;
          }
        }
      }

      if (!foundRepetition) {
        cleanedWords.push(words[i]);
        i++;
      }
    }

    return cleanedWords.join(' ');
  }

  /**
   * Normalize word for comparison
   * @private
   */
  _normalizeWord(word) {
    return word.replace(/[^\w]/g, '').toLowerCase();
  }

  /**
   * Check if arrays are equal
   * @private
   */
  _arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, idx) => val === arr2[idx]);
  }

  /**
   * Add period at end if missing
   * @private
   */
  _addPunctuation(text) {
    if (!text) return text;

    text = text.trimEnd();
    if (text && !['.', '!', '?', ',', ';', ':'].includes(text[text.length - 1])) {
      text += '.';
    }

    return text;
  }
}

// Export for Node.js and browsers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranscriptionCleaner;
}
