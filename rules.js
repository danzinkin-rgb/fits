/* Fits — rule library.
   Each rule: id, type ('num' | 'word' | 'shape'), d (difficulty 1-3), text (revealed at the end),
   clue (hint 2), why (the takeaway shown after the game), test(value) -> boolean.
   Numbers are integers 1-999. Words are lowercase a-z and must be in the dictionary (words.txt); Y counts as a consonant. */
(function (root) {
  'use strict';

  const dg = n => String(n).split('').map(Number);
  const sum = a => a.reduce((x, y) => x + y, 0);
  const isPrime = n => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
  const isSq = n => Number.isInteger(Math.sqrt(n));
  const FIB = new Set([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987]);
  const V = 'aeiou';
  const vowels = w => [...w].filter(c => V.includes(c)).length;
  const TOP = 'qwertyuiop';

  const N = (id, d, text, clue, why, test) => ({ id, type: 'num', d, text, clue, why, test });
  const W = (id, d, text, clue, why, test) => ({ id, type: 'word', d, text, clue, why, test });

  const RULES = [
    // ---------- numbers, easy ----------
    N('even', 1, 'Even numbers', 'Only the last digit matters.',
      'A number is even exactly when its last digit is even. The other digits never change that.', n => n % 2 === 0),
    N('odd', 1, 'Odd numbers', 'Only the last digit matters.',
      'Odd numbers end in 1, 3, 5, 7 or 9. One fitting example and one failing example next to each other (7 and 8) tells you more than five fitting ones.', n => n % 2 === 1),
    N('mult5', 1, 'Multiples of 5', 'Only the last digit matters.',
      'Every multiple of 5 ends in 0 or 5, because 10 is itself a multiple of 5.', n => n % 5 === 0),
    N('mult10', 1, 'Multiples of 10', 'Only the last digit matters.',
      'Testing 5 was the quickest way to separate this from "multiples of 5". A test that could fail is worth more than one you expect to pass.', n => n % 10 === 0),
    N('gt500', 1, 'Numbers greater than 500', 'Size matters, digits do not.',
      'Halving the range each time (500, 250, 750...) finds any threshold in about ten tests. That is binary search.', n => n > 500),
    N('twodigit', 1, 'Two-digit numbers', 'Count the digits.',
      'When small and large numbers both fail, the rule is probably a range. Test the edges: 9, 10, 99, 100.', n => n >= 10 && n <= 99),
    N('has7', 1, 'Contains the digit 7', 'A particular digit is involved.',
      'Some rules are about how a number is written, not its value. 70 and 17 have little in common arithmetically.', n => String(n).includes('7')),
    N('ends3', 1, 'Ends in 3', 'Only the last digit matters.',
      'Numbers ending in 3 are all odd, so "odd" fits every early example. Only a failing odd number exposes the narrower rule.', n => n % 10 === 3),

    // ---------- numbers, medium ----------
    N('mult3', 2, 'Multiples of 3', 'Add up the digits.',
      'A number is a multiple of 3 exactly when its digits add up to a multiple of 3. 471: 4+7+1 = 12, so yes.', n => n % 3 === 0),
    N('mult4', 2, 'Multiples of 4', 'The last two digits decide it.',
      '100 is a multiple of 4, so only the last two digits matter. 716 fits because 16 does.', n => n % 4 === 0),
    N('mult6', 2, 'Multiples of 6', 'Two simpler rules combined.',
      'Multiples of 6 are the even multiples of 3. Many rules are two simple rules joined by "and".', n => n % 6 === 0),
    N('mult7', 2, 'Multiples of 7', 'It is about division.',
      '7 has no easy digit trick, which is why it hides well. Testing a run of neighbours (20, 21, 22...) exposes any "every Nth number" rule.', n => n % 7 === 0),
    N('mult9', 2, 'Multiples of 9', 'Add up the digits.',
      'The digits of any multiple of 9 add up to a multiple of 9. 585: 5+8+5 = 18.', n => n % 9 === 0),
    N('mult11', 2, 'Multiples of 11', 'It is about division.',
      'For 11, alternately add and subtract the digits: 847 gives 8-4+7 = 11, so it is a multiple.', n => n % 11 === 0),
    N('square', 2, 'Perfect squares', 'Think of multiplying a number by itself.',
      'The gaps between squares are the odd numbers: 1, 4, 9, 16 differ by 3, 5, 7. Squares only end in 0, 1, 4, 5, 6 or 9.', isSq),
    N('pal', 2, 'Reads the same backwards (single digits count)', 'Read it right to left.',
      'Palindromes depend on how we write numbers. In another base, 121 would not be one.', n => { const s = String(n); return s === [...s].reverse().join(''); }),
    N('repeat', 2, 'Has a repeated digit', 'Compare the digits with each other.',
      'Of the numbers from 100 to 999, 252 have a repeated digit. That is 28%, more than most people guess.', n => { const s = String(n); return new Set(s).size < s.length; }),
    N('asc', 2, 'Digits increase from left to right (two or more digits)', 'Compare each digit with the one after it.',
      'Only 120 numbers under 1000 have strictly rising digits: you choose which digits to use and the order is forced.', n => { const a = dg(n); return a.length > 1 && a.every((x, i) => i === 0 || x > a[i - 1]); }),
    N('allodd', 2, 'Every digit is odd', 'Check each digit separately.',
      'These are all odd numbers, so "odd" fits every positive example. 21 or 43 is what breaks the simpler idea.', n => dg(n).every(x => x % 2 === 1)),
    N('sum10', 2, 'Digits add up to 10', 'Add up the digits.',
      'Digit sums are a useful thing to check in any number puzzle. They also explain the divisibility tricks for 3 and 9.', n => sum(dg(n)) === 10),
    N('sumeven', 2, 'Digits add up to an even number', 'Add up the digits.',
      'The digit sum is even when the number has an even count of odd digits.', n => sum(dg(n)) % 2 === 0),
    N('lastgt', 2, 'Last digit is bigger than the first digit', 'Compare the two ends.',
      'Reversing a number (27 and 72) is a cheap test that exposes any rule about digit order.', n => { const a = dg(n); return a[a.length - 1] > a[0]; }),
    N('range', 2, 'Numbers from 200 to 400', 'Size matters, digits do not.',
      'A range needs two boundaries. Finding one edge is not enough until you have looked for the other.', n => n >= 200 && n <= 400),
    N('pow2', 2, 'Powers of 2', 'Keep doubling.',
      'Ten doublings take 1 to 1024. Doubling grows faster than intuition expects.', n => (n & (n - 1)) === 0),
    N('has0', 2, 'Contains the digit 0', 'A particular digit is involved.',
      'Every fitting number under 100 is a multiple of 10, which suggests the wrong rule. 101 or 205 is the test that separates them.', n => String(n).includes('0')),

    // ---------- numbers, hard ----------
    N('prime', 3, 'Prime numbers', 'Think about what divides it.',
      'A prime has exactly two divisors: 1 and itself. To check a number below 1000 you only need to try dividing by primes up to 31.', isPrime),
    N('tri', 3, 'Triangular numbers (1, 3, 6, 10, 15...)', 'Add 1 + 2 + 3 + ...',
      'The nth triangular number is n(n+1)/2. Gauss is said to have used this as a schoolboy to add 1 to 100 instantly: 5050.', n => isSq(8 * n + 1)),
    N('fib', 3, 'Fibonacci numbers (1, 2, 3, 5, 8, 13...)', 'Each fitting number comes from the two before it.',
      'Each Fibonacci number is the sum of the previous two. The ratio between neighbours approaches the golden ratio, about 1.618.', n => FIB.has(n)),
    N('mod4', 3, 'One more than a multiple of 4 (1, 5, 9, 13...)', 'Think about remainders.',
      'Remainder rules look like "every 4th number, shifted". Testing consecutive numbers shows the cycle.', n => n % 4 === 1),
    N('oddmult3', 3, 'Odd multiples of 3', 'Two simpler rules combined.',
      'When two rules are joined by "and", each alone fits all your positive examples. You need failures of each to separate them.', n => n % 3 === 0 && n % 2 === 1),
    N('cube', 3, 'Perfect cubes (1, 8, 27, 64...)', 'Multiply a number by itself, twice.',
      'There are only 9 cubes below 1000. When fitting examples are rare, each one you find is very informative.', n => Math.round(Math.cbrt(n)) ** 3 === n),
    N('step1', 3, 'Neighbouring digits differ by exactly 1 (two or more digits)', 'Compare each digit with the one after it.',
      '343 and 989 fit, so this is not about rising or falling. Guard against rules that are almost right.', n => { const a = dg(n); return a.length > 1 && a.every((x, i) => i === 0 || Math.abs(x - a[i - 1]) === 1); }),
    N('sum5', 3, 'Digits add up to a multiple of 5', 'Add up the digits.',
      'Digit-sum rules scatter across the number line (5, 14, 19, 23...), so they look random until you add the digits.', n => sum(dg(n)) % 5 === 0),

    // ---------- words, easy ----------
    W('startv', 1, 'Starts with a vowel', 'Look at the first letter.',
      'One contrasting pair (EAT fits, TEA does not) pins down a position rule in two tests.', w => V.includes(w[0])),
    W('len5', 1, 'Exactly 5 letters', 'Count the letters.',
      'Some rules ignore the letters entirely. Changing one thing at a time (CAT, CATS, CATCH) isolates what matters.', w => w.length === 5),
    W('hase', 1, 'Contains the letter E', 'A particular letter is involved.',
      'E appears in about 11% of all letters in English text, more than any other letter.', w => w.includes('e')),
    W('endv', 1, 'Ends with a vowel', 'Look at the last letter.',
      'A contrasting pair confirms a position rule quickly: AREA fits, EAR does not.', w => V.includes(w[w.length - 1])),
    W('long', 1, '7 or more letters', 'Count the letters.',
      'For a threshold, test either side of where you think the boundary is: a 6-letter and a 7-letter word.', w => w.length >= 7),
    W('starts', 1, 'Starts with S', 'Look at the first letter.',
      'More English words start with S than with any other letter.', w => w[0] === 's'),

    // ---------- words, medium ----------
    W('double', 2, 'Has a double letter (two the same, side by side)', 'Look at neighbouring letters.',
      'BANANA repeats letters but has no double. Finding the example that splits two similar ideas is the core skill here.', w => /(.)\1/.test(w)),
    W('evenlen', 2, 'Has an even number of letters', 'Count the letters.',
      'Adding one letter flips the answer every time, which is the signature of an odd/even rule.', w => w.length % 2 === 0),
    W('sameends', 2, 'Starts and ends with the same letter', 'Compare the two ends.',
      'Rules that compare two positions are harder to see than rules about one. Check the first and last letters as a pair.', w => w[0] === w[w.length - 1]),
    W('norepeat', 2, 'No letter appears more than once', 'Compare the letters with each other.',
      'Words with no repeated letters are called isograms. UNCOPYRIGHTABLE is one of the longest in English.', w => new Set(w).size === w.length),
    W('twov', 2, 'Has exactly 2 vowels (Y not counted)', 'Count a certain kind of letter.',
      'A counting rule is found by changing one thing at a time: BAT, BEAT, BEAUTY.', w => vowels(w) === 2),
    W('secondv', 2, 'Second letter is a vowel', 'Look at one particular position.',
      'After the first and last letter, the second is the next place to check for a position rule.', w => V.includes(w[1])),
    W('am', 2, 'Starts with a letter from A to M', 'Look at the first letter.',
      'A rule can be about where a letter sits in the alphabet rather than which letter it is.', w => w[0] <= 'm'),
    W('endpair', 2, 'Ends with two consonants', 'Look at the end of the word.',
      'English allows far more consonant clusters at the end of a word (-ngths, -rld) than at the start.', w => w.length > 1 && !V.includes(w[w.length - 1]) && !V.includes(w[w.length - 2])),

    // ---------- words, hard ----------
    W('alpha', 3, 'Letters are in alphabetical order', 'Compare each letter with the one after it.',
      'ALMOST and BIOPSY are among the longest common English words with their letters in alphabetical order.', w => [...w].every((c, i) => i === 0 || c >= w[i - 1])),
    W('wpal', 3, 'Reads the same backwards', 'Read it right to left.',
      'Palindromes are a symmetry. Checking whether a pattern survives reversal is a general problem-solving move.', w => w === [...w].reverse().join('')),
    W('toprow', 3, 'Uses only the top row of a keyboard (QWERTYUIOP)', 'Look down at what you are typing on.',
      'TYPEWRITER is typed using only the top row. Sometimes the pattern is in the tool, not the subject.', w => [...w].every(c => TOP.includes(c))),
    W('firstlast', 3, 'First letter comes before the last letter in the alphabet', 'Compare the two ends.',
      'Reversing a word (TAB and BAT) flips this rule. Reversal is the cleanest test for anything about order.', w => w[0] < w[w.length - 1]),
    W('alternate', 3, 'Vowels and consonants alternate', 'Look at the rhythm of the letters.',
      'BANANA, LEMON and ROBOT all alternate. Languages such as Japanese and Hawaiian build nearly every word this way.', w => w.length > 1 && [...w].every((c, i) => i === 0 || V.includes(c) !== V.includes(w[i - 1]))),
    W('neighbours', 3, 'Has two alphabet neighbours side by side, in order (AB, NO, ST...)', 'Look at neighbouring letters.',
      'FIRST, HIM and STOP all contain consecutive letters of the alphabet. The pattern is invisible until you look for it.', w => [...w].some((c, i) => i > 0 && c.charCodeAt(0) - w.charCodeAt(i - 1) === 1)),
    W('morev', 3, 'Has more vowels than consonants', 'Count two kinds of letter.',
      'QUEUE is 80% vowels. Rules comparing two counts need examples where the counts are close.', w => vowels(w) > w.length - vowels(w)),
    W('onev', 3, 'Uses only one kind of vowel (Y not counted)', 'Look at the vowels only.',
      'BANANA uses only A; STRENGTHS uses only E. Ignoring the consonants is what makes the pattern visible.', w => new Set([...w].filter(c => V.includes(c))).size === 1),
  ];

  /* ---------- pictures ----------
     A picture is 'shape.colour.count.fill', for example 'c.r.2.f' = two red circles, filled in.
     shape: c circle, q square, t triangle, s star. colour: r red, b blue, g green, y yellow.
     count: 1-3. fill: f filled in, o outline. 4 x 4 x 3 x 2 = 96 pictures. */
  const P = v => { const [sh, co, n, fi] = v.split('.'); return { sh, co, n: +n, fi }; };
  const CORNERS = { c: 0, t: 3, q: 4, s: 5 };
  const S = (id, d, text, clue, why, f) => ({ id, type: 'shape', d, text, clue, why, test: v => f(P(v)) });
  RULES.push(
    S('sred', 1, 'Red', 'Look at the colour.', 'When several features vary at once, change one and hold the rest steady. That isolates what matters.', p => p.co === 'r'),
    S('sblue', 1, 'Blue', 'Look at the colour.', 'A red circle and a blue circle differ in one feature only. Pairs like that are the most useful tests.', p => p.co === 'b'),
    S('scircle', 1, 'Circles', 'Look at the shape.', 'Each picture has four features: shape, colour, count and fill. A simple rule uses just one.', p => p.sh === 'c'),
    S('stri', 1, 'Triangles', 'Look at the shape.', 'Two examples that share only one feature point straight at the rule.', p => p.sh === 't'),
    S('sone', 1, 'Exactly one shape', 'Count the shapes.', 'Count is easy to overlook because colour and shape catch the eye first.', p => p.n === 1),
    S('ssolid', 1, 'Filled in', 'Solid or outline?', 'The feature you notice last is often the one the rule uses.', p => p.fi === 'f'),
    S('sthree', 1, 'Exactly three shapes', 'Count the shapes.', 'A picture that fits and one that does not, differing only in count, settles a counting rule in one move.', p => p.n === 3),

    S('soutline', 2, 'Outlines only', 'Solid or outline?', 'Every rule has an opposite. "Outlines only" and "filled in" split the pictures exactly in half.', p => p.fi === 'o'),
    S('swarm', 2, 'Red or yellow', 'Look at the colour.', 'An "or" rule accepts two groups that look unrelated. Two fitting examples in different colours is the sign.', p => p.co === 'r' || p.co === 'y'),
    S('scorners', 2, 'Has corners (anything but circles)', 'Look at the shape.', 'Some rules are easier to state by what they leave out.', p => p.sh !== 'c'),
    S('smulti', 2, 'Two or more shapes', 'Count the shapes.', 'A threshold rule needs a test on each side of the line: one shape, then two.', p => p.n >= 2),
    S('sodd', 2, 'An odd number of shapes', 'Count the shapes.', 'One and three fit, two does not. A gap in the middle means odd and even, not more and less.', p => p.n % 2 === 1),
    S('sredsolid', 2, 'Red and filled in', 'Two features matter.', 'An "and" rule rejects most things. Each fitting example you find is strong evidence.', p => p.co === 'r' && p.fi === 'f'),
    S('sbluecirc', 2, 'Blue circles', 'Two features matter.', 'Only 6 of the 96 pictures are blue circles. Rare rules are found by studying what fits, not what fails.', p => p.co === 'b' && p.sh === 'c'),
    S('snotgreen', 2, 'Anything but green', 'Look at the colour.', 'When nearly everything fits, the failures carry the information.', p => p.co !== 'g'),
    S('ssqtri', 2, 'Squares or triangles', 'Look at the shape.', 'Squares and triangles are the two shapes here made only of straight sides with no points sticking out.', p => p.sh === 'q' || p.sh === 't'),
    S('ssolidmulti', 2, 'Filled in, and two or more shapes', 'Two features matter.', 'To confirm an "and" rule, break each half separately: a single filled shape, then several outlines.', p => p.fi === 'f' && p.n >= 2),

    S('sredorcirc', 3, 'Red, or circles, or both', 'Two features matter.', 'For an "or" rule, the telling test fails both halves at once: a blue square.', p => p.co === 'r' || p.sh === 'c'),
    S('sxor', 3, 'Red or filled in, but not both', 'Two features matter, and they pull against each other.', 'This is "exclusive or". It is how computers add binary digits.', p => (p.co === 'r') !== (p.fi === 'f')),
    S('scorn6', 3, 'Six or more corners in total (triangle 3, square 4, star 5)', 'Count something other than shapes.', 'Shape and count combine here: two triangles and two squares fit, one star does not.', p => CORNERS[p.sh] * p.n >= 6),
    S('scorneven', 3, 'An even number of corners in total (circle 0, triangle 3, square 4, star 5)', 'Count something other than shapes.', 'Even times anything is even. Circles and squares always fit; triangles and stars fit only in pairs.', p => (CORNERS[p.sh] * p.n) % 2 === 0),
    S('snostaryellow', 3, 'Not stars and not yellow', 'Two features matter.', '"Not A and not B" is the same as "neither A nor B". Logicians call this De Morgan\'s law.', p => p.sh !== 's' && p.co !== 'y'),
    S('sbluemulti', 3, 'Blue, or two or more shapes', 'Two features matter.', 'A single non-blue shape is the only kind of picture that fails. Finding the failures defines the rule.', p => p.co === 'b' || p.n >= 2)
  );
  const SHAPES = [];
  for (const sh of 'cqts') for (const co of 'rbgy') for (const n of [1, 2, 3]) for (const fi of 'fo') SHAPES.push([sh, co, n, fi].join('.'));

  /* Word pool used for starting examples, hints and the proof round. Players may test any word in words.txt. */
  const WORDS = ('apple orange banana cherry lemon melon grape peach mango olive onion carrot pepper butter cheese bread toast pizza pasta salad sugar honey coffee water juice ' +
    'tiger zebra horse sheep goose eagle otter rabbit monkey giraffe elephant dolphin octopus spider insect animal kitten puppy llama koala ' +
    'house garden window kitchen bedroom ladder mirror pillow carpet candle bottle basket pocket jacket button ribbon hammer pencil paper letter ' +
    'river ocean island forest desert valley meadow stream planet rocket galaxy comet thunder rainbow breeze autumn winter summer spring ' +
    'music guitar violin piano drum opera radio video camera robot laser magnet engine ' +
    'happy funny quiet brave clever gentle little yellow purple green silver golden empty early angry ' +
    'level radar civic noon kayak refer madam rotor stats deed peep solos ' +
    'almost begin ghost below chimp first floor accent abbey adopt biopsy chops ' +
    'typewriter power tower route equip proper poetry write riot trip quote pretty tiptoe ' +
    'area idea audio queue oasis eerie aerie adieu ' +
    'energy arena erase alpha aroma dread kiosk tenet sass seas stars sings ' +
    'umbrella elbow igloo under every eleven eight ' +
    'balloon school street strength rhythm crypt world lamps ' +
    'hotel stop hint open defer study calm ' +
    'book moon tree star fish bird frog lamp desk ship wolf milk sand salt soup sock ' +
    'adventure chocolate education dinosaur mountain sandwich triangle calendar keyboard universe holiday journey mystery picture quantum blanket crystal ' +
    'sun sea sky sit six ant egg owl ice arm').split(' ');

  root.FITS_RULES = RULES;
  root.FITS_SHAPES = SHAPES;
  root.FITS_WORDS = [...new Set(WORDS)];
})(typeof window !== 'undefined' ? window : globalThis);
