// =========================================================
//  ירין על ההגה – קולות: קריין בעברית + אפקטים
//  הקריין משתמש בקול העברי המובנה בטלפון (באייפון: "כרמית")
//  האפקטים מיוצרים בקוד – בלי קבצי קול חיצוניים
// =========================================================

const Sound = (() => {
  let ctx = null;
  let muted = false;
  let heVoice = null;

  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const voices = speechSynthesis.getVoices();
    heVoice = voices.find(v => /^he/i.test(v.lang)) || voices.find(v => /iw/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  // חייבים להפעיל אחרי נגיעה ראשונה של המשתמש (דרישה של אייפון)
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  }

  function say(text, opts = {}) {
    if (muted || !('speechSynthesis' in window)) { opts.onend && setTimeout(opts.onend, 600); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL';
    if (heVoice) u.voice = heVoice;
    u.rate = opts.rate || 0.9;
    u.pitch = opts.pitch || 1.15;
    if (opts.onend) u.onend = opts.onend;
    speechSynthesis.speak(u);
  }

  function tone(freq, dur, type = 'sine', vol = 0.25, when = 0, endFreq = null) {
    if (muted || !ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, vol = 0.2, when = 0, filterFreq = 1200) {
    if (muted || !ctx) return;
    const t = ctx.currentTime + when;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t);
  }

  const fx = {
    tap()   { tone(660, 0.08, 'triangle', 0.2); },
    pop()   { tone(500, 0.12, 'sine', 0.3, 0, 1100); },
    honk()  { tone(420, 0.18, 'square', 0.12); tone(420, 0.22, 'square', 0.12, 0.24); },
    horn()  { tone(220, 0.45, 'sawtooth', 0.12); tone(277, 0.45, 'sawtooth', 0.08); },
    vroom() { tone(80, 0.7, 'sawtooth', 0.15, 0, 260); },
    siren() {
      for (let i = 0; i < 3; i++) {
        tone(700, 0.35, 'triangle', 0.18, i * 0.7, 1000);
        tone(1000, 0.35, 'triangle', 0.18, i * 0.7 + 0.35, 700);
      }
    },
    splash() { noise(0.5, 0.25, 0, 2500); },
    brick()  { tone(180, 0.1, 'square', 0.15); noise(0.08, 0.15, 0, 800); },
    oops()   { tone(300, 0.25, 'sine', 0.2, 0, 200); },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.22, i * 0.12));
    },
    drive() { tone(90, 1.2, 'sawtooth', 0.08, 0, 160); },
    boing() { tone(180, 0.35, 'sine', 0.3, 0, 620); },
    land()  { tone(120, 0.15, 'sine', 0.3, 0, 60); noise(0.12, 0.15, 0, 500); },
    glug()  { for (let i = 0; i < 5; i++) tone(160 + i * 25, 0.12, 'sine', 0.22, i * 0.18, 90); },
    water() { noise(0.45, 0.22, 0, 3500); },
    star()  { tone(880, 0.08, 'triangle', 0.18); tone(1320, 0.12, 'triangle', 0.18, 0.07); },
    siren1() {
      tone(700, 0.35, 'triangle', 0.15, 0, 1000);
      tone(1000, 0.35, 'triangle', 0.15, 0.35, 700);
    },
    door()  { tone(500, 0.1, 'square', 0.1); tone(350, 0.12, 'square', 0.1, 0.1); },
    beep()  { tone(1050, 0.14, 'square', 0.07); },
    bell()  { tone(1500, 0.12, 'triangle', 0.16); tone(1500, 0.12, 'triangle', 0.12, 0.28); },
    bump()  { tone(95, 0.22, 'sine', 0.35, 0, 50); },
    click() { tone(1400, 0.04, 'square', 0.1); },
    train() {
      tone(880, 0.5, 'sine', 0.14); tone(1110, 0.5, 'sine', 0.1);          // צפירה
      for (let i = 0; i < 8; i++) noise(0.16, 0.18, 0.6 + i * 0.32, 700);  // צ'וּ צ'וּ
      tone(880, 0.6, 'sine', 0.12, 3.2); tone(1110, 0.6, 'sine', 0.09, 3.2);
    }
  };

  // ---- מנוע רציף שהצליל שלו עולה עם המהירות ----
  let eng = null;
  function engine(frac) {
    if (muted || !ctx) return;
    if (!eng) {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0;
      o.connect(f).connect(g).connect(ctx.destination);
      o.start();
      eng = { o, g };
    }
    const t = ctx.currentTime;
    eng.o.frequency.setTargetAtTime(42 + frac * 115, t, 0.12);
    eng.g.gain.setTargetAtTime(0.03 + frac * 0.06, t, 0.2);
  }
  function engineStop() {
    if (!eng || !ctx) { eng = null; return; }
    const e = eng; eng = null;
    e.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    setTimeout(() => { try { e.o.stop(); } catch (_) {} }, 400);
  }

  // ---- סירנה בלולאה ----
  let sirenTimer = null;
  function sirenLoop(on) {
    clearInterval(sirenTimer); sirenTimer = null;
    if (on && !muted) { fx.siren1(); sirenTimer = setInterval(fx.siren1, 700); }
  }

  return {
    unlock, say, fx, engine, engineStop, sirenLoop,
    play(name) { fx[name] && fx[name](); },
    speaking() { return 'speechSynthesis' in window && speechSynthesis.speaking; },
    toggleMute() {
      muted = !muted;
      if (muted) { if ('speechSynthesis' in window) speechSynthesis.cancel(); engineStop(); sirenLoop(false); }
      return muted;
    },
    isMuted() { return muted; }
  };
})();
