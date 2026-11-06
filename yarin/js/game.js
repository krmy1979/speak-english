// =========================================================
//  ירין על ההגה – מנוע המשחק
//  מסכים: פתיחה → מוסך → מפה → 4 תחנות
// =========================================================

const PLAYER_NAME = 'ירין';   // אפשר לשנות לשם של כל ילד

const app = document.getElementById('app');
const btnHome = document.getElementById('btnHome');
const btnMute = document.getElementById('btnMute');
const starsBox = document.getElementById('stars');
const starCount = document.getElementById('starCount');

// ---------- שמירה (בטוחה – לא נשבר אם אין אחסון) ----------
const state = load();
function load() {
  const def = { vehicle: 'car', colors: {}, stars: 0 };
  try { return Object.assign(def, JSON.parse(localStorage.getItem('yarin-game') || '{}')); }
  catch (e) { return def; }
}
function save() {
  try { localStorage.setItem('yarin-game', JSON.stringify(state)); } catch (e) { /* לא נורא */ }
}
function myColor() { return state.colors[state.vehicle] || VEHICLES[state.vehicle].color; }
function myVehicleSVG() { return vehicleSVG(state.vehicle, myColor()); }

// ---------- עזרים ----------
const COLORS = [
  { name: 'אדום',  hex: '#E53935' },
  { name: 'כחול',  hex: '#1E88E5' },
  { name: 'צהוב',  hex: '#FDD835' },
  { name: 'ירוק',  hex: '#43A047' },
  { name: 'כתום',  hex: '#FB8C00' },
  { name: 'סגול',  hex: '#8E24AA' },
  { name: 'ורוד',  hex: '#F06292' }
];
const NUM_F = ['אפס', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע'];  // לבנה, להבה – נקבה
const PRAISE = ['כל הכבוד!', 'מצוין!', 'יופי!', 'וואו, איזה אלוף!', 'נהדר!'];

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
const wait = ms => new Promise(r => setTimeout(r, ms));

let timers = [];
let screenCleanup = null;   // מסך הנסיעה רושם כאן פונקציית ניקוי
function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
function clearTimers() { timers.forEach(clearTimeout); timers = []; }

function setScreen(html, cls = '') {
  clearTimers();
  if (screenCleanup) { screenCleanup(); screenCleanup = null; }
  app.className = cls;
  app.innerHTML = html;
}

function sceneBg(extra = '') {
  return `
    <div class="sky">
      <div class="sun"></div>
      <div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div>
    </div>
    <div class="hills"></div>
    <div class="road"><div class="road-line"></div></div>
    ${extra}`;
}

function updateStars() { starCount.textContent = state.stars; }

// ---------- כפתורים קבועים ----------
btnHome.addEventListener('click', () => { Sound.play('tap'); showMap(); });
btnMute.addEventListener('click', () => {
  const m = Sound.toggleMute();
  btnMute.textContent = m ? '🔇' : '🔊';
});

// ---------- קונפטי + פרס ----------
function confetti() {
  const box = document.getElementById('confetti');
  const cols = ['#E53935', '#1E88E5', '#FDD835', '#43A047', '#FB8C00', '#8E24AA', '#F06292'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = pick(cols);
    p.style.animationDelay = Math.random() * 0.5 + 's';
    p.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
    p.style.transform = `rotate(${rand(0, 360)}deg)`;
    box.appendChild(p);
    setTimeout(() => p.remove(), 3800);
  }
}

function winStation(again) {
  state.stars++;
  save();
  updateStars();
  Sound.play('win');
  confetti();
  later(() => Sound.say(`כל הכבוד ${PLAYER_NAME}! קיבלת כוכב!`), 500);
  const ov = document.createElement('div');
  ov.className = 'win-overlay';
  ov.innerHTML = `
    <div class="win-card">
      <div class="big-star">⭐</div>
      <div class="win-title">כל הכבוד ${PLAYER_NAME}!</div>
      <div class="win-btns">
        <button class="btn btn-green" id="wAgain">🔁 עוד פעם</button>
        <button class="btn btn-blue" id="wMap">🗺️ למפה</button>
      </div>
    </div>`;
  app.appendChild(ov);
  ov.querySelector('#wAgain').onclick = () => { Sound.play('tap'); again(); };
  ov.querySelector('#wMap').onclick = () => { Sound.play('tap'); showMap(); };
}

// =========================================================
//  מסך פתיחה
// =========================================================
function showTitle() {
  btnHome.classList.add('hidden');
  starsBox.classList.add('hidden');
  setScreen(`
    <div class="scene title-screen">
      ${sceneBg()}
      <div class="title-box">
        <img src="icons/icon.svg" class="title-icon" alt="ירין על ההגה">
        <h1 class="title-text">${PLAYER_NAME} על ההגה</h1>
        <button class="btn btn-big btn-green pulse" id="play">▶ יוצאים לדרך!</button>
      </div>
      <div class="drive-by">${vehicleSVG('fire')}</div>
    </div>`, 'screen-title');

  document.getElementById('play').onclick = () => {
    Sound.unlock();
    Sound.play('vroom');
    later(() => Sound.say(`שלום ${PLAYER_NAME}! בוא נבחר רכב`), 300);
    showGarage();
  };
}

// =========================================================
//  מוסך – בוחרים רכב
// =========================================================
function showGarage() {
  btnHome.classList.add('hidden');
  starsBox.classList.remove('hidden');
  updateStars();
  const cards = Object.keys(VEHICLES).map(k => `
    <button class="garage-card ${state.vehicle === k ? 'selected' : ''}" data-v="${k}">
      ${vehicleSVG(k, state.colors[k])}
      <span>${VEHICLES[k].name}</span>
    </button>`).join('');

  setScreen(`
    <div class="scene garage">
      <div class="garage-title">🛠️ המוסך של ${PLAYER_NAME}</div>
      <div class="garage-grid">${cards}</div>
      <button class="btn btn-big btn-green" id="go">🛣️ יוצאים לטיול!</button>
    </div>`, 'screen-garage');

  app.querySelectorAll('.garage-card').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.v;
      state.vehicle = k; save();
      app.querySelectorAll('.garage-card').forEach(x => x.classList.toggle('selected', x === b));
      b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce');
      Sound.play(VEHICLES[k].sound);
      Sound.say(VEHICLES[k].name);
    };
  });
  document.getElementById('go').onclick = () => { Sound.play('tap'); stationDrive(); };
}

