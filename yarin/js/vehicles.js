// =========================================================
//  ירין על ההגה – ציורי הרכבים (SVG מקורי)
//  כל הרכבים פונים ימינה. אפשר לשנות להם צבע.
// =========================================================

const VEHICLES = {
  car:       { name: 'מכונית',     the: 'המכונית',   color: '#E53935', sound: 'honk' },
  truck:     { name: 'משאית',      the: 'המשאית',    color: '#FB8C00', sound: 'horn' },
  mixer:     { name: 'מערבל בטון', the: 'המערבל',    color: '#FDD835', sound: 'horn' },
  fire:      { name: 'כבאית',      the: 'הכבאית',    color: '#E53935', sound: 'siren' },
  ambulance: { name: 'אמבולנס',    the: 'האמבולנס',  color: '#FFFFFF', sound: 'siren' },
  sport:     { name: 'מכונית מרוץ', the: 'מכונית המרוץ', color: '#1E88E5', sound: 'vroom' }
};

// צבע כהה יותר לקווי מתאר
function darken(hex, amt = 0.35) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r * (1 - amt)); g = Math.round(g * (1 - amt)); b = Math.round(b * (1 - amt));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function wheel(cx, cy, r = 17) {
  return `
    <g class="wheel" style="transform-origin:${cx}px ${cy}px">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#23262d"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.48}" fill="#cfd6df"/>
      <rect x="${cx - 1.5}" y="${cy - r * 0.45}" width="3" height="${r * 0.9}" fill="#8a94a3"/>
    </g>`;
}

// עין חמודה בתוך חלון
function eye(cx, cy, s = 1) {
  return `
    <ellipse cx="${cx}" cy="${cy}" rx="${8 * s}" ry="${9.5 * s}" fill="#fff" stroke="#2b2b2b" stroke-width="2"/>
    <circle class="pupil" cx="${cx + 2.5 * s}" cy="${cy + 1.5 * s}" r="${4.3 * s}" fill="#2b2b2b"/>
    <circle cx="${cx + 4 * s}" cy="${cy - 0.5 * s}" r="${1.5 * s}" fill="#fff"/>`;
}

function smile(x, y) {
  return `<path d="M${x - 9} ${y} Q${x} ${y + 9} ${x + 9} ${y}" fill="none" stroke="#3a1010" stroke-width="3.5" stroke-linecap="round"/>`;
}

function shadow() {
  return `<ellipse cx="100" cy="118" rx="88" ry="6" fill="#000" opacity=".18"/>`;
}

// ---------- ציורים ----------
function drawCar(c) {
  const d = darken(c);
  return `
    ${shadow()}
    <path d="M52 58 Q60 26 100 24 Q136 26 146 58 Z" fill="${c}" stroke="${d}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M104 56 L106 32 Q130 32 138 56 Z" fill="#dff4ff" stroke="${d}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M62 56 Q68 32 98 32 L98 56 Z" fill="#dff4ff" stroke="${d}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="12" y="54" width="176" height="46" rx="20" fill="${c}" stroke="${d}" stroke-width="4"/>
    ${eye(122, 45)}
    <circle cx="178" cy="70" r="7" fill="#fff6c2" stroke="${d}" stroke-width="2.5"/>
    <rect x="14" y="66" width="10" height="9" rx="3" fill="#ff7b7b"/>
    ${smile(166, 84)}
    ${wheel(52, 100)} ${wheel(150, 100)}`;
}

function drawSport(c) {
  const d = darken(c);
  return `
    ${shadow()}
    <path d="M60 64 Q78 36 112 36 Q138 38 154 64 Z" fill="${c}" stroke="${d}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M112 62 L114 44 Q132 44 144 62 Z" fill="#dff4ff" stroke="${d}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M8 74 Q10 60 40 60 L170 60 Q194 64 194 84 L194 96 Q194 102 186 102 L14 102 Q8 102 8 96 Z" fill="${c}" stroke="${d}" stroke-width="4" stroke-linejoin="round"/>
    <rect x="6" y="50" width="26" height="8" rx="3" fill="${d}"/>
    <rect x="16" y="56" width="5" height="8" fill="${d}"/>
    <path d="M60 80 L150 80" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    ${eye(128, 53, 0.85)}
    <circle cx="184" cy="76" r="6" fill="#fff6c2" stroke="${d}" stroke-width="2.5"/>
    ${smile(172, 90)}
    ${wheel(48, 102, 16)} ${wheel(156, 102, 16)}`;
}

function drawTruck(c) {
  const d = darken(c);
  return `
    ${shadow()}
    <!-- ארגז -->
    <path d="M8 40 L118 40 L118 92 L8 92 Z" fill="#8d6e63" stroke="#4e342e" stroke-width="4" stroke-linejoin="round"/>
    <path d="M14 40 Q40 18 64 32 Q86 16 112 40 Z" fill="#c8a165" stroke="#7a5a2a" stroke-width="3"/>
    <rect x="8" y="52" width="110" height="6" fill="#6d4c41"/>
    <!-- תא נהג -->
    <path d="M124 92 L124 30 Q124 22 132 22 L160 22 Q170 22 176 34 L190 60 L190 92 Z" fill="${c}" stroke="${d}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M134 56 L134 32 L158 32 Q164 32 168 40 L176 56 Z" fill="#dff4ff" stroke="${d}" stroke-width="3" stroke-linejoin="round"/>
    ${eye(156, 45)}
    <circle cx="184" cy="72" r="6" fill="#fff6c2" stroke="${d}" stroke-width="2.5"/>
    ${smile(172, 82)}
    <rect x="4" y="88" width="190" height="12" rx="5" fill="#455a64"/>
    ${wheel(36, 100)} ${wheel(88, 100)} ${wheel(160, 100)}`;
}

