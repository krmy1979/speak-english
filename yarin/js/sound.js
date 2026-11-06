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
    drive() { tone(90, 1.2, 'sawtooth', 0.08, 0, 160); }
  };

  return {
    unlock, say, fx,
    play(name) { fx[name] && fx[name](); },
    toggleMute() { muted = !muted; if (muted && 'speechSynthesis' in window) speechSynthesis.cancel(); return muted; },
    isMuted() { return muted; }
  };
})();