// =========================================================
//  מפה – בוחרים תחנה
// =========================================================
const STATIONS = [
  { id: 'drive',   icon: '🛣️', name: 'יוצאים לטיול', say: 'יוצאים לטיול!',                    go: () => stationDrive() },
  { id: 'traffic', icon: '🚦', name: 'רמזור',        say: 'רמזור! בוא נלמד מתי נוסעים',      go: () => stationTraffic() },
  { id: 'build',   icon: '🧱', name: 'אתר בנייה',    say: 'אתר בנייה! בוא נבנה בית',          go: () => stationBuild() },
  { id: 'fire',    icon: '🔥', name: 'הצלה',          say: 'שריפה! צריך לעזור',                go: () => stationFire() },
  { id: 'wash',    icon: '🫧', name: 'שטיפת צבעים',  say: 'שטיפת צבעים! בוא נצבע את הרכב',   go: () => stationWash() }
];

function showMap(first = false) {
  btnHome.classList.add('hidden');
  starsBox.classList.remove('hidden');
  updateStars();
  const tiles = STATIONS.map(s => `
    <button class="station-tile st-${s.id}" data-id="${s.id}">
      <span class="st-icon">${s.icon}</span>
      <span class="st-name">${s.name}</span>
    </button>`).join('');

  setScreen(`
    <div class="scene map">
      ${sceneBg()}
      <div class="map-grid">${tiles}</div>
      <button class="garage-btn" id="toGarage">🛠️ מוסך</button>
      <div class="map-car idle">${myVehicleSVG()}</div>
    </div>`, 'screen-map');

  if (first) later(() => Sound.say('לאן נוסעים? תבחר תחנה'), 900);

  app.querySelectorAll('.station-tile').forEach(t => {
    t.onclick = () => {
      const s = STATIONS.find(x => x.id === t.dataset.id);
      Sound.play('tap');
      Sound.say(s.say);
      t.classList.add('bounce');
      later(s.go, 650);
    };
  });
  document.getElementById('toGarage').onclick = () => { Sound.play('tap'); Sound.say('המוסך'); showGarage(); };
  app.querySelector('.map-car').onclick = () => Sound.play(VEHICLES[state.vehicle].sound);
}