function drawMixer(c) {
  const d = darken(c);
  return `
    ${shadow()}
    <!-- תוף מסתובב -->
    <g class="drum" style="transform-origin:66px 56px">
      <ellipse cx="66" cy="56" rx="58" ry="34" fill="#eceff1" stroke="#78909c" stroke-width="4"/>
      <path d="M22 40 Q66 76 110 40" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
      <path d="M18 62 Q66 96 114 62" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
    </g>
    <path d="M8 40 L20 30" stroke="#78909c" stroke-width="6" stroke-linecap="round"/>
    <!-- תא נהג -->
    <path d="M128 92 L128 30 Q128 22 136 22 L160 22 Q170 22 176 34 L190 60 L190 92 Z" fill="${c}" stroke="${d}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M138 56 L138 32 L158 32 Q164 32 168 40 L176 56 Z" fill="#dff4ff" stroke="${d}" stroke-width="3" stroke-linejoin="round"/>
    ${eye(157, 45)}
    <circle cx="184" cy="72" r="6" fill="#fff6c2" stroke="${d}" stroke-width="2.5"/>
    ${smile(172, 82)}
    <rect x="4" y="88" width="190" height="12" rx="5" fill="#455a64"/>
    ${wheel(36, 100)} ${wheel(88, 100)} ${wheel(160, 100)}`;
}

function drawFire(c) {
  const d = darken(c);
  return `
    ${shadow()}
    <!-- סולם -->
    <g stroke="#b0bec5" stroke-width="4" stroke-linecap="round">
      <line x1="14" y1="24" x2="128" y2="24"/><line x1="14" y1="34" x2="128" y2="34"/>
      <line x1="24" y1="22" x2="24" y2="36"/><line x1="44" y1="22" x2="44" y2="36"/>
      <line x1="64" y1="22" x2="64" y2="36"/><line x1="84" y1="22" x2="84" y2="36"/>
      <line x1="104" y1="22" x2="104" y2="36"/><line x1="124" y1="22" x2="124" y2="36"/>
    </g>
    <rect x="8" y="38" width="128" height="54" rx="8" fill="${c}" stroke="${d}" stroke-width="4"/>
    <rect x="18" y="48" width="30" height="26" rx="4" fill="#ffcdd2" stroke="${d}" stroke-width="2.5"/>
    <rect x="56" y="48" width="30" height="26" rx="4" fill="#ffcdd2" stroke="${d}" stroke-width="2.5"/>
    <rect x="94" y="48" width="30" height="26" rx="4" fill="#ffcdd2" stroke="${d}" stroke-width="2.5"/>
    <rect x="8" y="78" width="128" height="6" fill="#fff" opacity=".9"/>
    <!-- תא נהג -->
    <path d="M136 92 L136 30 Q136 22 144 22 L162 22 Q172 22 178 34 L192 60 L192 92 Z" fill="${c}" stroke="${d}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M144 56 L144 32 L160 32 Q166 32 170 40 L178 56 Z" fill="#dff4ff" stroke="${d}" stroke-width="3" stroke-linejoin="round"/>
    <rect class="beacon" x="148" y="12" width="18" height="10" rx="4" fill="#42a5f5"/>
    ${eye(160, 45)}
    <circle cx="186" cy="72" r="6" fill="#fff6c2" stroke="${d}" stroke-width="2.5"/>
    ${smile(174, 82)}
    <rect x="4" y="88" width="192" height="12" rx="5" fill="#455a64"/>
    ${wheel(36, 100)} ${wheel(96, 100)} ${wheel(162, 100)}`;
}

function drawAmbulance(c) {
  const d = c.toLowerCase() === '#ffffff' ? '#90a4ae' : darken(c);
  return `
    ${shadow()}
    <path d="M10 26 Q10 18 18 18 L134 18 L134 96 L10 96 Z" fill="${c}" stroke="${d}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M134 96 L134 34 Q134 26 142 26 L160 26 Q170 26 176 38 L190 62 L190 96 Z" fill="${c}" stroke="${d}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M142 58 L142 36 L158 36 Q164 36 168 44 L176 58 Z" fill="#dff4ff" stroke="${d}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="10" y="68" width="180" height="9" fill="#e53935"/>
    <!-- סמל: לב אדום. לא משתמשים בצלב אדום או במגן דוד אדום – אלה סמלים מוגנים בחוק -->
    <path transform="translate(72 44)" d="M0 16 C-22 2 -20 -16 -8 -16 C-3 -16 0 -12 0 -9 C0 -12 3 -16 8 -16 C20 -16 22 2 0 16 Z" fill="#e53935"/>
    <rect class="beacon" x="60" y="8" width="26" height="10" rx="4" fill="#42a5f5"/>
    ${eye(158, 48)}
    <circle cx="184" cy="76" r="6" fill="#fff6c2" stroke="${d}" stroke-width="2.5"/>
    ${smile(172, 86)}
    ${wheel(42, 100)} ${wheel(156, 100)}`;
}

const DRAWERS = {
  car: drawCar, sport: drawSport, truck: drawTruck,
  mixer: drawMixer, fire: drawFire, ambulance: drawAmbulance
};

// מחזיר SVG מוכן של רכב
function vehicleSVG(type, color) {
  const c = color || VEHICLES[type].color;
  return `<svg class="vehicle-svg vt-${type}" viewBox="0 0 200 126" xmlns="http://www.w3.org/2000/svg">${DRAWERS[type](c)}</svg>`;
}
