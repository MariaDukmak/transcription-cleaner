# transcription-cleaner

Multi-language voice-to-text transcription cleaner for JavaScript.

## Installation

npm install transcription-cleaner

## Quick Start

const TranscriptionCleaner = require('transcription-cleaner');
const cleaner = new TranscriptionCleaner('en');
const result = cleaner.clean('we should we should go');
console.log(result); // "we should go."

## Languages

EN, NL, DE, PT, CS, PL, ES