function stationStart() {
  btnHome.classList.remove('hidden');
  starsBox.classList.remove('hidden');
}

function progressDots(total, done) {
  return Array.from({ length: total }, (_, i) => `<span class="dot ${i < done ? 'on' : ''}"></span>`).join('');
}

// =========================================================
//  תחנה 1: רמזור – אדום עוצרים, ירוק נוסעים
// =========================================================
function stationTraffic() {
  stationStart();
  const NEED = 3;
  let done = 0, light = 'red', moving = false;

  setScreen(`
    <div class="scene traffic">
      ${sceneBg()}
      <div class="hint" id="hint">כשהרמזור ירוק – לוחצים על הרכב!</div>
      <div class="progress" id="prog">${progressDots(NEED, 0)}</div>
      <div class="traffic-light" id="tl">
        <div class="lamp red on"></div><div class="lamp yellow"></div><div class="lamp green"></div>
      </div>
      <div class="stop-line"></div>
      <div class="player" id="car">${myVehicleSVG()}</div>
    </div>`, 'screen-station');

  const tl = document.getElementById('tl');
  const car = document.getElementById('car');
  const hint = document.getElementById('hint');

  function setLight(c) {
    light = c;
    tl.querySelectorAll('.lamp').forEach(l => l.classList.toggle('on', l.classList.contains(c)));
  }
  function cycle() {
    setLight('red');
    later(() => {
      setLight('green');
      if (!moving) Sound.say('ירוק! סע!');
      later(() => { setLight('yellow'); later(cycle, 900); }, 3200);
    }, rand(2200, 3800));
  }
  later(() => Sound.say('אדום עוצרים. ירוק נוסעים. חכה לירוק ולחץ על הרכב'), 400);
  later(cycle, 2500);

  car.onclick = () => {
    if (moving) return;
    if (light === 'green') {
      moving = true;
      done++;
      document.getElementById('prog').innerHTML = progressDots(NEED, done);
      Sound.play('drive');
      Sound.say(pick(['ירוק נוסעים!', 'יופי! נוסעים!', 'וּרוּם!']));
      car.classList.add('driving', 'go-across');
      later(() => {
        car.classList.remove('go-across');
        car.classList.add('no-anim');
        car.style.left = '';
        void car.offsetWidth;
        car.classList.remove('no-anim', 'driving');
        moving = false;
        if (done >= NEED) { clearTimers(); winStation(stationTraffic); }
      }, 1700);
    } else {
      Sound.play('oops');
      car.classList.remove('shake'); void car.offsetWidth; car.classList.add('shake');
      hint.textContent = light === 'red' ? '✋ אדום – עוצרים ומחכים' : '✋ צהוב – מתכוננים לעצור';
      Sound.say(light === 'red' ? 'אופס! אדום עוצרים. מחכים לירוק' : 'צהוב! מחכים רגע');
    }
  };
}

