/* Content check: every rule needs enough fitting and non-fitting examples to build a puzzle. Run: node fits/check.js */
require('./rules.js');
const nums = Array.from({ length: 999 }, (_, i) => i + 1);
let bad = 0;
const ids = new Set();
for (const r of FITS_RULES) {
  if (ids.has(r.id)) { console.log('DUPLICATE ID', r.id); bad++; }
  ids.add(r.id);
  const u = r.type === 'num' ? nums : r.type === 'word' ? FITS_WORDS : FITS_SHAPES;
  const yes = u.filter(r.test).length, no = u.length - yes;
  if (yes < (r.type === 'shape' ? 6 : 9) || no < 9) { console.log('TOO FEW EXAMPLES', r.id, yes, no); bad++; }
  if (!r.text || !r.clue || !r.why) { console.log('MISSING TEXT', r.id); bad++; }
}
console.log(['num', 'word', 'shape'].map(t => t + ' ' + FITS_RULES.filter(r => r.type === t).length).join(', '));
console.log(FITS_RULES.length + ' rules, ' + FITS_WORDS.length + ' words, ' + bad + ' problems');
process.exit(bad ? 1 : 0);
