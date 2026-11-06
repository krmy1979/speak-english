// =========================================================
//  ירין על ההגה – מצב נסיעה (הלב של המשחק)
//  נוסעים בדרך ארוכה בין נופים, נוגעים בחיות ובחפצים,
//  אוספים כוכבים, קופצים מרמפות, עוצרים ברמזור, מתדלקים,
//  ולכל רכב יש משימה משלו.
// =========================================================

// ---------- נופים ----------
const BIOMES = [
  {
    id: 'city', name: 'העיר', icon: '🏙️', say: 'הגענו לעיר! יש פה בניינים, חנויות ורמזורים',
    sky: ['#5BC8FF', '#C9F0FF'], ground: '#8BC34A', front: '#689F38', amp: 5, far: 'skyline',
    decor: [['🏠', 'בית'], ['🏢', 'בניין'], ['🏪', 'חנות'], ['🌳', 'עץ'], ['🏫', 'בית ספר'], ['🏦', 'בנק'], ['🌷', 'פרח'], ['🚏', 'תחנת אוטובוס']],
    animals: [['🐕', 'כלב', 'הַב הַב'], ['🐈', 'חתול', 'מיאוּ'], ['🐦', 'ציפור', 'ציוּץ ציוּץ'], ['🐿️', 'סנאי', '']]
  },
  {
    id: 'farm', name: 'החווה', icon: '🚜', say: 'הגענו לחווה! יש פה פרות, כבשים ותרנגולים',
    sky: ['#7FD4FF', '#E6F8FF'], ground: '#9CCC65', front: '#7CB342', amp: 18, far: 'hills',
    decor: [['🌾', 'חיטה'], ['🌻', 'חמנייה'], ['🏡', 'בית'], ['🌳', 'עץ'], ['🍎', 'תפוח'], ['🥕', 'גזר'], ['🌽', 'תירס']],
    animals: [['🐄', 'פרה', 'מוּוּוּ'], ['🐑', 'כבשה', 'מֶה מֶה'], ['🐓', 'תרנגול', 'קוּקוּריקוּ'], ['🐴', 'סוס', 'היהההה'], ['🦆', 'ברווז', 'גָה גָה'], ['🐐', 'עז', 'מֶה'], ['🐥', 'אפרוח', 'ציף ציף']]
  },
  {
    id: 'forest', name: 'היער', icon: '🌲', say: 'הגענו ליער! יש פה עצים גבוהים וחיות יער',
    sky: ['#6EC6E8', '#DDF5E6'], ground: '#558B2F', front: '#33691E', amp: 14, far: 'trees',
    decor: [['🌲', 'עץ אורן'], ['🌳', 'עץ'], ['🍄', 'פטרייה'], ['🌲', 'עץ אורן'], ['🪵', 'בול עץ'], ['🌿', 'שיח']],
    animals: [['🦌', 'אייל', ''], ['🦉', 'ינשוף', 'הוּ הוּ'], ['🐻', 'דוב', 'גְרְרְר'], ['🦊', 'שועל', ''], ['🐇', 'ארנב', ''], ['🦔', 'קיפוד', ''], ['🐌', 'חילזון', '']]
  },
  {
    id: 'beach', name: 'הים', icon: '🌊', say: 'הגענו לים! יש פה חול, גלים וסירות',
    sky: ['#4FC3F7', '#FFF4CC'], ground: '#F4D58D', front: '#E6BE6A', amp: 6, far: 'sea',
    decor: [['🌴', 'עץ דקל'], ['⛱️', 'שמשייה'], ['🐚', 'צדף'], ['🌴', 'עץ דקל'], ['🏐', 'כדור'], ['🪣', 'דלי']],
    animals: [['🦀', 'סרטן', ''], ['🐢', 'צב', ''], ['🐬', 'דולפין', ''], ['🐙', 'תמנון', ''], ['🦭', 'כלב ים', ''], ['🐠', 'דג', 'בּלוּבּ בּלוּבּ']]
  },
  {
    id: 'desert', name: 'המדבר', icon: '🏜️', say: 'הגענו למדבר! חם פה, ויש דיונות של חול',
    sky: ['#FFB74D', '#FFEBC2'], ground: '#E8C07D', front: '#D4A55A', amp: 26, far: 'dunes',
    decor: [['🌵', 'קקטוס'], ['🌵', 'קקטוס'], ['🪨', 'סלע'], ['⛺', 'אוהל'], ['🌴', 'עץ תמר']],
    animals: [['🐪', 'גמל', ''], ['🐫', 'גמל', ''], ['🦎', 'לטאה', ''], ['🦅', 'נשר', ''], ['🐍', 'נחש', 'ססססס']]
  },
  {
    id: 'snow', name: 'השלג', icon: '⛄', say: 'הגענו לשלג! קר פה, ויורדים פתיתי שלג',
    sky: ['#90CAF9', '#EEF7FF'], ground: '#F3F8FF', front: '#DCE8F5', amp: 20, far: 'mountains',
    decor: [['⛄', 'איש שלג'], ['🌲', 'עץ אורן'], ['☃️', 'איש שלג'], ['🌲', 'עץ אורן'], ['🛷', 'מזחלת'], ['🧊', 'קרח']],
    animals: [['🐧', 'פינגווין', ''], ['🐻‍❄️', 'דוב לבן', 'גְרְרְר'], ['🦌', 'אייל', ''], ['🐇', 'ארנב', ''], ['🦭', 'כלב ים', '']]
  }
];

