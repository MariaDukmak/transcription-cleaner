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

```ts
const cleaner = new TranscriptionCleaner(Language.NL);
cleaner.clean('we moeten we moeten gaan'); // "we moeten gaan."
```

## API

### `new TranscriptionCleaner(language?: Language)`

Creates a cleaner for the given language. Defaults to `Language.EN`. Throws if the language is not supported.

### `clean(rawText: string): string`

Returns the cleaned transcription.

### `cleanWithDetails(rawText: string): CleanDetails`

Returns the result of each pipeline step, useful for debugging:

```ts
const details = cleaner.cleanWithDetails('um we should we should go');
console.log(details.step_2_remove_interjections); // "we should we should go"
console.log(details.final);                       // "we should go."
```

The `CleanDetails` object contains: `original`, `step_1_normalize_whitespace`, `step_2_remove_interjections`, `step_3_remove_word_repetitions`, `step_4_remove_phrase_repetitions`, and `final`.

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