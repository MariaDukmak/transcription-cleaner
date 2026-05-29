/**
 * Usage Examples - TranscriptionCleaner (TypeScript)
 */

import TranscriptionCleaner, { Language, CleanDetails } from './index';

console.log('='.repeat(80));
console.log('TRANSCRIPTION CLEANER - TYPESCRIPT EXAMPLES');
console.log('='.repeat(80));

interface Sample {
  label: string;
  language: Language;
  raw: string;
}

const samples: Sample[] = [
  { label: 'English (EN)', language: Language.EN, raw: 'we should we should go but but i think' },
  { label: 'Dutch (NL)', language: Language.NL, raw: 'we moeten we moeten gaan maar maar ik denk' },
  { label: 'German (DE)', language: Language.DE, raw: 'wir müssen wir müssen gehen aber aber ich denke' },
  { label: 'Portuguese (PT)', language: Language.PT, raw: 'precisamos precisamos ir mas mas eu acho' },
  { label: 'Czech (CS)', language: Language.CS, raw: 'musíme musíme jít ale ale já myslím' },
  { label: 'Polish (PL)', language: Language.PL, raw: 'powinniśmy powinniśmy iść ale ale myślę' },
  { label: 'Spanish (ES)', language: Language.ES, raw: 'deberíamos deberíamos ir pero pero creo' },
];

for (const { label, language, raw } of samples) {
  console.log(`\n--- ${label} ---`);
  const cleaner = new TranscriptionCleaner(language);
  const result: string = cleaner.clean(raw);
  console.log(`Raw:    "${raw}"`);
  console.log(`Result: "${result}"`);
}

console.log('\n--- Debug Mode (See Each Step) ---');
const cleanerDebug = new TranscriptionCleaner(Language.EN);
const details: CleanDetails = cleanerDebug.cleanWithDetails('um we should we should go');
console.log('Original:                  ', details.original);
console.log('After remove interjections:', details.step_2_remove_interjections);
console.log('After remove word reps:    ', details.step_3_remove_word_repetitions);
console.log('Final:                     ', details.final);

console.log('\n' + '='.repeat(80));
console.log('All examples completed');
console.log('='.repeat(80));