const SEG = 3200;     // אורך כל נוף (ביחידות עולם)
const TRANS = 700;    // מעבר הדרגתי בין נופים
const CHUNK = 190;    // גודל קטע לייצור עצמים
const NUM_M = ['אפס', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה', 'עשרה'];

const MAX_SPEED = { sport: 270, car: 215, police: 235, ambulance: 225, fire: 195, bus: 175, truck: 175, mixer: 155, tractor: 135 };

// ---------- משימות לכל רכב ----------
const TASKS = {
  car:       { type: 'deliver', items: ['👧', '👦'], min: 1, max: 2, srcSay: 'החברים מחכים! עצור לידם', destIcon: '🎠', destName: 'גן השעשועים', count: NUM_M, carrySay: 'בוא ניסע איתם לגן השעשועים!', doneSay: 'הגענו לגן השעשועים! איזה כיף!' },
  sport:     { type: 'deliver', items: ['🏆'], min: 1, max: 1, srcSay: 'יש גביע! עצור ותאסוף אותו', destIcon: '🏁', destName: 'קו הסיום', count: NUM_M, carrySay: 'מהר לקו הסיום!', doneSay: 'הגעת לקו הסיום! ניצחת!' },
  bus:       { type: 'deliver', items: ['🧒', '👧', '👦', '👵', '👴'], min: 2, max: 4, srcSay: 'תחנת אוטובוס! עצור ליד האנשים', destIcon: '🏫', destName: 'בית הספר', count: NUM_M, carrySay: 'כולם עלו! נוסעים לבית הספר', doneSay: 'הגענו לבית הספר! כולם יורדים' },
  ambulance: { type: 'deliver', items: ['🤕'], min: 1, max: 1, srcSay: 'מישהו צריך עזרה! עצור לידו', destIcon: '🏥', destName: 'בית החולים', count: NUM_M, carrySay: 'מהר, נוסעים לבית החולים!', doneSay: 'הגענו לבית החולים. הוא כבר מרגיש טוב!', siren: true },
  police:    { type: 'deliver', items: ['🐶'], min: 1, max: 1, srcSay: 'כלבלב הלך לאיבוד! עצור לידו', destIcon: '🏡', destName: 'הבית שלו', count: NUM_M, carrySay: 'נחזיר את הכלבלב הביתה', doneSay: 'הכלבלב חזר הביתה! הוא שמח!' },
  truck:     { type: 'deliver', items: ['📦'], min: 2, max: 4, srcSay: 'ארגזים! עצור ליד המחסן להעמיס', destIcon: '🏪', destName: 'החנות', count: NUM_M, carrySay: 'העמסנו! נוסעים לחנות', doneSay: 'הבאנו את הארגזים לחנות!' },
  tractor:   { type: 'deliver', items: ['🥕', '🍎', '🌽'], min: 2, max: 4, srcSay: 'ירקות בשדה! עצור לאסוף אותם', destIcon: '🛖', destName: 'המחסן', count: NUM_M, carrySay: 'אספנו! נוסעים למחסן', doneSay: 'הירקות במחסן! כל הכבוד חקלאי!' },
  fire:      { type: 'fire', srcSay: 'שריפה! עצור ליד הבית ולחץ על כפתור המים' },
  mixer:     { type: 'build', srcSay: 'אתר בנייה! עצור ולחץ על כפתור הבטון כדי לבנות' }
};

// ---------- עזרים ----------
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(pa >> 16, pb >> 16, t)), g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t)), bl = Math.round(lerp(pa & 255, pb & 255, t));
  return `rgb(${r},${g},${bl})`;
}
function biomeAt(x) {
  const idx = Math.max(0, Math.floor(x / SEG));
  const cur = BIOMES[idx % BIOMES.length];
  const prev = BIOMES[(idx + BIOMES.length - 1) % BIOMES.length];
  const t = idx === 0 ? 1 : Math.min(1, (x - idx * SEG) / TRANS);
  return { cur, prev, t, idx };
}
function terrain(x) {
  const b = biomeAt(x);
  const amp = lerp(b.prev.amp, b.cur.amp, b.t);
  return amp * (0.6 * Math.sin(x / 260) + 0.4 * Math.sin(x / 117 + 1.3));
}

