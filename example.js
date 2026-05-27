/**
 * Usage Examples - TranscriptionCleaner JavaScript Package
 */

const TranscriptionCleaner = require('./index.js');

console.log('='.repeat(80));
console.log('TRANSCRIPTION CLEANER - JAVASCRIPT EXAMPLES');
console.log('='.repeat(80));

// Example 1: English
console.log('\n--- English (EN) ---');
const cleanerEN = new TranscriptionCleaner('en');
const resultEN = cleanerEN.clean('we should we should go but but i think');
console.log(`Raw:    "we should we should go but but i think"`);
console.log(`Result: "${resultEN}"`);

// Example 2: Dutch
console.log('\n--- Dutch (NL) ---');
const cleanerNL = new TranscriptionCleaner('nl');
const resultNL = cleanerNL.clean('we moeten we moeten gaan maar maar ik denk');
console.log(`Raw:    "we moeten we moeten gaan maar maar ik denk"`);
console.log(`Result: "${resultNL}"`);

// Example 3: German
console.log('\n--- German (DE) ---');
const cleanerDE = new TranscriptionCleaner('de');
const resultDE = cleanerDE.clean('wir müssen wir müssen gehen aber aber ich denke');
console.log(`Raw:    "wir müssen wir müssen gehen aber aber ich denke"`);
console.log(`Result: "${resultDE}"`);

// Example 4: Portuguese
console.log('\n--- Portuguese (PT) ---');
const cleanerPT = new TranscriptionCleaner('pt');
const resultPT = cleanerPT.clean('precisamos precisamos ir mas mas eu acho');
console.log(`Raw:    "precisamos precisamos ir mas mas eu acho"`);
console.log(`Result: "${resultPT}"`);

// Example 5: Czech
console.log('\n--- Czech (CS) ---');
const cleanerCS = new TranscriptionCleaner('cs');
const resultCS = cleanerCS.clean('musíme musíme jít ale ale já myslím');
console.log(`Raw:    "musíme musíme jít ale ale já myslím"`);
console.log(`Result: "${resultCS}"`);

// Example 6: Polish
console.log('\n--- Polish (PL) ---');
const cleanerPL = new TranscriptionCleaner('pl');
const resultPL = cleanerPL.clean('powinniśmy powinniśmy iść ale ale myślę');
console.log(`Raw:    "powinniśmy powinniśmy iść ale ale myślę"`);
console.log(`Result: "${resultPL}"`);

// Example 7: Spanish
console.log('\n--- Spanish (ES) ---');
const cleanerES = new TranscriptionCleaner('es');
const resultES = cleanerES.clean('deberíamos deberíamos ir pero pero creo');
console.log(`Raw:    "deberíamos deberíamos ir pero pero creo"`);
console.log(`Result: "${resultES}"`);

// Example 8: Debug mode - see each step
console.log('\n--- Debug Mode (See Each Step) ---');
const cleanerDebug = new TranscriptionCleaner('en');
const details = cleanerDebug.cleanWithDetails('um we should we should go');
console.log('Original:                  ', details.original);
console.log('After remove interjections:', details.step_2_remove_interjections);
console.log('After remove word reps:    ', details.step_4_remove_word_repetitions);
console.log('Final:                     ', details.final);

console.log('\n' + '='.repeat(80));
console.log('✅ All examples completed');
console.log('='.repeat(80));