// =========================================================
//  תחנה 2: אתר בנייה – סופרים לבנים
// =========================================================
function stationBuild() {
  stationStart();
  const N = rand(2, 5);
  let placed = 0, finished = false;

  const slots = Array.from({ length: N }, (_, i) => `<div class="slot" data-i="${i}"></div>`).join('');
  const pile = Array.from({ length: N + 2 }, () => `<button class="brick"></button>`).join('');

  setScreen(`
    <div class="scene build">
      ${sceneBg()}
      <div class="hint">בונים בית מ־<b>${N}</b> לבנים</div>
      <div class="big-number" id="num">0</div>
      <div class="house-build">
        <div class="roof" id="roof"></div>
        <div class="walls">${slots}</div>
      </div>
      <div class="brick-pile">${pile}</div>
      <div class="mixer-park">${vehicleSVG('mixer', state.colors.mixer)}</div>
    </div>`, 'screen-station');

  later(() => Sound.say(`בוא נבנה בית! צריך ${NUM_F[N]} לבנים. לחץ על הלבנים וספור איתי`), 400);

  const num = document.getElementById('num');
  app.querySelectorAll('.brick').forEach(b => {
    b.onclick = () => {
      if (finished || b.classList.contains('used')) return;
      b.classList.add('used');
      placed++;
      Sound.play('brick');
      const slot = app.querySelector(`.slot[data-i="${placed - 1}"]`);
      slot.classList.add('filled');
      num.textContent = placed;
      num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop');
      Sound.say(NUM_F[placed], { rate: 0.85 });
      if (placed === N) {
        finished = true;
        app.querySelectorAll('.brick:not(.used)').forEach(x => x.classList.add('faded'));
        later(() => {
          document.getElementById('roof').classList.add('show');
          Sound.play('pop');
          Sound.say(`${NUM_F[N]} לבנים! בנית בית!`);
        }, 1000);
        later(() => winStation(stationBuild), 3200);
      }
    };
  });
}

// =========================================================
//  תחנה 3: הצלה – מכבים להבות ואז אמבולנס
// =========================================================
function stationFire() {
  stationStart();
  const N = rand(2, 5);
  let out = 0, phase = 'fire';

  const spots = shuffle([[18, 30], [50, 22], [78, 32], [28, 62], [70, 60], [50, 48]]).slice(0, N);
  const flames = spots.map(([x, y]) =>
    `<button class="flame" style="left:${x}%;top:${y}%"><span>🔥</span></button>`).join('');

  setScreen(`
    <div class="scene fire">
      ${sceneBg()}
      <div class="hint" id="hint">לחץ על הלהבות כדי לכבות!</div>
      <div class="big-number" id="num">0</div>
      <div class="burning-house" id="house">
        <div class="bh-roof"></div>
        <div class="bh-body"><div class="bh-win w1"></div><div class="bh-win w2"></div><div class="bh-door"></div></div>
        ${flames}
      </div>
      <div class="firetruck-park driving-lights">${vehicleSVG('fire', state.colors.fire)}</div>
      <div class="water" id="water"></div>
      <div class="ambulance-wait" id="amb">${vehicleSVG('ambulance', state.colors.ambulance)}</div>
    </div>`, 'screen-station');

  Sound.play('siren');
  later(() => Sound.say(`שריפה! הכבאית הגיעה. לחץ על הלהבות וספור איתי`), 1200);

  const num = document.getElementById('num');
  const water = document.getElementById('water');

  app.querySelectorAll('.flame').forEach(f => {
    f.onclick = () => {
      if (phase !== 'fire' || f.classList.contains('out')) return;
      // זרם מים מהכבאית ללהבה
      const r = f.getBoundingClientRect(), a = app.getBoundingClientRect();
      const tx = r.left + r.width / 2 - a.left, ty = r.top + r.height / 2 - a.top;
      const ft = app.querySelector('.firetruck-park').getBoundingClientRect();
      const sx = ft.left + ft.width * 0.35 - a.left, sy = ft.top + ft.height * 0.15 - a.top;
      const len = Math.hypot(tx - sx, ty - sy), ang = Math.atan2(ty - sy, tx - sx);
      water.style.left = sx + 'px'; water.style.top = sy + 'px';
      water.style.width = len + 'px';
      water.style.transform = `rotate(${ang}rad)`;
      water.classList.remove('spray'); void water.offsetWidth; water.classList.add('spray');
      Sound.play('splash');

      f.classList.add('out');
      out++;
      num.textContent = out;
      num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop');
      later(() => Sound.say(NUM_F[out], { rate: 0.85 }), 150);

      if (out === N) {
        phase = 'amb';
        later(() => {
          document.getElementById('house').classList.add('saved');
          app.querySelector('.firetruck-park').classList.add('driving', 'leave');
          Sound.say('האש כבתה! מישהו צריך עזרה. לחץ על האמבולנס');
          document.getElementById('hint').textContent = '🚑 לחץ על האמבולנס!';
          const amb = document.getElementById('amb');
          amb.classList.add('arrive', 'driving');
          Sound.play('siren');
          later(() => amb.classList.remove('driving'), 1500);
          amb.onclick = () => {
            if (phase !== 'amb') return;
            phase = 'done';
            Sound.play('siren');
            Sound.say('האמבולנס נוסע לבית החולים!');
            amb.classList.add('driving', 'leave');
            later(() => winStation(stationFire), 2200);
          };
        }, 1300);
      }
    };
  });
}