// =========================================================
function stationDrive() {
  stationStart();
  setScreen(`
    <div class="scene drive">
      <canvas id="dc"></canvas>
      <div class="veh" id="veh"></div>
      <div class="cargo hidden" id="cargo"></div>
      <div class="biome-banner" id="banner"></div>
      <div class="hud">
        <div class="fuel" id="fuelBox"><span>⛽</span><div class="fuel-bar"><i id="fuelFill"></i></div></div>
        <button class="swap-btn" id="swap">🔄 רכב</button>
      </div>
      <div class="drive-hint hidden" id="dhint"></div>
      <div class="ctrl ctrl-right">
        <button class="pedal brake" id="brake"><b>✋</b><small>עצור</small></button>
        <button class="pedal gas" id="gas"><b>▲</b><small>סע</small></button>
      </div>
      <div class="ctrl ctrl-left">
        <button class="round-btn" id="horn">📯</button>
        <button class="round-btn special hidden" id="special">💦</button>
      </div>
      <div class="picker hidden" id="picker"></div>
    </div>`, 'screen-drive');

  const canvas = document.getElementById('dc');
  const ctx = canvas.getContext('2d');
  const vehEl = document.getElementById('veh');
  const cargoEl = document.getElementById('cargo');
  const banner = document.getElementById('banner');
  const hintEl = document.getElementById('dhint');
  const fuelFill = document.getElementById('fuelFill');
  const specialBtn = document.getElementById('special');
  const hornBtn = document.getElementById('horn');

  let W = 0, H = 0, S = 1, DPR = 1, roadBase = 0, R = 0;
  const g = {
    type: state.vehicle, cam: 650, v: 0, air: 0, vy: 0, tilt: 0,
    fuel: 1, gas: false, brake: false,
    chunks: new Map(), dyn: [], task: null, lastTaskX: 900,
    cargo: [], busy: false, siren: false, lastBiome: -1, tripStars: 0,
    particles: [], flakes: [], hits: [], warnedFuel: false, emptySaid: false, time: 0
  };

  // ---------- גודל מסך ----------
  function resize() {
    const r = app.getBoundingClientRect();
    W = r.width; H = r.height; DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    S = Math.min(W / 330, H / 400);   // במצב עומד – קצת זום כדי שהכול יהיה גדול
    roadBase = H * (W > H ? 0.66 : 0.64);
    R = 64 * S;
    const vw = 165 * S;
    vehEl.style.width = vw + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  const visW = () => W / S;
  const vehX = () => g.cam + (W * 0.28) / S;
  const sx = wx => (wx - g.cam) * S;
  const roadTop = wx => roadBase + terrain(wx) * S;

  function setVehicle(type) {
    g.type = type; state.vehicle = type; save();
    vehEl.innerHTML = vehicleSVG(type, state.colors[type]);
    const conf = TASKS[type];
    specialBtn.classList.toggle('hidden', !(conf.type === 'fire' || conf.type === 'build'));
    specialBtn.textContent = conf.type === 'fire' ? '💦' : '🧱';
    hornBtn.textContent = VEHICLES[type].sound === 'siren' ? '🚨' : '📯';
    if (g.siren) { g.siren = false; Sound.sirenLoop(false); }
    // משימה ישנה נמחקת
    g.dyn = g.dyn.filter(d => d.kind === 'gas');
    g.task = null; g.cargo = []; g.busy = false; g.lastTaskX = vehX() - 600;
    renderCargo();
  }
  setVehicle(g.type);

  function hint(text, ms = 3500) {
    hintEl.textContent = text;
    hintEl.classList.remove('hidden');
    clearTimeout(hint.t);
    hint.t = setTimeout(() => hintEl.classList.add('hidden'), ms);
  }
  function renderCargo() {
    cargoEl.textContent = g.cargo.join('');
    cargoEl.classList.toggle('hidden', g.cargo.length === 0);
  }

  // ---------- ייצור עצמים לפי קטעים ----------
  function makeChunk(ci) {
    const items = [];
    const x0 = ci * CHUNK;
    const b = biomeAt(x0 + CHUNK / 2);
    const bio = b.t < 0.5 ? b.prev : b.cur;
    const r1 = hash(ci), r2 = hash(ci + 0.37), r3 = hash(ci + 0.71), r4 = hash(ci + 0.13);
    if (x0 < 900) return items;   // התחלה נקייה
    if (bio.id === 'city' && ci % 6 === 3 && b.t === 1) {
      items.push({ kind: 'light', x: x0 + 90, state: 'idle' });
      return items;
    }
    // קישוט ברקע
    const d = bio.decor[Math.floor(r1 * bio.decor.length)];
    items.push({ kind: 'decor', x: x0 + 20 + r2 * 60, e: d[0], name: d[1], size: 48 + r3 * 34 });
    // חיה
    if (r4 < 0.55) {
      const a = bio.animals[Math.floor(r2 * bio.animals.length)];
      items.push({ kind: 'animal', x: x0 + 110 + r1 * 60, e: a[0], name: a[1], snd: a[2], size: 44 });
    }
    // כוכבים על הכביש
    if (r3 < 0.42) {
      const n = 1 + Math.floor(r1 * 3);
      for (let i = 0; i < n; i++) items.push({ kind: 'star', x: x0 + 40 + i * 42, high: r4 > 0.75 });
    } else if (r3 > 0.9 && bio.id !== 'city') {
      items.push({ kind: 'ramp', x: x0 + 60 });
      items.push({ kind: 'star', x: x0 + 150, high: true });
      items.push({ kind: 'star', x: x0 + 195, high: true });
    }
    if (g.type === 'sport' && r2 > 0.8 && bio.id !== 'city') items.push({ kind: 'ramp', x: x0 + 120 });
    return items;
  }
  function visibleItems() {
    const c0 = Math.floor((g.cam - 150) / CHUNK), c1 = Math.floor((g.cam + visW() + 250) / CHUNK);
    for (const k of g.chunks.keys()) if (k < c0 - 2) g.chunks.delete(k);
    const out = [];
    for (let c = c0; c <= c1; c++) {
      if (!g.chunks.has(c)) g.chunks.set(c, makeChunk(c));
      out.push(...g.chunks.get(c));
    }
    return out;
  }

  // ---------- משימות ----------
  function spawnTask() {
    const conf = TASKS[g.type];
    const x = g.cam + visW() + 260;
    if (conf.type === 'deliver') {
      const n = conf.min + Math.floor(Math.random() * (conf.max - conf.min + 1));
      const items = Array.from({ length: n }, (_, i) => conf.items[i % conf.items.length]);
      g.task = { kind: 'src', x, items, conf, announced: false };
    } else if (conf.type === 'fire') {
      g.task = { kind: 'fire', x, flames: 3, conf, announced: false };
    } else {
      g.task = { kind: 'build', x, floors: 0, target: 3, conf, announced: false };
    }
    g.dyn.push(g.task);
  }

  function nearStopped(x, range = 130) {
    return Math.abs(x - vehX()) < range && g.v < 30 && g.air === 0;
  }

  function celebrate(msg) {
    state.stars += 3; save(); updateStars();
    Sound.play('win'); confetti();
    Sound.say(`כל הכבוד ${PLAYER_NAME}! ${msg}`);
    hint('⭐⭐⭐ ' + msg, 4000);
  }

  function updateTask() {
    const t = g.task;
    if (!t) {
      if (vehX() - g.lastTaskX > 1300) spawnTask();
      return;
    }
    const dist = t.x - vehX();
    if (!t.announced && dist < 520) {
      t.announced = true;
      const say = t.kind === 'dest' ? `הנה ${t.conf.destName}! עצור שם` : t.conf.srcSay;
      Sound.say(say); hint(say);
    }
    // עברנו בלי לעצור – המשימה מחכה קצת קדימה
    if (dist < -260 && !g.busy) {
      t.x = vehX() + visW() + 200; t.announced = false;
      if (t.kind === 'src') t.announced = false;
      return;
    }
    if (g.busy) return;

    if (t.kind === 'src' && nearStopped(t.x)) {
      g.busy = true;
      let i = 0;
      const step = () => {
        if (t.items.length === 0) {
          g.busy = false;
          g.dyn = g.dyn.filter(d => d !== t);
          const dest = { kind: 'dest', x: vehX() + 1150, conf: t.conf, announced: false };
          g.task = dest; g.dyn.push(dest);
          Sound.say(t.conf.carrySay); hint(t.conf.carrySay);
          if (t.conf.siren && !g.siren) { g.siren = true; Sound.sirenLoop(true); }
          return;
        }
        g.cargo.push(t.items.shift()); i++;
        renderCargo(); Sound.play('door');
        Sound.say(t.conf.count[i] || '', { rate: 0.9 });
        later(step, 750);
      };
      Sound.play('door');
      later(step, 400);
    } else if (t.kind === 'dest' && nearStopped(t.x, 150)) {
      g.busy = true;
      const step = () => {
        if (g.cargo.length === 0) {
          g.busy = false;
          g.dyn = g.dyn.filter(d => d !== t);
          g.task = null; g.lastTaskX = vehX();
          if (g.siren) { g.siren = false; Sound.sirenLoop(false); }
          celebrate(t.conf.doneSay);
          return;
        }
        g.cargo.pop(); renderCargo(); Sound.play('pop');
        later(step, 450);
      };
      step();
    } else if ((t.kind === 'fire' || t.kind === 'build') && Math.abs(dist) < 160) {
      specialBtn.classList.add('pulse');
    } else {
      specialBtn.classList.remove('pulse');
    }
  }

  function doSpecial() {
    const t = g.task;
    if (!t || !(t.kind === 'fire' || t.kind === 'build')) {
      Sound.play(g.type === 'fire' ? 'water' : 'brick');
      if (g.type === 'fire') sprayTo(vehX() + 200, roadTop(vehX() + 200) - 60 * S);
      return;
    }
    if (!nearStopped(t.x, 170)) {
      Sound.say(t.kind === 'fire' ? 'צריך לעצור ליד הבית' : 'צריך לעצור ליד אתר הבנייה');
      if (t.kind === 'fire') { Sound.play('water'); sprayTo(vehX() + 200, roadTop(vehX() + 200) - 60 * S); }
      return;
    }
    if (t.kind === 'fire' && t.flames > 0) {
      Sound.play('water');
      sprayTo(t.x, roadTop(t.x) - 55 * S);
      t.flames--;
      const n = 3 - t.flames;
      Sound.say(NUM_F[n], { rate: 0.9 });
      if (t.flames === 0) {
        g.dyn = g.dyn.filter(d => d !== t); g.task = null; g.lastTaskX = vehX();
        specialBtn.classList.remove('pulse');
        setTimeout(() => celebrate('כיבית את השריפה!'), 700);
        g.dyn.push({ kind: 'decor-dyn', x: t.x, e: '🏠', name: 'בית', size: 90 });
      }
    } else if (t.kind === 'build' && t.floors < t.target) {
      t.floors++;
      Sound.play('brick');
      for (let i = 0; i < 8; i++) g.particles.push({ x: t.x - 20 + Math.random() * 40, y: roadTop(t.x) - (20 + t.floors * 30) * S, vx: (Math.random() - .5) * 60, vy: -Math.random() * 80, life: 0.8, c: '#BDBDBD', r: 4 });
      Sound.say(`קומה ${NUM_F[t.floors]}`);
      if (t.floors === t.target) {
        g.task = null; g.lastTaskX = vehX();
        t.kind = 'built';
        specialBtn.classList.remove('pulse');
        setTimeout(() => celebrate('בנית בניין של שלוש קומות!'), 700);
      }
    }
  }

  function sprayTo(wx, sy) {
    const vx0 = vehX() + 70, y0 = roadTop(vehX()) - 70 * S - g.air * S;
    for (let i = 0; i < 26; i++) {
      const k = i / 26;
      g.particles.push({
        x: lerp(vx0, wx, k), y: lerp(y0, sy, k) - Math.sin(k * Math.PI) * 40 * S,
        vx: 0, vy: 20, life: 0.25 + k * 0.5, c: '#4FC3F7', r: 5 + Math.random() * 3
      });
    }
  }

  // ---------- תחנת דלק + רמזורים ----------
  function updateGas(dt) {
    let gas = g.dyn.find(d => d.kind === 'gas');
    if (!gas && g.fuel < 0.35) {
      gas = { kind: 'gas', x: g.cam + visW() + 300, filling: false };
      g.dyn.push(gas);
    }
    if (g.fuel < 0.25 && !g.warnedFuel) { g.warnedFuel = true; Sound.say('הדלק כמעט נגמר! צריך לעצור בתחנת דלק'); hint('⛽ הדלק כמעט נגמר – עצור בתחנת הדלק'); }
    if (g.fuel <= 0 && !g.emptySaid) { g.emptySaid = true; Sound.say('אוי, נגמר הדלק! נוסעים לאט עד התחנה'); }
    if (!gas) return;
    if (!gas.filling && gas.done !== true && nearStopped(gas.x, 120)) {
      gas.filling = true;
      Sound.play('glug'); Sound.say('מתדלקים... גלוּג גלוּג');
    }
    if (gas.filling) {
      g.fuel = Math.min(1, g.fuel + 0.6 * dt);
      if (g.fuel >= 1) { gas.filling = false; gas.done = true; g.warnedFuel = false; g.emptySaid = false; Sound.say('המיכל מלא! אפשר לנסוע'); hint('⛽ המיכל מלא!'); state.stars++; save(); updateStars(); }
    }
    if (gas.x < g.cam - 300) g.dyn = g.dyn.filter(d => d !== gas);
  }

  function updateLight(it, dt) {
    const front = vehX() + 75;
    const d = it.x - front;
    if (it.state === 'idle' && d < 560 && d > 0) {
      it.state = 'red';
      Sound.say('רמזור אדום! צריך לעצור'); hint('🚦 רמזור אדום – עוצרים!');
    }
    if (it.state === 'red') {
      if (g.v < 12 && d > -10 && d < 300) {
        it.wait = (it.wait || 0) + dt;
        if (it.wait > 1.6) { it.state = 'green'; Sound.say('יופי שעצרת! ירוק, נוסעים!'); hint('🟢 ירוק – נוסעים!'); state.stars++; save(); updateStars(); Sound.play('star'); }
      } else if (d < -5) {
        it.state = 'green'; Sound.play('oops'); Sound.say('אופס, עברנו באדום! בפעם הבאה עוצרים');
      }
    }
  }

  // ---------- לולאת המשחק ----------
  let last = performance.now(), raf = 0, frameTick = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    g.time += dt;
    update(dt);
    render();
    raf = requestAnimationFrame(frame);
  }

  function update(dt) {
    const max = MAX_SPEED[g.type] * (g.fuel <= 0 ? 0.35 : 1);
    if (g.brake) g.v = Math.max(0, g.v - 520 * dt);
    else if (g.gas) g.v = Math.min(max, g.v + max * 0.85 * dt);
    else g.v = Math.max(0, g.v - 95 * dt);
    if (g.v > max) g.v = Math.max(max, g.v - 300 * dt);

    const prevX = vehX();
    g.cam += g.v * dt;
    const vx = vehX();
    g.fuel = Math.max(0, g.fuel - g.v * dt / 7500);

    // קפיצה
    if (g.air > 0 || g.vy > 0) {
      g.vy -= 1250 * dt;
      g.air += g.vy * dt;
      if (g.air <= 0) {
        g.air = 0;
        if (g.vy < -250) { Sound.play('land'); vehEl.classList.remove('squash'); void vehEl.offsetWidth; vehEl.classList.add('squash'); }
        g.vy = 0;
      }
    }

    const items = visibleItems();
    for (const it of items) {
      if (it.kind === 'star' && !it.got && Math.abs(it.x - (vx + 20)) < 50) {
        const starY = it.high ? 95 : 40;
        if (!it.high || g.air > 25) {
          it.got = g.time;
          g.tripStars++; state.stars++; save(); updateStars();
          Sound.play('star');
          for (let i = 0; i < 10; i++) g.particles.push({ x: it.x, y: roadTop(it.x) - starY * S, vx: (Math.random() - .5) * 160, vy: (Math.random() - .5) * 160, life: 0.6, c: '#FFD23F', r: 4 });
          if (g.tripStars <= 10) Sound.say(NUM_M[g.tripStars], { rate: 1 });
          else if (g.tripStars % 10 === 0) Sound.say(`וואו! ${g.tripStars} כוכבים!`);
        }
      }
      if (it.kind === 'ramp' && !it.used && prevX + 40 < it.x + 70 && vx + 40 >= it.x + 70) {
        it.used = true;
        if (g.v > MAX_SPEED[g.type] * 0.35) {
          g.vy = g.v * 1.75; g.air = 1;
          Sound.play('boing');
          if (Math.random() < 0.5) Sound.say(pick(['וואו! קפיצה!', 'עפים!', 'יהוּ!']));
        }
      }
      if (it.kind === 'light') updateLight(it, dt);
    }

    updateGas(dt);
    updateTask();
    g.dyn = g.dyn.filter(d => d === g.task || d.kind === 'gas' || d.x > g.cam - 400);

    // מעבר נוף
    const b = biomeAt(vx);
    if (b.idx !== g.lastBiome) {
      if (g.lastBiome !== -1) {
        Sound.say(b.cur.say);
      }
      banner.textContent = `${b.cur.icon} ${b.cur.name}`;
      banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
      g.lastBiome = b.idx;
    }

    // חלקיקים
    for (const p of g.particles) { p.life -= dt; p.x += p.vx * dt / S; p.y += p.vy * dt; }
    g.particles = g.particles.filter(p => p.life > 0);
    // עשן מהאגזוז
    if (g.gas && g.v > 10 && Math.random() < 0.3) {
      g.particles.push({ x: vx - 80, y: roadTop(vx) - 18 * S - g.air * S, vx: -40, vy: -25, life: 0.7, c: 'rgba(200,200,200,.6)', r: 6 });
    }

    // מנוע + דלק בתצוגה
    Sound.engine(g.v / MAX_SPEED.sport);
    fuelFill.style.width = (g.fuel * 100) + '%';
    fuelFill.style.background = g.fuel < 0.25 ? '#E53935' : g.fuel < 0.5 ? '#FDD835' : '#43A047';
  }

  // ---------- ציור ----------
  function emoji(e, x, yBottom, size, scale = 1) {
    ctx.save();
    ctx.translate(x, yBottom);
    ctx.scale(scale, scale);
    ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(e, 0, 0);
    ctx.restore();
  }

  function drawFar(type, alpha, base) {
    if (alpha <= 0.01) return;
    ctx.save(); ctx.globalAlpha = alpha;
    const p = 0.3, ox = g.cam * p, span = W / S;
    const FS = W < H ? 1.8 : 1;   // במצב עומד – נוף רחוק גבוה יותר
    if (type === 'skyline') {
      const bw = 46;
      for (let i = Math.floor(ox / bw) - 1; i < (ox + span) / bw + 1; i++) {
        const h = (60 + hash(i) * 120) * FS, x = (i * bw - ox) * S, w = (bw - 6) * S;
        ctx.fillStyle = ['#90A4AE', '#B0BEC5', '#78909C', '#9FA8DA'][Math.floor(hash(i + 3) * 4)];
        ctx.fillRect(x, base - h * S, w, h * S);
        ctx.fillStyle = 'rgba(255,241,118,.8)';
        for (let wy = 10; wy < h - 10; wy += 18) for (let wx = 6; wx < bw - 14; wx += 12)
          if (hash(i * 31 + wy + wx) > 0.4) ctx.fillRect(x + wx * S, base - (h - wy) * S, 5 * S, 7 * S);
      }
    } else if (type === 'hills' || type === 'trees') {
      ctx.fillStyle = type === 'hills' ? '#A5D6A7' : '#81C784';
      ctx.beginPath(); ctx.moveTo(0, base);
      for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, base - (45 + 28 * Math.sin((ox + x / S) / 120) + 14 * Math.sin((ox + x / S) / 47)) * S * FS);
      ctx.lineTo(W, base); ctx.fill();
      if (type === 'trees') {
        const tw = 26;
        ctx.fillStyle = '#2E7D32';
        for (let i = Math.floor(ox / tw) - 1; i < (ox + span) / tw + 1; i++) {
          const x = (i * tw - ox) * S, h = (50 + hash(i) * 40) * S * FS;
          const by = base - (20 + 10 * Math.sin((i * tw) / 120)) * S * FS;
          ctx.beginPath(); ctx.moveTo(x, by - h); ctx.lineTo(x - 14 * S, by); ctx.lineTo(x + 14 * S, by); ctx.fill();
        }
      } else {
        ctx.fillStyle = '#81C784';
        ctx.beginPath(); ctx.moveTo(0, base);
        for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, base - (22 + 16 * Math.sin((ox * 1.4 + x / S) / 90 + 2)) * S);
        ctx.lineTo(W, base); ctx.fill();
      }
    } else if (type === 'sea') {
      const top = base - 70 * S * FS;
      const gr = ctx.createLinearGradient(0, top, 0, base);
      gr.addColorStop(0, '#29B6F6'); gr.addColorStop(1, '#0288D1');
      ctx.fillStyle = gr; ctx.fillRect(0, top, W, base - top);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2 * S;
      for (let row = 0; row < 3; row++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const y = top + (16 + row * 18) * S + Math.sin((x / S + ox * (1 + row * .3) + g.time * 40) / 14) * 2.5 * S;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (let i = Math.floor(ox / 300) - 1; i < (ox + span) / 300 + 1; i++) {
        const x = (i * 300 + hash(i) * 120 - ox) * S;
        emoji(hash(i + 9) > 0.5 ? '⛵' : '🚤', x, top + 30 * S + Math.sin(g.time * 2 + i) * 3 * S, 30 * S);
      }
    } else if (type === 'dunes') {
      [['#F6C177', 0.25, 60], ['#EDB25E', 0.45, 34]].forEach(([c, pp, hgt]) => {
        const o = g.cam * pp;
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, base);
        for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, base - (hgt + hgt * 0.6 * Math.sin((o + x / S) / 70)) * S * FS);
        ctx.lineTo(W, base); ctx.fill();
      });
    } else if (type === 'mountains') {
      const mw = 150;
      for (let i = Math.floor(ox / mw) - 1; i < (ox + span) / mw + 2; i++) {
        const x = (i * mw - ox) * S, h = (110 + hash(i) * 90) * S * FS, w = 100 * S * (FS > 1 ? 1.3 : 1);
        ctx.fillStyle = '#90A4AE';
        ctx.beginPath(); ctx.moveTo(x, base - h); ctx.lineTo(x - w, base); ctx.lineTo(x + w, base); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.moveTo(x, base - h); ctx.lineTo(x - w * 0.32, base - h * 0.68); ctx.lineTo(x - w * 0.1, base - h * 0.74); ctx.lineTo(x + w * 0.1, base - h * 0.66); ctx.lineTo(x + w * 0.32, base - h * 0.68); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawLight(it, x, y) {
    ctx.fillStyle = '#455A64'; ctx.fillRect(x - 3 * S, y - 110 * S, 6 * S, 110 * S);
    ctx.fillStyle = '#263238';
    roundRect(x - 13 * S, y - 160 * S, 26 * S, 62 * S, 6 * S); ctx.fill();
    const lamps = [['red', '#FF1744', 0], ['yellow', '#FFEA00', 1], ['green', '#00E676', 2]];
    const on = it.state === 'red' ? 'red' : it.state === 'green' ? 'green' : 'green';
    lamps.forEach(([n, c, i]) => {
      ctx.globalAlpha = n === on ? 1 : 0.22;
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y - (148 - i * 19) * S, 7.5 * S, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const vx = vehX();
    const b = biomeAt(g.cam + visW() / 2);
    const mix = (k) => lerpColor(b.prev[k], b.cur[k], b.t);
    // שמיים
    const sky = ctx.createLinearGradient(0, 0, 0, roadBase);
    sky.addColorStop(0, lerpColor(b.prev.sky[0], b.cur.sky[0], b.t));
    sky.addColorStop(1, lerpColor(b.prev.sky[1], b.cur.sky[1], b.t));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // שמש
    const desert = (b.cur.id === 'desert' ? b.t : 0) + (b.prev.id === 'desert' ? 1 - b.t : 0);
    ctx.fillStyle = 'rgba(255,210,63,.3)'; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.12, (34 + desert * 16) * S * 1.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFD23F'; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.12, (34 + desert * 16) * S, 0, 7); ctx.fill();
    // עננים
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    const co = g.cam * 0.1 + g.time * 6;
    for (let i = Math.floor(co / 220) - 1; i < (co + visW()) / 220 + 1; i++) {
      const x = (i * 220 + hash(i) * 90 - co) * S, y = (H * 0.16) + hash(i + 5) * H * 0.16;
      [[0, 0, 22], [22, -8, 18], [42, 2, 16], [-20, 4, 14]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * S, y + dy * S, r * S, 0, 7); ctx.fill(); });
    }
    // שכבה רחוקה
    const farBase = roadBase - 55 * S;
    if (b.prev.far !== b.cur.far) drawFar(b.prev.far, 1 - b.t, farBase);
    drawFar(b.cur.far, b.prev.far !== b.cur.far ? b.t : 1, farBase);

    // אדמה מאחורי הכביש
    ctx.fillStyle = mix('ground');
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 8; x += 8) {
      const wx = g.cam + x / S;
      ctx.lineTo(x, Math.min(roadTop(wx), farBase + (6 * Math.sin((g.cam * 0.6 + x / S) / 90)) * S));
    }
    ctx.lineTo(W, H); ctx.fill();

    // עצמים מאחורי הכביש
    g.hits = [];
    const items = visibleItems().concat(g.dyn);
    items.sort((a, c) => a.x - c.x);
    for (const it of items) {
      const x = sx(it.x);
      if (x < -150 || x > W + 150) continue;
      const y = roadTop(it.x) + 3 * S;
      if (it.kind === 'decor' || it.kind === 'animal' || it.kind === 'decor-dyn') {
        let sc = 1, lift = 0;
        if (it.bounce) { const k = (g.time - it.bounce); if (k < 0.5) { sc = 1 + Math.sin(k / 0.5 * Math.PI) * 0.35; lift = Math.sin(k / 0.5 * Math.PI) * 12 * S; } }
        if (it.kind === 'animal') lift += Math.abs(Math.sin(g.time * 3 + it.x)) * 2 * S;
        const size = it.size * S;
        emoji(it.e, x, y - lift, size, sc);
        g.hits.push({ x0: x - size * 0.55, x1: x + size * 0.55, y0: y - size * 1.1, y1: y, it });
      } else if (it.kind === 'light') {
        drawLight(it, x, y - 2 * S);
      } else if (it.kind === 'gas') {
        ctx.fillStyle = '#E53935'; roundRect(x - 60 * S, y - 118 * S, 120 * S, 18 * S, 4 * S); ctx.fill();
        ctx.fillStyle = '#ECEFF1'; ctx.fillRect(x - 52 * S, y - 100 * S, 8 * S, 100 * S); ctx.fillRect(x + 44 * S, y - 100 * S, 8 * S, 100 * S);
        ctx.fillStyle = '#fff'; ctx.font = `bold ${12 * S}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('דלק', x, y - 109 * S);
        emoji('⛽', x, y, 58 * S, it.filling ? 1 + Math.sin(g.time * 12) * 0.05 : 1);
        g.hits.push({ x0: x - 40 * S, x1: x + 40 * S, y0: y - 70 * S, y1: y, it: { name: 'תחנת דלק', e: '⛽' } });
      } else if (it.kind === 'src') {
        if (it.conf.items[0] === '🧒') emoji('🚏', x - 50 * S, y, 60 * S);
        if (it.conf.items[0] === '📦') emoji('🏭', x - 55 * S, y, 70 * S);
        it.items.forEach((e, i) => emoji(e, x + (i - (it.items.length - 1) / 2) * 30 * S, y - Math.abs(Math.sin(g.time * 4 + i)) * 6 * S, 40 * S));
        if (!g.busy) emoji('⬇️', x, y - 60 * S - Math.abs(Math.sin(g.time * 3)) * 8 * S, 26 * S);
      } else if (it.kind === 'dest') {
        emoji(it.conf.destIcon, x, y, 96 * S);
        emoji('⬇️', x, y - 105 * S - Math.abs(Math.sin(g.time * 3)) * 8 * S, 26 * S);
      } else if (it.kind === 'fire') {
        emoji('🏠', x, y, 96 * S);
        const spots = [[-26, -60], [24, -70], [0, -95]];
        for (let i = 0; i < it.flames; i++) emoji('🔥', x + spots[i][0] * S, y + spots[i][1] * S + 30 * S, (34 + Math.sin(g.time * 10 + i) * 4) * S);
        if (Math.random() < 0.3) g.particles.push({ x: it.x + (Math.random() - .5) * 40, y: y - 110 * S, vx: 10, vy: -40, life: 1.2, c: 'rgba(120,120,120,.45)', r: 8 });
      } else if (it.kind === 'build' || it.kind === 'built') {
        emoji('🏗️', x - 50 * S, y, 80 * S);
        for (let f = 0; f < it.floors; f++) {
          ctx.fillStyle = ['#FFB74D', '#4FC3F7', '#AED581'][f % 3];
          ctx.fillRect(x - 28 * S, y - (f + 1) * 30 * S, 56 * S, 28 * S);
          ctx.fillStyle = '#fff';
          ctx.fillRect(x - 20 * S, y - (f + 1) * 30 * S + 7 * S, 12 * S, 12 * S);
          ctx.fillRect(x + 8 * S, y - (f + 1) * 30 * S + 7 * S, 12 * S, 12 * S);
        }
        if (it.floors === it.target) { ctx.fillStyle = '#E53935'; ctx.beginPath(); ctx.moveTo(x - 34 * S, y - 90 * S); ctx.lineTo(x, y - 115 * S); ctx.lineTo(x + 34 * S, y - 90 * S); ctx.fill(); }
        else ctx.strokeStyle = 'rgba(255,255,255,.9)', ctx.setLineDash([6 * S, 5 * S]), ctx.lineWidth = 2 * S,
          ctx.strokeRect(x - 28 * S, y - (it.floors + 1) * 30 * S, 56 * S, 28 * S), ctx.setLineDash([]);
      }
    }

    // כביש
    const snowy = (b.cur.id === 'snow' ? b.t : 0) + (b.prev.id === 'snow' ? 1 - b.t : 0);
    ctx.fillStyle = snowy > 0.5 ? '#6B7380' : '#4A4F5A';
    ctx.beginPath();
    for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, roadTop(g.cam + x / S));
    for (let x = W + 8; x >= 0; x -= 8) ctx.lineTo(x, roadTop(g.cam + x / S) + R);
    ctx.fill();
    ctx.strokeStyle = '#9AA1AD'; ctx.lineWidth = 4 * S; ctx.beginPath();
    for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, roadTop(g.cam + x / S));
    ctx.stroke();
    // פסים
    ctx.strokeStyle = '#FFD23F'; ctx.lineWidth = 4 * S; ctx.lineCap = 'round';
    for (let d = Math.floor(g.cam / 60) * 60; d < g.cam + visW() + 60; d += 60) {
      ctx.beginPath(); ctx.moveTo(sx(d), roadTop(d) + R * 0.5); ctx.lineTo(sx(d + 28), roadTop(d + 28) + R * 0.5); ctx.stroke();
    }
    // אדמה מלפנים
    ctx.fillStyle = mix('front');
    ctx.beginPath();
    for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, roadTop(g.cam + x / S) + R);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();

    // עצמים על הכביש
    for (const it of items) {
      const x = sx(it.x);
      if (x < -100 || x > W + 100) continue;
      const y = roadTop(it.x);
      if (it.kind === 'star' && (!it.got || g.time - it.got < 0.4)) {
        const k = it.got ? (g.time - it.got) / 0.4 : 0;
        const sy = y + R * 0.5 - (it.high ? 95 : 40) * S - k * 50 * S + Math.sin(g.time * 4 + it.x) * 4 * S;
        ctx.globalAlpha = 1 - k;
        emoji('⭐', x, sy, 30 * S * (1 + k));
        ctx.globalAlpha = 1;
      } else if (it.kind === 'ramp') {
        const x2 = sx(it.x + 70), yb = y + R * 0.62;
        ctx.fillStyle = '#FFB300';
        ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x2, yb - 26 * S); ctx.lineTo(x2, yb); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#E65100'; ctx.lineWidth = 3 * S; ctx.stroke();
      } else if (it.kind === 'light') {
        ctx.fillStyle = '#fff'; ctx.fillRect(x + 6 * S, y + 4 * S, 7 * S, R - 8 * S);
      }
    }

    // חלקיקים
    for (const p of g.particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(sx(p.x), p.y, p.r * S, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // שלג
    if (snowy > 0.05) {
      while (g.flakes.length < 60) g.flakes.push({ x: Math.random() * W, y: Math.random() * H, s: 1 + Math.random() * 2.5 });
      ctx.fillStyle = `rgba(255,255,255,${snowy})`;
      for (const f of g.flakes) {
        f.y += f.s * 0.8; f.x -= g.v * 0.004 * f.s + 0.2;
        if (f.y > H) { f.y = -5; f.x = Math.random() * W; }
        if (f.x < 0) f.x += W;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.s * S * 1.2, 0, 7); ctx.fill();
      }
    }

    // רכב
    const vw = 165 * S, vh = vw * 126 / 200;
    const yRoad = roadTop(vx) + R * 0.62;
    let ang = Math.atan2(roadTop(vx + 40) - roadTop(vx - 40), 80 * S);
    // על רמפה
    const ramp = items.find(it => it.kind === 'ramp' && vx + 40 > it.x && vx + 40 < it.x + 70);
    let rampLift = 0;
    if (ramp && g.air === 0) { rampLift = ((vx + 40 - ramp.x) / 70) * 26; ang -= 0.32; }
    if (g.air > 0) ang = lerp(g.tilt, -0.12 + (g.vy < 0 ? 0.18 : 0), 0.1);
    g.tilt = ang;
    const shake = g.v > 5 && g.air === 0 ? Math.sin(g.time * 30) * 0.8 * (g.v / 200) : 0;
    const top = yRoad - vh * (117 / 126) - (g.air + rampLift) * S + shake;
    vehEl.style.transform = `translate(${W * 0.28 - vw / 2}px, ${top}px) rotate(${ang}rad)`;
    vehEl.classList.toggle('driving', g.v > 4);
    vehEl.style.setProperty('--spin', Math.max(0.12, 1.2 - g.v / 220) + 's');
    cargoEl.style.transform = `translate(${W * 0.28}px, ${top - 34 * S}px) translateX(-50%)`;
  }

  // ---------- שליטה ----------
  function hold(btn, key) {
    const on = e => { e.preventDefault(); Sound.unlock(); g[key] = true; btn.classList.add('down'); };
    const off = e => { e && e.preventDefault(); g[key] = false; btn.classList.remove('down'); };
    btn.addEventListener('pointerdown', on);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, off));
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }
  hold(document.getElementById('gas'), 'gas');
  hold(document.getElementById('brake'), 'brake');

  hornBtn.onclick = () => {
    Sound.unlock();
    if (VEHICLES[g.type].sound === 'siren') {
      g.siren = !g.siren; Sound.sirenLoop(g.siren);
      hornBtn.classList.toggle('active', g.siren);
    } else {
      Sound.play(VEHICLES[g.type].sound);
    }
    vehEl.classList.remove('honk'); void vehEl.offsetWidth; vehEl.classList.add('honk');
  };
  specialBtn.onclick = () => { Sound.unlock(); doSpecial(); };
  vehEl.onclick = () => { Sound.play(VEHICLES[g.type].sound === 'siren' ? 'honk' : VEHICLES[g.type].sound); Sound.say(VEHICLES[g.type].name); };

  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    for (let i = g.hits.length - 1; i >= 0; i--) {
      const h = g.hits[i];
      if (px >= h.x0 && px <= h.x1 && py >= h.y0 && py <= h.y1) {
        h.it.bounce = g.time;
        Sound.play('pop');
        Sound.say(h.it.snd ? `${h.it.name}! ${h.it.snd}` : h.it.name);
        return;
      }
    }
  });

  const keys = e => {
    const down = e.type === 'keydown';
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') g.gas = down;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') g.brake = down;
    if (down && e.key === ' ') hornBtn.onclick();
  };
  window.addEventListener('keydown', keys);
  window.addEventListener('keyup', keys);

  // ---------- החלפת רכב ----------
  const picker = document.getElementById('picker');
  document.getElementById('swap').onclick = () => {
    Sound.play('tap');
    picker.innerHTML = `<div class="picker-card"><div class="picker-title">באיזה רכב נוסעים?</div><div class="picker-grid">${
      Object.keys(VEHICLES).map(k => `<button class="garage-card ${k === g.type ? 'selected' : ''}" data-v="${k}">${vehicleSVG(k, state.colors[k])}<span>${VEHICLES[k].name}</span></button>`).join('')
    }</div></div>`;
    picker.classList.remove('hidden');
    picker.querySelectorAll('.garage-card').forEach(b => b.onclick = ev => {
      ev.stopPropagation();
      setVehicle(b.dataset.v);
      Sound.play(VEHICLES[b.dataset.v].sound === 'siren' ? 'siren1' : VEHICLES[b.dataset.v].sound);
      Sound.say(`נוסעים ב${VEHICLES[b.dataset.v].name}!`);
      picker.classList.add('hidden');
    });
    picker.onclick = () => picker.classList.add('hidden');
  };

  // ---------- התחלה + ניקוי ----------
  // לבדיקות: ?x=7000 מתחיל במקום אחר בדרך, ?auto=1 נוסע לבד
  const qs = new URLSearchParams(location.search);
  if (qs.get('x')) { g.cam = +qs.get('x'); g.lastTaskX = vehX() - 1200; }
  if (qs.get('auto')) g.gas = true;
  if (qs.get('v') && VEHICLES[qs.get('v')]) setVehicle(qs.get('v'));
  if (qs.get('fuel')) g.fuel = +qs.get('fuel');
  later(() => Sound.say(`${PLAYER_NAME} על ההגה! לחץ על הדוושה הירוקה כדי לנסוע`), 400);
  hint('לחץ והחזק את ▲ כדי לנסוע', 4500);
  raf = requestAnimationFrame(frame);

  screenCleanup = () => {
    cancelAnimationFrame(raf);
    Sound.engineStop(); Sound.sirenLoop(false);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', keys);
    window.removeEventListener('keyup', keys);
    clearTimeout(hint.t);
  };
}
