/* Fits — game logic. No build step, no dependencies.
   Standard game: a shortlist of possible rules is shown. Six moves; a move is a test or naming the rule.
   Expert round (practice only): no shortlist. Work the rule out cold, then prove it by sorting six examples. */
(() => {
  'use strict';

  const RULES = window.FITS_RULES, WORDS = window.FITS_WORDS, SHAPES = window.FITS_SHAPES;
  const byId = Object.fromEntries(RULES.map(r => [r.id, r]));
  const EPOCH = new Date(2026, 10, 1);          // puzzle No. 1 = 1 Nov 2026, local time
  const MAX_MOVES = 6;
  const EX = { PROBES: 15, STRIKES: 3, HINTS: 2, PROOF_N: 6 };
  const KEY = 'fits:v3';
  const TRAY_N = 16;                             // pictures on offer at any one time
  const KIND = { num: 'numbers', word: 'words', shape: 'pictures' };

  const $ = s => document.querySelector(s);
  const TOUCH = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || /[?&]touch=1/.test(location.search);
  document.body.classList.toggle('touch', TOUCH);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* ---------- storage ---------- */
  const defaults = () => ({ days: {}, stats: { played: 0, won: 0, streak: 0, max: 0, lastWon: 0, dist: [0, 0, 0, 0, 0, 0, 0] }, seenHelp: false });
  let db = defaults();
  try { db = Object.assign(db, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* private mode: play without saving */ }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } };

  /* ---------- dictionary ----------
     words.txt is the public-domain ENABLE list, trimmed to 2-12 letters. Only real words can be tested.
     DICT is null while loading, a Set once loaded, and false if it could not be loaded (then any letters are accepted). */
  let DICT = null, dictLoading = null;
  function loadDict() {
    if (DICT !== null || dictLoading) return dictLoading;
    dictLoading = fetch('words.txt').then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(t => { DICT = new Set(t.split(/\s+/)); })
      .catch(() => { DICT = false; });
    return dictLoading;
  }

  /* ---------- seeded randomness ---------- */
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    let a = hash(String(seed));
    return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function shuffled(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function pick(r, arr, k, used) {
    let pool = arr.filter(v => !used.has(v));
    if (pool.length < k) pool = arr;             // rare rules can run out of unseen examples
    const out = shuffled(pool, r).slice(0, k);
    out.forEach(v => used.add(v));
    return out;
  }

  /* ---------- puzzles ---------- */
  const NUMS = Array.from({ length: 999 }, (_, i) => i + 1);
  const splitCache = {};
  function split(rule) {
    if (!splitCache[rule.id]) {
      const u = rule.type === 'num' ? NUMS : rule.type === 'word' ? WORDS : SHAPES;
      splitCache[rule.id] = { yes: u.filter(rule.test), no: u.filter(v => !rule.test(v)) };
    }
    return splitCache[rule.id];
  }
  const today = () => { const n = new Date(); return Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - EPOCH) / 864e5) + 1; };

  /* The type rotates every day (numbers, words, pictures), so a 30-day month has 10 of each and no type
     ever runs twice in a row. Difficulty follows the weekday: Mon-Tue easy, Wed-Fri medium, Sat-Sun hard.
     Each (type, difficulty) pair works through its own shuffled list, so rules repeat as rarely as possible. */
  const TYPES = ['num', 'word', 'shape'];
  const typeOf = n => TYPES[n % 3];
  const tierOf = n => { const d = new Date(EPOCH); d.setDate(d.getDate() + n - 1); return [1, 1, 2, 2, 2, 3, 3][(d.getDay() + 6) % 7]; };
  const schedLists = {};
  function ruleForDay(n) {
    const type = typeOf(n), tier = tierOf(n), key = type + tier;
    if (!schedLists[key]) schedLists[key] = shuffled(RULES.filter(r => r.type === type && r.d === tier), rng('sched' + key));
    let k = 0;
    for (let m = 1; m < n; m++) if (typeOf(m) === type && tierOf(m) === tier) k++;
    return schedLists[key][k % schedLists[key].length];
  }

  /* Starting examples are chosen so that as many shortlist rules as possible still fit them:
     nothing on the shortlist is ruled out before the player's first move. */
  function fresh(rule, seed, expert) {
    const r = rng(seed + ':start'), sp = split(rule);
    const nCards = rule.d === 1 ? 6 : 8;
    const others = RULES.filter(o => o.type === rule.type && o.id !== rule.id);
    let best = null;
    for (let i = 0; i < (expert ? 1 : 400); i++) {
      const yes = pick(r, sp.yes, 2, new Set());
      const live = others.filter(o => yes.every(v => o.test(v)));
      if (best && live.length <= best.ok.length) continue;
      /* for this pair, look for the non-fitting example that leaves the most rules standing */
      for (const no of expert ? pick(r, sp.no, 1, new Set()) : shuffled(sp.no, r)) {
        const ok = live.filter(o => !o.test(no));
        if (!best || ok.length > best.ok.length) best = { yes, no: [no], ok };
        if (ok.length >= nCards - 1) break;
      }
      if (best && best.ok.length >= nCards - 1) break;
    }
    const items = [...best.yes.map(v => ({ v, fit: true, src: 'seed' })), ...best.no.map(v => ({ v, fit: false, src: 'seed' }))];
    const tray = rule.type === 'shape' ? { tray: [], trayN: 0 } : {};
    if (expert) return fillTray(rule, { seed, expert: true, items, ...tray, log: '', strikes: 0, hints: 0, clue: false, done: null, stars: 0 });
    const decoys = shuffled(best.ok, r).slice(0, nCards - 1);
    /* never pad with a rule the examples already rule out: a slightly shorter shortlist is better */
    return fillTray(rule, { seed, expert: false, items, ...tray, cards: shuffled([rule, ...decoys], r).map(c => c.id), out: {}, log: '', done: null, score: 0 });
  }

  /* Picture days: players test by tapping one of TRAY_N pictures on offer. Each tested picture is replaced.
     The tray always holds a mix of fitting and non-fitting pictures where the rule allows it. */
  function fillTray(rule, s) {
    if (rule.type !== 'shape') return s;
    while (s.tray.length < TRAY_N) {
      const r = rng(s.seed + ':tray' + s.trayN++);
      const taken = new Set([...s.items.map(i => i.v), ...s.tray]);
      const free = shuffled(SHAPES.filter(v => !taken.has(v)), r);
      if (!free.length) break;
      const fits = s.tray.filter(v => rule.test(v)).length, want = fits < 5 ? true : s.tray.length - fits < 5 ? false : null;
      s.tray.push(free.find(v => want === null || rule.test(v) === want) || free[0]);
    }
    return s;
  }

  function makeProof(rule, s) {
    const r = rng(s.seed + ':proof' + s.strikes), sp = split(rule);
    const used = new Set(s.items.map(i => i.v));
    const nYes = 2 + Math.floor(r() * 3), nNo = EX.PROOF_N - nYes;
    const yes = pick(r, sp.yes, nYes, used);
    let no = [];
    if (rule.type === 'num') {                   // half the non-fitting numbers sit next to a fitting one
      const near = sp.no.filter(v => rule.test(v + 1) || (v > 1 && rule.test(v - 1)));
      no = pick(r, near, Math.ceil(nNo / 2), used);
    }
    no = no.concat(pick(r, sp.no, nNo - no.length, used));
    return shuffled([...yes.map(v => ({ v, fit: true })), ...no.map(v => ({ v, fit: false }))], r).map(i => ({ ...i, ans: null }));
  }

  /* ---------- game state ---------- */
  let G = null;                                  // { mode, day, rule, s, proof, picking }

  /* The browser's Back button stays inside the game: it closes whatever dialog is open, and from a practice
     round, expert round or past puzzle it returns to today's puzzle. Only from today's puzzle does it leave. */
  const Nav = {
    popping: false,
    push(state) { try { history.pushState(state, ''); } catch (e) { /* not allowed here */ } },
    dialog(d) {
      d.showModal = function () { HTMLDialogElement.prototype.showModal.call(this); Nav.push({ dlg: this.id }); };
      d.addEventListener('close', () => { if (history.state && history.state.dlg === d.id) history.back(); });
    },
    mode(mode) {
      if (mode === 'daily' || Nav.popping) return;
      if (history.state && history.state.mode) { try { history.replaceState({ mode }, ''); } catch (e) { /* ignore */ } }
      else Nav.push({ mode });
    },
    onpop(e) {
      const open = document.querySelectorAll('dialog[open]');
      if (open.length) { open.forEach(d => d.close()); return; }
      const st = e.state || {};
      if (st.dlg) { history.back(); return; }                       // a leftover entry for a dialog that is already closed
      if (!st.mode && G && G.mode !== 'daily') { Nav.popping = true; start('daily', today()); Nav.popping = false; }
    },
  };
  window.addEventListener('popstate', e => Nav.onpop(e));

  function start(mode, day) {
    let rule, s;
    if (mode === 'practice' || mode === 'expert') {
      rule = RULES[Math.floor(Math.random() * RULES.length)];
      s = fresh(rule, 'p' + Date.now(), mode === 'expert');
    } else {
      rule = ruleForDay(day);
      s = db.days[day] || (db.days[day] = fresh(rule, 'd' + day, false));
    }
    G = { mode, day, rule, s, proof: null, picking: false, sel: null };
    Nav.mode(mode);
    if (!s.t0) { s.t0 = Date.now(); Track.send('puzzle_start', gp()); }
    if (rule.type === 'word') loadDict();
    if (s.tray) fillTray(rule, s);
    $('#probe-input').value = '';
    save();
    render();
  }
  const saved = () => G.mode === 'daily' || G.mode === 'archive';
  const save = () => { if (saved()) persist(); };
  const probeCount = () => G.s.items.filter(i => i.src === 'probe').length;
  const moves = () => (G.s.log.match(/[fnx]/g) || []).length;
  const testsLeft = () => G.s.expert ? EX.PROBES - probeCount() : MAX_MOVES - 1 - moves();   // the last move must name the rule
  const SHAPE_NAME = { c: 'circle', q: 'square', t: 'triangle', s: 'star' }, COLOUR_NAME = { r: 'red', b: 'blue', g: 'green', y: 'yellow' };
  const SHAPE_PATH = { c: '<circle cx="12" cy="12" r="9"/>', q: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>', t: '<path d="M12 3 L21.5 20 L2.5 20 Z"/>', s: '<path d="M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z"/>' };
  const describe = v => { const [sh, co, n, fi] = v.split('.'); return n + ' ' + COLOUR_NAME[co] + ' ' + SHAPE_NAME[sh] + (n > 1 ? 's' : '') + ', ' + (fi === 'f' ? 'filled in' : 'outline'); };
  const show = v => G.rule.type === 'num' ? String(v) : G.rule.type === 'word' ? v.toUpperCase() : describe(v);
  /* face(v): what goes inside a chip, tray button or proof row */
  function face(v) {
    if (G.rule.type !== 'shape') return document.createTextNode(show(v));
    const [sh, co, n, fi] = v.split('.');
    const g = el('span', 'glyph c-' + co + (fi === 'f' ? ' solid' : ''));
    g.setAttribute('role', 'img'); g.setAttribute('aria-label', describe(v));
    g.innerHTML = ('<svg viewBox="0 0 24 24" aria-hidden="true">' + SHAPE_PATH[sh] + '</svg>').repeat(+n);
    if (db.labels) g.append(el('b', 'ctag', co.toUpperCase()));   // colour letters: R, B, G, Y
    return g;
  }

  function probe(raw) {
    const s = G.s, isNum = G.rule.type === 'num';
    raw = raw.trim().toLowerCase();
    let v;
    if (G.rule.type === 'shape') {
      if (!s.tray.includes(raw)) return fail('Tap a picture first.');
      v = raw;
    } else if (isNum) {
      if (!/^\d{1,3}$/.test(raw) || +raw < 1) return fail('Enter a whole number from 1 to 999.');
      v = +raw;
    } else {
      if (!/^[a-z]{2,12}$/.test(raw)) return fail('Letters only, 2 to 12 of them.');
      if (DICT === null) { loadDict(); return fail('Loading the word list. Try again in a moment.'); }
      if (DICT && !DICT.has(raw)) return fail(raw.toUpperCase() + ' is not in the word list. Real words only.');
      v = raw;
    }
    if (s.items.some(i => i.v === v)) return fail(show(v) + ' is already on the board.');
    if (testsLeft() <= 0) return fail(s.expert ? 'No tests left. Time to prove it.' : 'Last move. Name the rule.');
    const fit = !!G.rule.test(v);
    s.items.push({ v, fit, src: 'probe' });
    s.log += fit ? 'f' : 'n';
    Track.send('test', Object.assign(gp(), { move: s.expert ? probeCount() : moves(), fit }));
    if (s.tray) { s.tray = s.tray.filter(t => t !== v); fillTray(G.rule, s); G.sel = null; }
    save();
    render();
    const what = G.rule.type === 'shape' ? 'That one' : show(v);
    say(testsLeft() > 0 ? what + (fit ? ' fits.' : " doesn't fit.") : s.expert ? 'No tests left. Time to prove it.' : what + (fit ? ' fits.' : " doesn't fit.") + ' Last move: name the rule.');
    return true;
  }

  /* --- standard game: the shortlist --- */
  function tapCard(id) {
    const s = G.s;
    if (s.out[id] === 'w') return;
    if (!G.picking) { if (s.out[id]) delete s.out[id]; else s.out[id] = 'x'; save(); return render(); }
    G.picking = false;
    if (id === G.rule.id) { s.score = moves() + 1; return finish('won'); }
    s.out[id] = 'w';
    s.log += 'x';
    Track.send('wrong_guess', Object.assign(gp(), { move: moves(), guessed: id }));
    if (moves() >= MAX_MOVES) return finish('lost');
    save();
    render();
    say('Not that one. ' + (MAX_MOVES - moves()) + (MAX_MOVES - moves() === 1 ? ' move left.' : ' moves left.'));
    shake($('#cards'));
  }

  async function tidy() {
    if (!(await Ads.rewarded('tidy up the shortlist'))) return;
    const s = G.s;
    let n = 0;
    s.cards.forEach(id => { if (!s.out[id] && s.items.some(i => !!byId[id].test(i.v) !== i.fit)) { s.out[id] = 'x'; n++; } });
    s.log += 't';
    Track.send('tidy_up', Object.assign(gp(), { move: moves() + 1, crossed_out: n }));
    save(); render();
    say(n ? n + (n === 1 ? ' rule' : ' rules') + ' crossed out: the board already contradicts ' + (n === 1 ? 'it.' : 'them.') : 'Nothing to cross out. Every rule left still matches the board.');
  }

  /* --- expert round: prove it --- */
  function submitProof() {
    const s = G.s, wrong = G.proof.filter(i => i.ans !== i.fit).length;
    if (wrong === 0) { s.stars = starsFor(s); return finish('won'); }
    s.strikes++;
    s.log += 'x';
    Track.send('proof_failed', Object.assign(gp(), { wrong }));
    G.proof.forEach(i => { if (!s.items.some(j => j.v === i.v)) s.items.push({ v: i.v, fit: i.fit, src: 'proof' }); });
    G.proof = null;
    if (s.strikes >= EX.STRIKES) return finish('lost');
    render();
    say(wrong + ' of 6 wrong. All six are now on the board, correctly sorted.');
    shake($('.board'));
  }
  function starsFor(s) {
    const p = s.items.filter(i => i.src === 'probe').length;
    let n = s.strikes === 0 && p <= 5 ? 3 : s.strikes <= 1 && p <= 10 ? 2 : 1;
    if (s.hints > 0) n = Math.min(n, 2);
    return n;
  }
  async function expertHint() {
    const s = G.s;
    if (s.hints >= EX.HINTS || !(await Ads.rewarded('get a hint'))) return;
    s.hints++;
    if (s.hints === 1) {
      const r = rng(s.seed + ':hint'), sp = split(G.rule), used = new Set(s.items.map(i => i.v));
      s.items.push({ v: pick(r, sp.yes, 1, used)[0], fit: true, src: 'hint' }, { v: pick(r, sp.no, 1, used)[0], fit: false, src: 'hint' });
      render(); say('Two more examples added to the board.');
    } else { s.clue = true; render(); }
  }

  function finish(result) {
    const s = G.s;
    s.done = result;
    G.proof = null;
    Track.send('puzzle_end', Object.assign(gp(), {
      result, score: result === 'won' ? (s.expert ? s.stars : s.score) : 0,
      tests: (s.log.match(/[fn]/g) || []).length, wrong_guesses: (s.log.match(/x/g) || []).length,
      tidied: s.log.includes('t'), seconds: Math.round((Date.now() - (s.t0 || Date.now())) / 1000),
    }));
    if (G.mode === 'daily') {
      const st = db.stats;
      st.played++;
      st.dist[result === 'won' ? s.score : 0]++;
      if (result === 'won') { st.won++; st.streak = st.lastWon === G.day - 1 ? st.streak + 1 : 1; st.lastWon = G.day; st.max = Math.max(st.max, st.streak); }
      else st.streak = 0;
    }
    save();
    render();
    if (result === 'won') confetti();
    maybeAskRating();
  }

  /* ---------- ads, feedback and Plus ----------
     All of this is switched on from config.js. With an empty config there are no ads and nothing is gated.
     Banner: a standard AdSense display unit on the result screen.
     Rewarded: Google's Ad Placement API (H5 Games Ads). The player is asked first, every time, as Google's policy requires.
     If no ad is available, or the ad script is blocked, the player gets the reward anyway. */
  const CFG = Object.assign({ adsenseClient: '', adsenseBannerSlot: '', rewardedAds: false, posthogKey: '', posthogHost: 'https://eu.i.posthog.com' }, window.FITS_CONFIG || {});
  const adsOn = /^ca-pub-\d+$/.test(CFG.adsenseClient);
  const rewardedOn = adsOn && CFG.rewardedAds === true;
  if (adsOn) {
    window.adsbygoogle = window.adsbygoogle || [];
    const sc = document.createElement('script');
    sc.async = true; sc.crossOrigin = 'anonymous';
    sc.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(CFG.adsenseClient);
    if (rewardedOn) sc.setAttribute('data-ad-frequency-hint', '30s');
    document.head.append(sc);
  }
  const Ads = {
    /* Resolves true when the player may have the reward. what: words that finish "Watch a short ad to ...". */
    rewarded(what) {
      if (!rewardedOn) return Promise.resolve(true);
      return new Promise(resolve => {
        const d = $('#dlg-ad');
        let settled = false;
        const done = ok => { if (!settled) { settled = true; resolve(ok); } };
        $('#ad-what').textContent = 'Watch a short ad to ' + what + '?';
        $('#ad-no').onclick = () => { d.close(); done(false); };
        $('#ad-yes').onclick = () => {
          d.close();
          let offered = false;
          setTimeout(() => { if (!offered) done(true); }, 4000);          // ad script blocked or slow
          window.adsbygoogle.push({
            type: 'reward', name: 'unlock',
            beforeReward: showAd => { offered = true; showAd(); },
            adDismissed: () => done(false),
            adViewed: () => done(true),
            adBreakDone: () => done(!offered),                            // no ad to show
          });
        };
        d.oncancel = () => done(false);
        d.showModal();
      });
    },
    banner() {
      const box = $('#ad-banner');
      box.hidden = !(adsOn && CFG.adsenseBannerSlot);
      if (box.hidden || box.dataset.filled) return;
      box.dataset.filled = '1';
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle'; ins.style.display = 'block';
      ins.dataset.adClient = CFG.adsenseClient; ins.dataset.adSlot = CFG.adsenseBannerSlot;
      ins.dataset.adFormat = 'auto'; ins.dataset.fullWidthResponsive = 'true';
      box.append(ins);
      try { window.adsbygoogle.push({}); } catch (e) { /* ad blocked */ }
    },
  };

  /* ---------- play data ----------
     Anonymous events sent to PostHog when config.js has a project key. No account, no cookie, and no identifier
     kept on the device: each visit gets a throwaway id held in memory only. Returning players are recognised
     only through the counts the game already keeps (games played, streak, days since first play). */
  const VERSION = '1.1';
  const Track = {
    on: /^phc_\w+$/.test(CFG.posthogKey),
    visit: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'v' + Date.now() + Math.random().toString(36).slice(2),
    send(event, props) {
      if (!this.on) return;
      const body = JSON.stringify({
        api_key: CFG.posthogKey, event, distinct_id: this.visit, timestamp: new Date().toISOString(),
        properties: Object.assign({
          $process_person_profile: false, $lib: 'fits', app_version: VERSION, touch: TOUCH,
          installed: matchMedia('(display-mode: standalone)').matches,
          games_played: db.stats.played, streak: db.stats.streak, days_since_first_play: today() - (db.firstDay || today()),
        }, props),
      });
      try { fetch(CFG.posthogHost + '/i/v0/e/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {}); } catch (e) { /* offline */ }
    },
  };
  /* what every game event carries */
  const gp = () => ({ puzzle: G.day || null, mode: G.mode, type: G.rule.type, rule: G.rule.id, difficulty: G.rule.d, shortlist: G.s.cards ? G.s.cards.length : 0 });

  /* ---------- rating ----------
     A star rating in the style of an app-store prompt. Asked after a finished daily puzzle, at most once a week,
     and never again once the player has rated. Ratings and comments travel as play-data events. */
  let rateStars = 0;
  function openRating(source) {
    rateStars = 0; drawStars();
    $('#rate-more').hidden = true; $('#rate-text').value = '';
    $('#dlg-rate').showModal();
    Track.send('rating_shown', { source });
  }
  function drawStars() {
    document.querySelectorAll('#rate-stars button').forEach((b, i) => { b.classList.toggle('on', i < rateStars); b.setAttribute('aria-pressed', i < rateStars); });
  }
  function maybeAskRating() {
    if (!Track.on || db.rated || G.mode !== 'daily') return;
    if (db.rateAsked && today() - db.rateAsked < 7) return;
    setTimeout(() => { if (!document.querySelector('dialog[open]')) { db.rateAsked = today(); persist(); openRating('after_game'); } }, 1800);
  }
  function openPlus() { $('#plus-feedback').hidden = !Track.on; $('#dlg-plus').showModal(); Track.send('plus_viewed'); }

  /* ---------- rendering ---------- */
  function render() {
    const { rule, s, mode, day } = G, kind = KIND[rule.type];
    const name = { daily: 'No. ' + day, archive: 'No. ' + day + ' · archive', practice: 'Practice', expert: 'Expert' }[mode];
    $('#mode-label').textContent = name + ' · ' + kind;
    const view = s.done ? 'done' : G.proof ? 'proof' : 'probe';
    $('#view-probe').hidden = view !== 'probe';
    $('#view-proof').hidden = view !== 'proof';
    $('#view-done').hidden = view !== 'done';
    if (view === 'probe') renderProbe(kind);
    if (view === 'proof') renderProof();
    if (view === 'done') renderDone();
  }

  function renderProbe(kind) {
    const s = G.s, isNum = G.rule.type === 'num', left = testsLeft();
    $('#prompt').textContent =
      G.picking ? 'Tap the rule you think it is.' :
      s.expert ? (s.clue ? 'Clue: ' + G.rule.clue : 'Which ' + kind + ' fit the secret rule?') :
      'One of these rules is the secret one. Which?';
    for (const [id, fit] of [['#chips-yes', true], ['#chips-no', false]]) {
      const box = $(id); box.textContent = '';
      s.items.filter(i => i.fit === fit).forEach(i => { const chip = el('span', 'chip ' + (fit ? 'yes' : 'no') + (i.src === 'probe' ? '' : ' given')); chip.append(face(i.v)); box.append(chip); });
    }

    /* shortlist */
    const cards = $('#cards'); cards.hidden = !!s.expert; cards.textContent = '';
    cards.classList.toggle('picking', G.picking);
    if (!s.expert) s.cards.forEach(id => {
      const b = el('button', 'rule-card' + (s.out[id] === 'x' ? ' out' : s.out[id] === 'w' ? ' wrong' : ''), byId[id].text);
      b.disabled = s.out[id] === 'w';
      b.setAttribute('aria-pressed', s.out[id] === 'x');
      b.onclick = () => tapCard(id);
      cards.append(b);
    });

    /* meters */
    const pips = $('#meter-pips'); pips.textContent = '';
    if (s.expert) {
      $('#meter-text').textContent = probeCount() + (probeCount() === 1 ? ' test' : ' tests') + ' · ' + left + ' left';
      for (let i = 0; i < EX.STRIKES; i++) pips.append(el('i', i < s.strikes ? 'bad' : ''));
    } else {
      $('#meter-text').textContent = 'Move ' + Math.min(MAX_MOVES, moves() + 1) + ' of ' + MAX_MOVES;
      [...s.log].filter(c => 'fnx'.includes(c)).forEach(c => pips.append(el('i', c === 'f' ? 'yes' : c === 'n' ? 'no' : 'bad', c === 'f' ? '✓' : c === 'n' ? '✗' : '?')));
      for (let i = moves(); i < MAX_MOVES; i++) pips.append(el('i', ''));
    }

    const inp = $('#probe-input');
    inp.placeholder = isNum ? 'Test any number, 1 to 999' : 'Test any real word';
    inp.inputMode = isNum ? 'numeric' : 'text';
    inp.maxLength = isNum ? 3 : 12;
    const isShape = G.rule.type === 'shape';
    $('#probe-form').hidden = G.picking || isShape;
    renderTray(isShape && !G.picking && left > 0);
    inp.disabled = left <= 0;
    inp.readOnly = TOUCH;                        // touch devices use the on-screen keys below
    if (TOUCH) inp.inputMode = 'none';
    renderKeypad(isNum, G.picking || left <= 0 || isShape);
    $('#probe-form button').disabled = left <= 0;

    const hint = $('#btn-hint'), go = $('#btn-prove');
    if (s.expert) {
      const hl = EX.HINTS - s.hints;
      hint.textContent = hl ? 'Hint (' + hl + ' left)' : 'No hints left'; hint.disabled = !hl; hint.hidden = false;
      go.textContent = 'I know the rule';
    } else {
      hint.textContent = 'Cancel'; hint.disabled = false; hint.hidden = !G.picking;
      go.textContent = 'Name the rule';
    }
    go.hidden = G.picking;
    say(!s.expert && !G.picking && moves() === 0 && !Object.keys(s.out).length ? 'Tap a rule to cross it out. Tap again to bring it back.' : '');
  }

  /* Picture days: tap a picture to select it, then Test. */
  function renderTray(visible) {
    const box = $('#tray'); box.hidden = !visible; box.textContent = '';
    if (!visible) return;
    const grid = el('div', 'tray-grid');
    G.s.tray.forEach(v => {
      const b = el('button', 'tray-item' + (G.sel === v ? ' sel' : ''));
      b.type = 'button'; b.setAttribute('aria-pressed', G.sel === v);
      b.append(face(v));
      b.onclick = () => { G.sel = G.sel === v ? null : v; renderTray(true); };
      grid.append(b);
    });
    const go = el('button', 'btn btn-ink tray-test', G.sel ? 'Test this picture' : 'Tap a picture to test it');
    go.type = 'button'; go.disabled = !G.sel;
    go.onclick = () => probe(G.sel);
    box.append(grid, go);
  }

  /* On-screen keys for touch devices: digits for number days, letters for word days. */
  let keypadKind = null;
  function renderKeypad(isNum, hide) {
    const pad = $('#keypad');
    pad.hidden = hide;
    const kind = isNum ? 'num' : 'word';
    if (kind === keypadKind) return;
    keypadKind = kind;
    pad.textContent = '';
    pad.className = 'keypad' + (isNum ? '' : ' words');
    const rows = isNum ? ['12345', '67890<'] : ['qwertyuiop', 'asdfghjkl', 'zxcvbnm<'];
    rows.forEach(keys => {
      const row = el('div', 'krow');
      [...keys].forEach(k => {
        const b = el('button', k === '<' ? 'wide' : '', k === '<' ? '⌫' : k);
        b.type = 'button';
        b.setAttribute('aria-label', k === '<' ? 'Delete' : k);
        b.onclick = () => {
          const inp = $('#probe-input');
          if (k === '<') inp.value = inp.value.slice(0, -1);
          else if (inp.value.length < inp.maxLength) inp.value += k;
        };
        row.append(b);
      });
      pad.append(row);
    });
  }

  function renderProof() {
    const list = $('#proof-list'); list.textContent = '';
    G.proof.forEach(item => {
      const row = el('div', 'proof-row');
      const val = el('span', 'val'); val.append(face(item.v)); row.append(val);
      const tg = el('div', 'toggle');
      for (const [val, label, name] of [[true, '✓', 'Fits'], [false, '✗', "Doesn't fit"]]) {
        const b = el('button', item.ans === val ? (val ? 'sel-yes' : 'sel-no') : '', label);
        b.setAttribute('aria-label', show(item.v) + ': ' + name);
        b.setAttribute('aria-pressed', item.ans === val);
        b.onclick = () => { item.ans = val; renderProof(); };
        tg.append(b);
      }
      row.append(tg); list.append(row);
    });
    $('#btn-submit').disabled = G.proof.some(i => i.ans === null);
  }

  function renderDone() {
    const { s, rule, mode } = G, won = s.done === 'won';
    const top = $('#done-score'); top.textContent = ''; top.className = s.expert ? 'stars' : 'score';
    if (s.expert) for (let i = 0; i < 3; i++) top.append(el(i < s.stars ? 'b' : 'span', '', '★'));
    else { top.append(el('b', won ? '' : 'lost', won ? String(s.score) : 'X'), el('span', '', '/' + MAX_MOVES)); }
    $('#done-title').textContent = !won ? 'Not this time' :
      s.expert ? ['', 'Solved', 'Nicely done', 'Flawless'][s.stars] : ['', 'Mind reader', 'Brilliant', 'Sharp', 'Solid', 'Got there', 'Phew'][s.score];
    $('#done-rule').textContent = rule.text;
    $('#done-why').textContent = rule.why;
    $('#btn-share').hidden = !saved();
    $('#btn-feedback').hidden = !Track.on;
    Ads.banner();
    tickNext();
  }

  function tickNext() {
    if (!G || !G.s.done) return;
    const n = $('#done-next');
    if (G.mode !== 'daily') { n.textContent = ''; return; }
    const now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const t = Math.max(0, Math.floor((mid - now) / 1000)), pad = x => String(x).padStart(2, '0');
    n.textContent = 'Next rule in ' + pad(Math.floor(t / 3600)) + ':' + pad(Math.floor(t / 60) % 60) + ':' + pad(t % 60);
  }
  setInterval(tickNext, 1000);

  function shareText() {
    const { s, day } = G, won = s.done === 'won';
    const row = [...s.log].map(c => ({ f: '🟩', n: '🟥', x: '❌', t: '' })[c]).join('') + (won ? '🔓' : '🔒');
    const lines = ['Fits No. ' + day + ' ' + (won ? s.score : 'X') + '/' + MAX_MOVES, row];
    if (/^https?:/.test(location.protocol)) lines.push(location.origin + location.pathname);
    return lines.join('\n');
  }
  async function share() {
    const text = shareText();
    Track.send('share', gp());
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast('Result copied'); }
    } catch (e) { if (e.name !== 'AbortError') toast('Could not share'); }
  }

  function renderStats() {
    const st = db.stats;
    $('#st-played').textContent = st.played;
    $('#st-win').textContent = st.played ? Math.round(100 * st.won / st.played) : 0;
    $('#st-streak').textContent = st.streak;
    $('#st-max').textContent = st.max;
    const box = $('#st-dist'); box.textContent = '';
    const max = Math.max(1, ...st.dist);
    [1, 2, 3, 4, 5, 6, 0].forEach(n => {
      const row = el('div', 'dist-row');
      row.append(el('span', 'lbl', n ? String(n) : 'X'));
      const bar = el('span', 'bar', st.dist[n]); bar.style.width = Math.max(8, 100 * st.dist[n] / max) + '%';
      row.append(bar); box.append(row);
    });
  }

  function renderMenu() {
    const gate = rewardedOn ? ' Unlocks after a short ad.' : '';
    $('#menu-practice-sub').textContent = 'A random rule with a shortlist.' + gate;
    $('#menu-expert-sub').textContent = 'No shortlist. Work the rule out cold, then prove it.' + gate;
    $('#menu-archive-sub').textContent = 'Every puzzle since No. 1.' + gate;
    $('#menu-labels-title').textContent = 'Colour letters: ' + (db.labels ? 'on' : 'off');
    $('#menu-feedback').hidden = !Track.on;
  }

  function renderArchive() {
    const box = $('#archive-list'); box.textContent = '';
    const t = today();
    if (t <= 1) box.append(el('p', 'small', 'Nothing here yet. Come back tomorrow.'));
    for (let d = t - 1; d >= 1; d--) {
      const sv = db.days[d];
      const b = el('button', sv && sv.done === 'lost' ? 'lost' : '', String(d));
      b.append(el('small', '', sv && sv.done ? (sv.done === 'won' ? sv.score + '/' + MAX_MOVES : 'X') : sv ? '···' : ''));
      b.onclick = async () => {
        if (!sv && !(await Ads.rewarded('open this past puzzle'))) return;
        $('#dlg-archive').close();
        start('archive', d);
      };
      box.append(b);
    }
  }

  async function extra(mode) { if (await Ads.rewarded(mode === 'expert' ? 'play an expert round' : 'play a practice round')) start(mode); }

  /* ---------- small UI helpers ---------- */
  function say(t) { $('#probe-msg').textContent = t; }
  function fail(t) { say(t); shake($('#probe-form')); if (navigator.vibrate) navigator.vibrate(60); return false; }
  function shake(node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); }
  let toastTimer;
  function toast(t) { const n = $('#toast'); n.textContent = t; n.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => n.classList.remove('show'), 2200); }
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = $('#confetti'), colors = ['#5b3df5', '#17936a', '#d9482f', '#f2a900'];
    for (let i = 0; i < 60; i++) {
      const c = el('i'); c.style.left = Math.random() * 100 + '%'; c.style.background = colors[i % 4];
      c.style.animationDuration = 1.4 + Math.random() * 1.6 + 's'; c.style.animationDelay = Math.random() * .4 + 's';
      box.append(c);
    }
    setTimeout(() => { box.textContent = ''; }, 3600);
  }

  /* ---------- wiring ---------- */
  $('#probe-form').addEventListener('submit', e => {
    e.preventDefault();
    const inp = $('#probe-input');
    if (probe(inp.value)) inp.value = '';
    if (!inp.disabled && !TOUCH) inp.focus();
  });
  $('#btn-prove').onclick = () => { if (G.s.expert) G.proof = makeProof(G.rule, G.s); else G.picking = true; render(); };
  $('#btn-hint').onclick = () => { if (G.s.expert) expertHint(); else if (G.picking) { G.picking = false; render(); } };
  $('#btn-back').onclick = () => { G.proof = null; render(); };
  $('#btn-submit').onclick = submitProof;
  $('#btn-share').onclick = share;
  $('#btn-help').onclick = () => { $('#dlg-help').showModal(); Track.send('help_opened'); };
  $('#btn-stats').onclick = () => { renderStats(); $('#dlg-stats').showModal(); };
  $('#btn-menu').onclick = () => { renderMenu(); $('#dlg-menu').showModal(); };
  $('#btn-feedback').onclick = () => openRating('result');
  $('#menu-feedback').onclick = () => { $('#dlg-menu').close(); openRating('menu'); };
  $('#plus-feedback').onclick = () => { $('#dlg-plus').close(); openRating('plus'); };
  document.querySelectorAll('#rate-stars button').forEach((b, i) => b.onclick = () => { rateStars = i + 1; drawStars(); $('#rate-more').hidden = false; });
  $('#rate-send').onclick = () => {
    Track.send('rating', { stars: rateStars, comment: $('#rate-text').value.trim().slice(0, 500), puzzle: G.day || null });
    db.rated = { stars: rateStars, day: today() }; persist();
    $('#dlg-rate').close(); toast('Thank you for the rating');
  };
  $('#rate-later').onclick = () => { db.rateAsked = today(); persist(); $('#dlg-rate').close(); Track.send('rating_dismissed'); };
  $('#menu-daily').onclick = () => { $('#dlg-menu').close(); start('daily', today()); };
  $('#menu-practice').onclick = () => { $('#dlg-menu').close(); extra('practice'); };
  $('#menu-expert').onclick = () => { $('#dlg-menu').close(); extra('expert'); };
  $('#menu-archive').onclick = () => { $('#dlg-menu').close(); renderArchive(); $('#dlg-archive').showModal(); };
  $('#menu-plus').onclick = () => { $('#dlg-menu').close(); openPlus(); };
  $('#menu-labels').onclick = () => { db.labels = !db.labels; persist(); renderMenu(); render(); Track.send('colour_letters', { on: db.labels }); };
  document.querySelectorAll('dialog').forEach(d => {
    Nav.dialog(d);
    d.querySelectorAll('[data-close]').forEach(b => b.onclick = () => d.close());
    if (d.id !== 'dlg-ad') d.addEventListener('click', e => { if (e.target === d) d.close(); });   // the ad prompt needs an explicit answer
  });

  /* A tab left open overnight moves on to the new puzzle when it is next looked at. */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && G && G.mode === 'daily' && G.day !== today()) start('daily', today());
  });

  if (!db.firstDay) { db.firstDay = today(); persist(); }
  Track.send('app_open', { first_visit: !db.seenHelp });
  start('daily', today());
  if (!db.seenHelp) { db.seenHelp = true; persist(); $('#dlg-help').showModal(); }

  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});

  window.__fits = { ruleForDay, today, fresh, byId, loadDict, start, CFG, Track, get G() { return G; } };   // for testing
})();