// =========================================================
//  תחנה 4: שטיפת צבעים – לומדים צבעים
// =========================================================
function stationWash() {
  stationStart();
  const ROUNDS = 3;
  let round = 0, busy = false, target;
  const used = [];

  setScreen(`
    <div class="scene wash">
      ${sceneBg()}
      <div class="hint" id="hint"></div>
      <div class="progress" id="prog">${progressDots(ROUNDS, 0)}</div>
      <div class="wash-arch"><div class="brush b1"></div><div class="brush b2"></div></div>
      <div class="wash-car" id="wcar">${myVehicleSVG()}</div>
      <div class="bubbles" id="bubbles"></div>
      <div class="buckets" id="buckets"></div>
    </div>`, 'screen-station');

  const hint = document.getElementById('hint');
  const wcar = document.getElementById('wcar');
  const buckets = document.getElementById('buckets');

  function next() {
    busy = false;
    const pool = COLORS.filter(c => c.hex !== myColor() && !used.includes(c.name));
    target = pick(pool);
    used.push(target.name);
    const options = shuffle([target, ...shuffle(COLORS.filter(c => c !== target)).slice(0, 2)]);
    hint.innerHTML = `צבע את הרכב ב<b style="color:${target.hex}">${target.name}</b>`;
    buckets.innerHTML = options.map(c => `
      <button class="bucket" data-c="${c.name}" aria-label="${c.name}">
        <span class="paint" style="background:${c.hex}"></span>
      </button>`).join('');
    Sound.say(`איפה הצבע ${target.name}?`);

    buckets.querySelectorAll('.bucket').forEach(b => {
      b.onclick = () => {
        if (busy) return;
        const c = COLORS.find(x => x.name === b.dataset.c);
        if (c === target) {
          busy = true;
          Sound.play('splash');
          bubbles();
          state.colors[state.vehicle] = c.hex; save();
          later(() => {
            wcar.innerHTML = myVehicleSVG();
            wcar.classList.remove('bounce'); void wcar.offsetWidth; wcar.classList.add('bounce');
            Sound.say(`${pick(PRAISE)} ${c.name}!`);
            round++;
            document.getElementById('prog').innerHTML = progressDots(ROUNDS, round);
            if (round >= ROUNDS) later(() => winStation(stationWash), 1500);
            else later(next, 2200);
          }, 700);
        } else {
          Sound.play('oops');
          b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
          Sound.say(`זה ${c.name}. בוא נחפש ${target.name}`);
        }
      };
    });
  }

  function bubbles() {
    const box = document.getElementById('bubbles');
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('i');
      s.style.left = rand(25, 75) + '%';
      s.style.width = s.style.height = rand(14, 36) + 'px';
      s.style.animationDelay = Math.random() * 0.5 + 's';
      box.appendChild(s);
      setTimeout(() => s.remove(), 2200);
    }
  }

  later(next, 500);
}

// ---------- התחלה ----------
// לבדיקות: אפשר לפתוח ישר מסך מסוים, למשל index.html#fire
const START = {
  garage: showGarage, map: showMap, drive: stationDrive,
  traffic: stationTraffic, build: stationBuild, fire: stationFire, wash: stationWash
}[location.hash.slice(1)];
(START || showTitle)();
