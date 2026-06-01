# transcription-cleaner

Multi-language voice-to-text transcription cleaner, written in TypeScript.

Removes filler interjections (um, uh, …), collapses repeated words (`but but` → `but`) and repeated phrases (`we should we should` → `we should`), normalizes whitespace, and adds end punctuation.

## Installation

```bash
npm install transcription-cleaner
```

## Quick Start

### TypeScript / ES modules

```ts
import TranscriptionCleaner, { Language } from 'transcription-cleaner';

const cleaner = new TranscriptionCleaner(Language.EN);
const result = cleaner.clean('we should we should go');
console.log(result); // "we should go."
```

### CommonJS (JavaScript)

```js
const TranscriptionCleaner = require('transcription-cleaner');

const cleaner = new TranscriptionCleaner('en');
console.log(cleaner.clean('we should we should go')); // "we should go."
```

## Languages

Use the `Language` enum (recommended in TypeScript) or the equivalent string code:

| Enum          | Code | Language   |
| ------------- | ---- | ---------- |
| `Language.EN` | `en` | English    |
| `Language.NL` | `nl` | Dutch      |
| `Language.DE` | `de` | German     |
| `Language.PT` | `pt` | Portuguese |
| `Language.CS` | `cs` | Czech      |
| `Language.PL` | `pl` | Polish     |
| `Language.ES` | `es` | Spanish    |
| `Language.FR` | `fr` | French     |

## API

### `new TranscriptionCleaner(language?, options?)`

Creates a cleaner for the given language. Defaults to `Language.EN`. Throws if the language is not supported.

| Option | Default | Description |
|---|---|---|
| `fuzzy` | `true` | Collapse near-duplicate words/phrases via edit distance |
| `maxWordDistance` | `1` | Max Levenshtein distance per word |
| `minFuzzyLength` | `4` | Words shorter than this are never fuzzy-matched |
| `maxPhraseTokenMismatches` | `1` | Max differing tokens allowed in a fuzzy phrase match |

### `clean(rawText: string): string`

Returns the cleaned transcription.

### `cleanWithDetails(rawText: string): CleanDetails`

Returns the result of each pipeline step, useful for debugging. The `CleanDetails` object contains:

- `original`
- `step_1_normalize_whitespace`
- `step_2_remove_interjections`
- `step_3_remove_word_repetitions`
- `step_4_remove_phrase_repetitions`
- `fuzzyMerges` — every word/phrase that was collapsed, with `kept`, `dropped`, and `distance`
- `final`

```ts
const cleaner = new TranscriptionCleaner(Language.EN, { fuzzy: true });
const details = cleaner.cleanWithDetails('we should we shoud go');

console.log(details.final);        // "we should go."
console.log(details.fuzzyMerges);  // [{ kind: 'phrase', kept: 'we should', dropped: 'we shoud', distance: 1 }]
```

## Fuzzy matching

By default only exact repetitions are removed. Enable fuzzy mode to also catch near-duplicates from voice-to-text mishearings:

```ts
const fz = new TranscriptionCleaner(Language.EN, { fuzzy: true });

fz.clean('should shoud go')        // → "should go."   (word, distance 1)
fz.clean('we should we shoud go')  // → "we should go." (phrase, 1 fuzzy token)
fz.clean('the the go')             // → "the go."       (exact, always works)
fz.clean('de je boom')             // → "de je boom."   (< 4 chars, skipped)
```

## Development

```bash
npm install      # install dependencies
npm test         # run tests (ts-node src/test.ts)
npm start        # run examples (ts-node src/example.ts)
npm run build    # compile to dist/ (tsc)
npm run dev      # watch mode
```

## License

MIT