// ===== מדברים אנגלית — לוגיקת האפליקציה =====
(function(){
const $ = id => document.getElementById(id);
const TOPIC_MAP = Object.fromEntries(TOPICS.map(t => [t.id, t.items]));
const LESSONS = [];
COURSE.forEach(L => L.lessons.forEach((ls, i) => {
  ls.level = L.id; ls.idx = i;
  ls.list = [...(ls.from ? TOPIC_MAP[ls.from] : []), ...(ls.items || []), ...(ls.extra || [])]
    .map(x => ({en:x[0], he:x[1], tip:x[2], lesson:ls.id}));
  LESSONS.push(ls);
}));
const ALL = LESSONS.flatMap(l => l.list);
const DAILY_GOAL = 10;

/* ---------- שמירת התקדמות ---------- */
const KEY = "speak-en-v2";
let store = {mastery:{}, best:{}, srs:{}, days:{}, dialogBest:{}, accentBest:{}, level:"beginner", unlockAll:false, certName:""};
try{
  const s = JSON.parse(localStorage.getItem(KEY) || "null");
  if(s) store = Object.assign(store, s);
  else { // מעבר מגרסה 1
    const old = JSON.parse(localStorage.getItem("speak-en-v1") || "null");
    if(old){ store.mastery = old.mastery || {}; (old.days||[]).forEach(d => store.days[d] = store.days[d] || 1);
      if(old.todayDate) store.days[old.todayDate] = old.todayCount || 1; }
  }
}catch(e){}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){} }
// מעבר לגרסה 8: ציונים קודמים נכנסים לחזרה החכמה
Object.entries(store.mastery).forEach(([en, lv]) => {
  if(!(en in store.best)) store.best[en] = lv;
  if(!store.srs[en]) store.srs[en] = {box: lv >= 2 ? 2 : 1, due: dayKeySafe(lv >= 2 ? 3 : 0)};
});
function dayKeySafe(n){ const d = new Date(); d.setDate(d.getDate() + n); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
const dayKey = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0,10); };
const today = () => dayKey(new Date());

function countPractice(){ const d = today(); store.days[d] = (store.days[d] || 0) + 1; save(); renderStats(); }
/* ---------- חזרה חכמה (מרווחים) ----------
   כל משפט נמצא ב"קופסה". הצלחה מעלה קופסה ומרחיקה את החזרה הבאה,
   טעות מחזירה לקופסה 1. ככה משפט חוזר בדיוק לפני שנשכח. */
const INTERVALS = [0, 1, 3, 7, 14, 30, 60];
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return dayKey(d); };
function schedule(en, level){
  const s = store.srs[en] || {box:0};
  if(level === 2){ if(s.last !== today() || !s.box) s.box = Math.min((s.box || 0) + 1, INTERVALS.length - 1); }
  else if(level === 1) s.box = Math.max(1, Math.min(s.box || 1, 2));
  else s.box = 1;
  s.due = level === 0 ? today() : addDays(INTERVALS[s.box]);
  s.last = today();
  store.srs[en] = s;
}
function setMastery(en, level){
  const lessonBefore = currentLesson && lessonDone(currentLesson);
  store.mastery[en] = level;
  store.best[en] = Math.max(store.best[en] ?? 0, level);
  schedule(en, level);
  countPractice();
  if(currentLesson && !lessonBefore && lessonDone(currentLesson)) lessonCompleted(currentLesson);
}
const dueList = () => ALL.filter(s => store.srs[s.en] && store.srs[s.en].due <= today());
function nextDueText(){
  const future = Object.values(store.srs).map(s => s.due).filter(d => d > today()).sort();
  if(!future.length) return "";
  const days = Math.round((new Date(future[0]) - new Date(today())) / 864e5);
  return days === 1 ? "החזרה הבאה: מחר." : `החזרה הבאה: בעוד ${days} ימים.`;
}
/* ---------- שיעורים ---------- */
let currentLesson = null;
const lessonMastered = ls => ls.list.filter(s => store.best[s.en] === 2).length;
const lessonNeed = ls => Math.ceil(ls.list.length * 0.7);
const lessonDone = ls => lessonMastered(ls) >= lessonNeed(ls);
const levelLessons = id => LESSONS.filter(l => l.level === id);
function lessonUnlocked(ls){
  if(store.unlockAll || ls.idx === 0) return true;
  return lessonDone(levelLessons(ls.level)[ls.idx - 1]);
}
const levelDone = id => levelLessons(id).every(lessonDone);
const nextLesson = id => levelLessons(id).find(l => lessonUnlocked(l) && !lessonDone(l));
function streak(){
  let n = 0; const dt = new Date();
  if(!store.days[today()]) dt.setDate(dt.getDate() - 1);
  while(store.days[dayKey(dt)]){ n++; dt.setDate(dt.getDate() - 1); }
  return n;
}

function renderStats(){
  const done = store.days[today()] || 0;
  $("goalTxt").textContent = `${Math.min(done, 99)}/${DAILY_GOAL}`;
  $("goalRing").style.strokeDashoffset = 157.1 * (1 - Math.min(done / DAILY_GOAL, 1));
  $("sStreak").textContent = streak();
  $("sMastered").textContent = Object.values(store.best).filter(v => v >= 2).length;
  const r = dueList().length;
  $("reviewBadge").textContent = r ? r : "";
}

/* ---------- הקראה (קול) ---------- */
let voices = [], userInteracted = false;
const hasTTS = "speechSynthesis" in window;
function loadVoices(){ if(hasTTS) voices = speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang)); }
if(hasTTS){ loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
const accent = () => $("voiceSel").value === "gb" ? /en[-_]GB/i : /en[-_]US/i;
function pickVoice(alt){
  const re = accent();
  const pool = voices.filter(v => re.test(v.lang));
  const nice = pool.filter(v => /(Natural|Online|Google|Samantha|Aria|Jenny|Guy|Sonia|Ryan|Daniel)/i.test(v.name));
  const list = nice.length ? nice : (pool.length ? pool : voices);
  if(!list.length) return null;
  return alt ? (list[1] || pool.find(v => v !== list[0]) || list[0]) : list[0];
}
function speak(text, rate = 0.92, alt = false){
  return new Promise(resolve => {
    if(!hasTTS){ resolve(); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(alt);
    u.lang = $("voiceSel").value === "gb" ? "en-GB" : "en-US";
    if(v) u.voice = v;
    u.rate = rate;
    if(alt && (!v || v === pickVoice(false))) u.pitch = 1.25;
    let done = false; const fin = () => { if(!done){ done = true; resolve(); } };
    u.onend = fin; u.onerror = fin;
    setTimeout(fin, 1500 + text.length * 110 / rate);
    speechSynthesis.speak(u);
  });
}
const cleanWord = w => w.replace(/[^A-Za-z0-9'’-]/g, "");

/* ---------- זיהוי דיבור ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, localCtl = null, forceBrowser = false, browserFails = 0;
const LOCAL_OK = !!(window.LocalASR && LocalASR.available);
let micOK = !!SR || LOCAL_OK;
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_SAFARI = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
// איזה מנוע זיהוי: מקומי (יציב, גם באייפון) או של הדפדפן (מהיר, בכרום)
function engine(){
  const pref = store.engine || "auto";
  if(forceBrowser && SR) return "browser";
  if(pref === "local" && LOCAL_OK) return "local";
  if(pref === "browser" && SR) return "browser";
  if(!SR) return LOCAL_OK ? "local" : "none";
  return (IS_IOS || IS_SAFARI) && LOCAL_OK ? "local" : "browser";
}
function micFallback(msg){
  micOK = false;
  $("micNote").hidden = false; $("micNote").textContent = msg;
  $("selfrate").hidden = false;
  $("micLabel").textContent = "תגיד את המשפט בקול, ואז דרג את עצמך";
  $("ytLabel").textContent = "ענה בקול, ואז לחץ 'אמרתי'";
}
const NO_MIC_MSG = "המיקרופון לא זמין כאן, אז עובדים בדירוג עצמי. לציון אוטומטי פתח את index.html מתיקיית הפרויקט בכרום או באדג' ואשר גישה למיקרופון.";
if(!SR && !LOCAL_OK) setTimeout(() => micFallback("הדפדפן הזה לא מזהה דיבור, אז עובדים בדירוג עצמי. לציון אוטומטי פתח את האפליקציה בכרום או באדג'."), 0);

// כל האזנה יוצרת מזהה דיבור חדש. שימוש חוזר באותו מזהה נתקע בכרום אחרי כמה פעמים.
let lastConfidence = 1;
const LOG = [];
function dlog(msg){
  const t = new Date(); LOG.push(`${t.toTimeString().slice(0,8)} ${msg}`); if(LOG.length > 25) LOG.shift();
  const el = document.getElementById("debugLog"); if(el) el.textContent = LOG.slice().reverse().join("\n");
}
// האזנה עמידה:
// 1. מחכים שההקראה תיגמר לגמרי, כדי שהמיקרופון לא יקלוט את הרמקול.
// 2. מקשיבים ברצף (continuous) ועוצרים בעצמנו אחרי שקט, כי כרום עוצר לבד מהר מדי ומפספס.
// 3. "דבר עכשיו" מופיע רק כשהמיקרופון באמת פתוח.
// 4. אם כרום נכשל מיד בלי לשמוע כלום (תקלה בשרת), מנסים שוב אוטומטית פעם אחת.
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function quietSpeaker(){
  if(!hasTTS) return;
  if(speechSynthesis.speaking || speechSynthesis.pending){ speechSynthesis.cancel(); await sleep(350); }
}
let lastNoisy = false;
function listenOnce(onInterim, onReady, target){
  // שים לב: בלי await לפני הבחירה, כדי שהאייפון יפעיל אודיו בתוך הלחיצה
  const p = engine() === "local" ? listenLocal(onInterim, onReady, target) : listenBrowser(onInterim, onReady, target);
  return p.then(r => { browserFails = 0; return r; }, code => {
    if(engine() === "browser" && (code === "no-speech" || code === "no-match")) browserFails++;
    if(browserFails >= 2 && LOCAL_OK) suggestLocal();
    throw code;
  });
}
async function listenLocal(onInterim, onReady, target){
  LocalASR.prime();
  const loadP = LocalASR.load(); loadP.catch(() => {});
  await quietSpeaker();
  const ctl = LocalASR.record({
    onReady: () => { dlog("מיקרופון פתוח (מנוע יציב)"); onReady && onReady(); },
    onSpeech: () => { onInterim && onInterim("שומע אותך..."); }
  });
  localCtl = ctl; listening = true; dlog("התחלה (מנוע יציב)");
  let audio;
  try{ audio = await ctl.done; } finally { listening = false; localCtl = null; }
  if(!audio){ dlog("לא זוהה דיבור"); throw "no-speech"; }
  dlog(`הוקלטו ${(audio.length / 16000).toFixed(1)} שניות`);
  if(!LocalASR.ready){
    onInterim && onInterim(`מוריד את מנוע הזיהוי (פעם אחת בלבד)... ${LocalASR.pct}%`);
    LocalASR.onProgress = pc => { onInterim && onInterim(`מוריד את מנוע הזיהוי (פעם אחת בלבד)... ${pc}%`); showEngine(); };
  }
  try{ await loadP; }catch(e){ dlog("הורדת המנוע נכשלה: " + (e && e.message || e)); throw "model"; }
  onInterim && onInterim("מזהה מה אמרת...");
  const text = await LocalASR.transcribe(audio);
  dlog(`זוהה: "${text}"`);
  lastConfidence = 1;
  lastNoisy = !!target && norm(text).length > norm(target).length * 2 + 3;
  if(!text) throw "no-match";
  onInterim && onInterim(text);
  return [text];
}
async function listenBrowser(onInterim, onReady, target){
  if(!SR) throw "no-sr";
  await quietSpeaker();
  try{ return await listenAttempt(onInterim, onReady, false, target); }
  catch(code){
    if(code === "__retry"){ dlog("ניסיון חוזר אוטומטי"); await sleep(250); return await listenAttempt(onInterim, onReady, true, target); }
    throw code;
  }
}
function listenAttempt(onInterim, onReady, isRetry, target){
  return new Promise((resolve, reject) => {
    if(rec){ try{ rec.onend = rec.onerror = rec.onresult = null; rec.abort(); }catch(e){} }
    const r = new SR(); rec = r;
    const t0 = Date.now();
    let segs = [], interim = "", settled = false, audio = false, gotResult = false, lastErr = null;
    let silenceT = null, startT = null, maxT = null;
    const clearT = () => { clearTimeout(silenceT); clearTimeout(startT); clearTimeout(maxT); };
    const stopSoon = (why) => { dlog("עוצר: " + why); try{ r.stop(); }catch(e){} setTimeout(() => finish(), 1800); };
    const texts = () => {
      const fin = segs.map(s => s[0]).join(" ").trim();
      return [fin, interim].filter(Boolean).join(" ").trim();
    };
    const alts = () => {
      const n = Math.max(1, ...segs.map(s => s.length));
      const out = [];
      for(let k = 0; k < n; k++) out.push((segs.map(s => s[k] || s[0]).join(" ") + " " + interim).trim());
      return [...new Set(out.filter(Boolean))];
    };
    function finish(){
      if(settled) return; settled = true; clearT(); listening = false;
      const all = alts();
      dlog(`סיום. נשמע="${texts()}" שגיאה=${lastErr || "-"} אודיו=${audio}`);
      if(all.length) return resolve(all);
      if(!isRetry && !gotResult && (lastErr === "network" || (Date.now() - t0 < 1500 && lastErr !== "not-allowed"))) return reject("__retry");
      reject(lastErr && lastErr !== "aborted" && lastErr !== "no-speech" ? lastErr : (gotResult ? "no-match" : "no-speech"));
    }
    r.lang = $("voiceSel").value === "gb" ? "en-GB" : "en-US";
    r.interimResults = true; r.maxAlternatives = 4; r.continuous = true;
    r.onaudiostart = () => { audio = true; dlog("מיקרופון פתוח"); onReady && onReady(); };
    r.onresult = e => {
      gotResult = true;
      segs = []; interim = "";
      for(let i = 0; i < e.results.length; i++){
        const res = e.results[i];
        if(res.isFinal){
          segs.push([...res].map(a => a.transcript.trim()));
          if(res[0].confidence > 0) lastConfidence = res[0].confidence;
        } else interim += res[0].transcript + " ";
      }
      interim = interim.trim();
      onInterim && onInterim(texts());
      clearTimeout(startT); clearTimeout(silenceT);
      // עצירה חכמה: ברגע שנאמר המשפט, לא מחכים לשקט (ברקע רועש אין שקט אף פעם)
      let wait = interim ? 2000 : 1300;
      if(target){
        const g = grade(target, alts());
        const tw = norm(target).length, sw = norm(texts()).length;
        if(sw > tw * 2 + 3) lastNoisy = true;
        if(g.pct >= 100) wait = 350;
        else if(g.pct >= 70) wait = 900;
        // נאמרו הרבה יותר מילים מהמשפט: כנראה רעש רקע, לא ממשיכים לחכות
        if(sw > tw * 3 + 4){ stopSoon("יותר מדי מילים, כנראה רעש רקע"); return; }
      }
      silenceT = setTimeout(() => stopSoon("שקט"), wait);
    };
    r.onerror = e => { lastErr = e.error; dlog("שגיאה: " + e.error); };
    r.onend = finish;
    startT = setTimeout(() => stopSoon("לא התחלת לדבר"), 8000);
    maxT = setTimeout(() => stopSoon("זמן מקסימלי"), 12000);
    lastConfidence = 1; lastNoisy = false;
    try{ r.start(); listening = true; dlog(isRetry ? "התחלה (ניסיון 2)" : "התחלה"); }
    catch(e){ dlog("start נכשל: " + e.message); settled = true; clearT(); reject("busy"); }
  });
}
function stopListening(){
  if(!listening) return;
  dlog("עצרת ידנית");
  if(localCtl){ localCtl.stop(); return; }
  if(rec){ try{ rec.stop(); }catch(e){} }
}
function suggestLocal(){
  const n = $("micNote"); n.hidden = false; n.innerHTML = "";
  n.append("נראה שזיהוי הדיבור של הדפדפן מפספס אותך. אפשר לעבור למנוע היציב, שמקליט ישירות ומזהה עם בינה מלאכותית במכשיר שלך. ");
  const b = document.createElement("button"); b.className = "btn sm"; b.textContent = "עבור למנוע היציב";
  b.onclick = () => { store.engine = "local"; save(); $("engineSel").value = "local"; n.hidden = true; browserFails = 0; showEngine(); LocalASR.load().then(showEngine, showEngine); };
  n.appendChild(b);
}
function showEngine(){
  const el = $("engineStat"); if(!el) return;
  const e = engine();
  el.textContent = e === "local" ? (LocalASR.ready ? "מנוע יציב · מוכן" : LocalASR.pct ? `מנוע יציב · מוריד ${LocalASR.pct}%` : "מנוע יציב · ירד בשימוש הראשון (בערך 40MB)")
    : e === "browser" ? "מנוע הדפדפן" : "אין זיהוי דיבור בדפדפן הזה";
}
function handleMicError(code, labelEl){
  if(code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture" || code === "no-sr") micFallback(NO_MIC_MSG);
  else if(code === "no-speech") labelEl.textContent = "לא שמעתי כלום. דבר קרוב יותר למיקרופון, ותתחיל לדבר מיד אחרי הלחיצה.";
  else if(code === "no-match") labelEl.textContent = "שמעתי קול אבל לא הצלחתי לזהות מילים. נסה שוב לאט וברור.";
  else if(code === "network") labelEl.textContent = "זיהוי הדיבור צריך חיבור לאינטרנט. בדוק חיבור ונסה שוב.";
  else if(code === "busy") labelEl.textContent = "המיקרופון עוד היה תפוס. לחץ שוב.";
  else if(code === "model"){
    if(SR){ forceBrowser = true; showEngine(); labelEl.textContent = "לא הצלחתי להוריד את המנוע היציב, אז עברתי למנוע של הדפדפן. לחץ שוב."; }
    else labelEl.textContent = "לא הצלחתי להוריד את מנוע הזיהוי. בדוק חיבור לאינטרנט ולחץ שוב.";
  }
  else labelEl.textContent = `ההאזנה נעצרה (${code}). לחץ שוב על המיקרופון.`;
}

/* ---------- ציון ---------- */
const norm = t => t.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
const NUMS = {zero:"0",one:"1",two:"2",three:"3",four:"4",five:"5",six:"6",seven:"7",eight:"8",nine:"9",ten:"10",eleven:"11",twelve:"12",fifteen:"15",twenty:"20",thirty:"30",forty:"40",fifty:"50",sixty:"60",hundred:"100",first:"1st",second:"2nd",third:"3rd"};
const canon = w => { w = w.replace(/'/g, ""); return NUMS[w] || w; };
// מיישר את מה שנאמר מול המשפט, ולכל מילה שומר אם נשמעה ומה נשמע במקומה
function align(target, said){
  const T = target.map(canon), S = said.map(canon), n = T.length, m = S.length;
  const dp = Array.from({length:n+1}, () => new Array(m+1).fill(0));
  for(let i = n-1; i >= 0; i--) for(let j = m-1; j >= 0; j--)
    dp[i][j] = T[i] === S[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
  const res = target.map(() => ({ok:false, heard:null}));
  let i = 0, j = 0, gT = [], gS = [];
  const flush = () => { gT.forEach((ti, k) => { if(k < gS.length) res[ti].heard = said[gS[k]]; }); gT = []; gS = []; };
  while(i < n || j < m){
    if(i < n && j < m && T[i] === S[j]){ flush(); res[i].ok = true; i++; j++; }
    else if(j >= m || (i < n && dp[i+1][j] >= dp[i][j+1])){ gT.push(i); i++; }
    else { gS.push(j); j++; }
  }
  flush();
  return res;
}
const numify = t => t.replace(/\d/g, d => " " + Object.keys(NUMS).find(k => NUMS[k] === d) + " ");
function grade(targetText, alts){
  const words = targetText.split(/\s+/);
  const groups = words.map(w => norm(numify(w)));
  const flat = groups.flat();
  let best = null;
  for(const a of alts){
    const r = align(flat, norm(a));
    const sc = r.filter(x => x.ok).length / Math.max(flat.length, 1);
    if(!best || sc > best.sc) best = {sc, r, text:a};
  }
  let k = 0;
  best.words = groups.map((g, wi) => {
    const part = best.r.slice(k, k + g.length); k += g.length;
    return {word: words[wi], ok: part.every(x => x.ok), heard: part.map(x => x.heard).filter(Boolean).join(" ") || null};
  });
  best.ok = best.words.map(x => x.ok);
  best.pct = Math.round(best.sc * 100);
  best.level = best.pct >= 85 ? 2 : best.pct >= 60 ? 1 : 0;
  return best;
}

/* ---------- מאמן הגייה: מה לא נשמע טוב ואיך לתקן ---------- */
const PHON = {
  "the":"דְה – קצה הלשון בין השיניים", "this":"דִיס – הלשון בין השיניים", "that":"דֶאט – הלשון בין השיניים", "there":"דֶר",
  "thank":"ת'ֶנְק – הלשון בין השיניים, נושפים", "thanks":"ת'ֶנְקס – הלשון בין השיניים, נושפים", "think":"ת'ִינְק", "three":"ת'רִי", "with":"וִית' / וִיד'",
  "coffee":"קָאפִי", "please":"פְּלִיז", "could":"קוּד – ה-L שקטה", "would":"ווּד – ה-L שקטה", "should":"שוּד – ה-L שקטה",
  "know":"נוֹאוּ – ה-K שקטה", "schedule":"סְקֶג'וּל", "recommend":"רֶקוֹמֶנְד – הדגש על מֶנְד", "experience":"אִקְסְפִּירִיאֶנְס",
  "appointment":"אַפּוֹינְטְמֶנְט", "prescription":"פְּרִיסְקְרִיפְּשֶׁן", "pharmacy":"פָארְמַסִי", "allergic":"אַלֶרְגִ'יק",
  "penicillin":"פֶּנִיסִילִין", "headache":"הֶדְאֵייק", "available":"אַבֵיילַבְּל", "typical":"טִיפִּיקַל", "challenge":"צֶ'לֶנְג'",
  "reservation":"רֶזֶרְבֵיישֶׁן", "station":"סְטֵיישֶׁן", "address":"אַדְרֶס", "seat":"סִיייט – ' ארוך", "spicy":"סְפַּייסִי",
  "check":"צֶ'ק", "size":"סַייז", "return":"רִיטֶרְן", "details":"דִיטֵיילְז", "meeting":"מִיטִינְג", "explain":"אִקְסְפְּלֵיין",
  "favor":"פֵייבֶר", "congratulations":"קֶנְגְרַצֶ'לֵיישֶׁנְז", "weekend":"וִיקֶנְד", "idea":"אַיידִיאָה", "message":"מֶסֶג'",
  "breaking":"בְּרֵייקִינְג", "order":"אוֹרְדֶר", "charged":"צָ'ארְג'ד – בסוף ד' ולא אֶד", "manager":"מֶנֶג'ר", "busy":"בִּיזִי",
  "lately":"לֵייטְלִי", "nice":"נַייס", "meet":"מִיט – אִי ארוכה", "table":"טֵייבְּל", "same":"סֵיים", "isn't":"אִיזְנְט",
  "perfect":"פֶּרְפֶקְט", "learning":"לֶרְנִינְג", "mean":"מִין – אִי ארוכה", "second":"סֶקֶנְד", "lost":"לוֹסְט", "taken":"טֵייקֶן",
  "wondering":"וַאנְדֶרִינְג", "work":"וֶרְק – לא ווֹרק", "world":"וֶרְלְד", "walk":"ווֹק – ה-L שקטה", "talk":"טוֹק – ה-L שקטה",
  "hour":"אַוֶר – ה-H שקטה", "honest":"אוֹנֶסְט – ה-H שקטה", "early":"אֶרְלִי", "there's":"דֶרְז", "it's":"אִיטְס", "i'm":"אַיים",
  "i'd":"אַייד", "i'll":"אַייל", "you're":"יוּר", "what's":"ווֹאטְס", "how's":"הַאוּז", "let's":"לֶטְס", "hasn't":"הֶזְנְט",
  "hear":"הִיר", "here":"הִיר", "heard":"הֶרְד", "sure":"שוּר", "great":"גְרֵייט", "fitting":"פִיטִינְג",
  "rooms":"רוּמְז", "passport":"פָּאסְפּוֹרְט", "breakfast":"בְּרֶקְפַסְט – לא ברייק-פאסט", "miller's":"מִילֶרְז",
  "office":"אוֹפִיס", "reason":"רִיזֶן", "visit":"וִיזִיט", "tuesday":"טוּזְדֵיי", "oat":"אוֹאוּט", "milk":"מִילְק", "here's":"הִירְז",
  "area":"אֶרִיאָה", "supermarket":"סוּפֶּרְמָארְקֶט", "corner":"קוֹרְנֶר", "anything":"אֶנִית'ִינְג", "company":"קַאמְפַּנִי",
  "questions":"קְוֶוסְצֶ'נְז", "year":"יִיר", "years":"יִירְז", "field":"פִילְד", "team":"טִים", "new":"נוּ", "next":"נֶקְסְט",
  "month":"מַאנְת'", "called":"קוֹלְד – בסוף ד' ולא אֶד", };
function pronTips(word, heard){
  const w = cleanWord(word).toLowerCase().replace(/’/g, "'"), h = (heard || "").toLowerCase();
  const tips = [];
  const say = heard ? `שמעתי "${heard}" במקום "${cleanWord(word)}". ` : "";
  if(!heard) tips.push("המילה לא נשמעה בכלל. כנראה נבלעה או נאמרה מהר מדי. הקשב לה לאט ותגיד אותה ברור.");
  if(/th/.test(w)){
    if(heard && /^(t|d|s|z|f)/.test(h) && /^th/.test(w)) tips.push(say + "ב-TH שים את קצה הלשון בין השיניים ונשוף אוויר. לא ט', לא ס' ולא ד'.");
    else tips.push("ב-TH הלשון יוצאת קצת בין השיניים ונושפים. זה הצליל הכי קשה לישראלים, תתרגל אותו לאט.");
  }
  if(/^wh?[aeiouy]/.test(w) && heard && /^v/.test(h)) tips.push(say + "W היא לא V: עגל את השפתיים כמו 'אוּ', בלי לגעת בשיניים.");
  else if(/^v/.test(w) && heard && /^w/.test(h)) tips.push(say + "V: השיניים העליונות נוגעות בשפה התחתונה.");
  if(/^kn|^wr|mb$|ould$|alk$|^ho(ur|nest)/.test(w)) tips.push("יש פה אות שקטה שלא אומרים. הקשב לאיך שהמילה נשמעת, לא לאיך שהיא כתובה.");
  if(/ed$/.test(w) && w.length > 4) tips.push("סיומת ED: אחרי t/d אומרים 'אִיד', אחרי צלילים קשים כמו k/p/s/sh/ch אומרים 'ט', ובשאר 'ד'. לא 'אֶד' מלא.");
  if(/ing$/.test(w)) tips.push("סיים ב-NG רך מהאף, בלי ג' בסוף: 'מִיטִינְג' ולא 'מיטינגג'.");
  if(heard && (/ee|ea/.test(w) && /i(?!e)/.test(h) && !/ee|ea/.test(h))) tips.push(say + "אִי ארוכה: מתח את הצליל, כמו 'מִייט'. אִי קצרה משנה את המילה.");
  if(heard && h.length < w.length && w.startsWith(h.slice(0, Math.max(2, h.length - 1)))) tips.push(say + "אל תבלע את סוף המילה. תגיד את העיצורים בסוף בבירור.");
  if(/r/.test(w) && heard && !/r/.test(h)) tips.push("R אמריקאי: הלשון מתקפלת אחורה ולא נוגעת בשום מקום. לא ר' גרונית.");
  if(/^h/.test(w) && !/^ho(ur|nest)/.test(w)) tips.length < 2 && heard && !/^h/.test(h) && tips.push(say + "H באנגלית היא נשיפה רכה, לא ח'.");
  if(heard && !tips.some(t => t.startsWith("שמעתי"))) tips.unshift(say + "הקשב לאט וחזור על המילה לבד, ואז את כל המשפט.");
  return {phon: PHON[w] || "", tips: [...new Set(tips)].slice(0, 2)};
}
function renderFixes(container, words, max = 4){
  container.innerHTML = "";
  const wrong = words.filter(x => !x.ok && cleanWord(x.word));
  if(!wrong.length){ container.hidden = true; return; }
  container.hidden = false;
  const h = document.createElement("div"); h.className = "fixes-title";
  h.textContent = wrong.length === 1 ? "מילה אחת לתקן" : `${Math.min(wrong.length, max)} מילים לתקן`;
  container.appendChild(h);
  wrong.slice(0, max).forEach(x => {
    const {phon, tips} = pronTips(x.word, x.heard);
    const row = document.createElement("div"); row.className = "fix";
    row.innerHTML = `<div class="fix-head"><bdi class="fix-word" lang="en"></bdi><span class="fix-phon"></span></div><ul class="fix-tips"></ul>
      <div class="row fix-actions"><button class="btn sm fx-slow">שמע לאט</button><button class="btn sm fx-try">תרגל את המילה</button><span class="fix-res"></span></div>`;
    row.querySelector(".fix-word").textContent = cleanWord(x.word);
    row.querySelector(".fix-phon").textContent = phon ? "נשמע כמו: " + phon : "";
    const ul = row.querySelector(".fix-tips");
    tips.forEach(t => { const li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
    row.querySelector(".fx-slow").onclick = () => speak(cleanWord(x.word), 0.6);
    row.querySelector(".fx-try").onclick = () => practiceWord(x.word, row);
    container.appendChild(row);
  });
}
async function practiceWord(word, row){
  const res = row.querySelector(".fix-res"), btn = row.querySelector(".fx-try");
  const target = canon(norm(numify(word))[0] || "");
  if(!micOK){ await speak(cleanWord(word), 0.6); res.textContent = "תגיד אותה בקול 3 פעמים, לאט ואז מהר."; return; }
  if(listening){ stopListening(); return; }
  await speak(cleanWord(word), 0.6);
  btn.classList.add("on"); res.className = "fix-res"; res.textContent = "רגע...";
  try{
    const alts = await listenOnce(t => res.textContent = t, () => res.textContent = "תגיד רק את המילה, עכשיו", cleanWord(word));
    btn.classList.remove("on");
    const hit = alts.some(a => norm(a).map(canon).includes(target));
    if(hit){ res.className = "fix-res good"; res.textContent = "מצוין! עכשיו תגיד את כל המשפט שוב."; }
    else {
      const heard = norm(alts[0]).join(" ");
      const t = pronTips(word, heard).tips[0] || "";
      res.className = "fix-res bad"; res.textContent = `שמעתי "${heard}". ${t.replace(/^שמעתי "[^"]*" במקום "[^"]*"\. /, "")}`;
    }
  }catch(code){ btn.classList.remove("on"); handleMicError(code, res); }
}

/* ---------- הקלטה עצמית ---------- */
let mediaRec = null, myAudioUrl = null, recTimer = null;
const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
if(canRecord) $("recBtn").hidden = false;
async function toggleRecord(){
  if(mediaRec && mediaRec.state === "recording"){ mediaRec.stop(); return; }
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    const chunks = [];
    mediaRec = new MediaRecorder(stream);
    mediaRec.ondataavailable = e => chunks.push(e.data);
    mediaRec.onstop = () => {
      clearTimeout(recTimer); stream.getTracks().forEach(t => t.stop());
      if(myAudioUrl) URL.revokeObjectURL(myAudioUrl);
      myAudioUrl = URL.createObjectURL(new Blob(chunks, {type: mediaRec.mimeType || "audio/webm"}));
      $("recBtn").classList.remove("on"); $("recBtn").querySelector("span").textContent = "הקלט שוב";
      $("playMine").hidden = false;
    };
    mediaRec.start();
    $("recBtn").classList.add("on"); $("recBtn").querySelector("span").textContent = "עצור הקלטה";
    recTimer = setTimeout(() => mediaRec && mediaRec.state === "recording" && mediaRec.stop(), 8000);
  }catch(e){
    $("recBtn").hidden = true; $("playMine").hidden = true;
  }
}
function playMine(){
  if(!myAudioUrl) return;
  const a = new Audio(myAudioUrl);
  a.onended = () => setTimeout(() => speak(list[idx].en), 400);
  a.play().catch(() => {});
}
function resetRecording(){
  if(myAudioUrl){ URL.revokeObjectURL(myAudioUrl); myAudioUrl = null; }
  $("playMine").hidden = true;
  $("recBtn").querySelector("span").textContent = "הקלט את עצמי";
}

/* ---------- מצבים (טאבים) ---------- */
let mode = "course";
function setMode(m){
  mode = m;
  document.querySelectorAll(".mode").forEach(b => b.setAttribute("aria-selected", String(b.dataset.mode === m)));
  if(listening){ if(localCtl) localCtl.stop(); else if(rec){ try{ rec.abort(); }catch(e){} } }
  if(hasTTS) speechSynthesis.cancel();
  $("view-practice").hidden = !(m === "course" || m === "review");
  $("view-accent").hidden = m !== "accent";
  $("view-talk").hidden = m !== "talk";
  $("view-listen").hidden = m !== "listen";
  $("toast").hidden = true;
  if(m === "course") showHome();
  if(m === "review") startReview();
  if(m === "accent") showUnits();
  if(m === "talk") showScenarios();
  if(m === "listen") startQuiz();
}
document.querySelectorAll(".mode").forEach(b => b.onclick = () => { userInteracted = true; setMode(b.dataset.mode); });

/* ---------- מסך המסלול ---------- */
let list = [], idx = 0;
function showHome(){
  currentLesson = null;
  $("courseHome").hidden = false; $("lessonBar").hidden = true; $("practiceCard").hidden = true; $("reviewEmpty").hidden = true;
  const lv = COURSE.find(L => L.id === store.level) || COURSE[0];
  const chips = $("levels"); chips.innerHTML = "";
  COURSE.forEach(L => {
    const b = document.createElement("button"); b.className = "chip";
    b.textContent = L.name + (levelDone(L.id) ? " ✓" : "");
    b.setAttribute("aria-pressed", String(L.id === lv.id));
    b.onclick = () => { store.level = L.id; save(); showHome(); };
    chips.appendChild(b);
  });
  const ls = levelLessons(lv.id);
  const mastered = ls.reduce((a, l) => a + lessonMastered(l), 0), total = ls.reduce((a, l) => a + l.list.length, 0);
  $("levelName").textContent = "רמה: " + lv.name;
  $("levelDesc").textContent = `${lv.desc}. ${ls.length} שיעורים, ${total} משפטים.`;
  $("levelPct").textContent = Math.round(mastered / total * 100) + "%";
  const cur = nextLesson(lv.id);
  const grid = $("lessons"); grid.innerHTML = "";
  ls.forEach(l => {
    const open = lessonUnlocked(l), done = lessonDone(l), m = lessonMastered(l);
    const b = document.createElement("button");
    b.className = "lesson" + (done ? " done" : "") + (l === cur ? " current" : "");
    b.disabled = !open;
    b.innerHTML = `<span class="ln"><span>שיעור ${l.idx + 1}</span><span></span></span><b></b><span class="lbar"><i></i></span><span class="ls"></span>`;
    b.querySelector(".ln span:last-child").textContent = done ? "✓" : open ? "" : "🔒";
    b.querySelector("b").textContent = l.title;
    b.querySelector(".lbar i").style.width = (m / l.list.length * 100) + "%";
    b.querySelector(".ls").textContent = done ? `הושלם · ${m}/${l.list.length}` : open ? `${m}/${l.list.length} שולטים · צריך ${lessonNeed(l)}` : "ייפתח אחרי השיעור הקודם";
    if(open) b.onclick = () => { userInteracted = true; openLesson(l); };
    grid.appendChild(b);
  });
  $("certCta").hidden = !levelDone(lv.id);
  $("unlockAll").checked = !!store.unlockAll;
  const due = dueList().length;
  $("dailySub").textContent = due ? `${Math.min(due, DAILY_GOAL)} חזרות שהגיע זמנן + משפטים חדשים מהשיעור שלך` : "10 משפטים חדשים מהשיעור שלך";
}
function openList(items, title, lesson){
  currentLesson = lesson || null; list = items; idx = 0;
  $("courseHome").hidden = true; $("reviewEmpty").hidden = true;
  $("lessonBar").hidden = false; $("backHome").hidden = mode !== "course";
  $("lessonTitle").textContent = title;
  $("practiceCard").hidden = false; $("toast").hidden = true;
  show();
}
function openLesson(l){ openList(l.list, `שיעור ${l.idx + 1}: ${l.title}`, l); }
function dailyList(){
  const due = dueList().slice(0, DAILY_GOAL);
  const fresh = [];
  for(const L of [store.level, ...COURSE.map(c => c.id)]){
    for(const l of levelLessons(L)){
      if(!lessonUnlocked(l)) continue;
      l.list.forEach(s => { if(!(s.en in store.srs) && !fresh.includes(s) && !due.includes(s)) fresh.push(s); });
      if(due.length + fresh.length >= DAILY_GOAL) break;
    }
    if(due.length + fresh.length >= DAILY_GOAL) break;
  }
  return [...due, ...fresh].slice(0, DAILY_GOAL);
}
function lessonCompleted(l){
  const nxt = levelLessons(l.level)[l.idx + 1];
  const t = $("toast"); t.hidden = false;
  t.textContent = nxt ? `כל הכבוד! סיימת את "${l.title}". שיעור ${nxt.idx + 1}, "${nxt.title}", נפתח.`
    : `כל הכבוד! סיימת את השיעור האחרון ברמה. חזור למסלול כדי לקבל תעודה.`;
}
function startReview(){
  currentLesson = null;
  $("courseHome").hidden = true;
  list = dueList(); idx = 0;
  const empty = !list.length;
  $("lessonBar").hidden = empty; $("backHome").hidden = true;
  $("lessonTitle").textContent = `חזרה: ${list.length} משפטים להיום`;
  $("practiceCard").hidden = empty; $("reviewEmpty").hidden = !empty;
  $("nextDue").textContent = nextDueText();
  if(!empty) show();
}
$("dailyBtn").onclick = () => { userInteracted = true; const d = dailyList(); if(d.length) openList(d, "האימון של היום"); };
$("backHome").onclick = () => { if(hasTTS) speechSynthesis.cancel(); showHome(); };
$("unlockAll").onchange = () => { store.unlockAll = $("unlockAll").checked; save(); showHome(); };

/* ---------- תעודה ---------- */
function openCert(){
  const lv = COURSE.find(L => L.id === store.level);
  const ls = levelLessons(lv.id);
  $("certLevel").textContent = `רמת ${lv.name} (${ls.length} שיעורים)`;
  $("certStats").textContent = `${ls.reduce((a, l) => a + lessonMastered(l), 0)} משפטים בשליטה מלאה · ${streak()} ימים ברצף`;
  $("certDate").textContent = new Date().toLocaleDateString("he-IL", {day:"numeric", month:"long", year:"numeric"});
  $("certInput").value = store.certName || "";
  $("certName").textContent = store.certName || "שמך כאן";
  $("certModal").hidden = false; $("certInput").focus();
}
$("certOpen").onclick = openCert;
$("certInput").oninput = () => { store.certName = $("certInput").value.trim(); $("certName").textContent = store.certName || "שמך כאן"; save(); };
$("certClose").onclick = () => { $("certModal").hidden = true; };
$("certModal").onclick = e => { if(e.target === $("certModal")) $("certModal").hidden = true; };
document.addEventListener("keydown", e => { if(e.key === "Escape") $("certModal").hidden = true; });

function show(){
  const s = list[idx]; const challenge = $("challenge").checked;
  $("pos").textContent = `${idx + 1} / ${list.length}`;
  $("bar").style.width = ((idx + 1) / list.length * 100) + "%";
  showStatus();
  $("he").textContent = s.he;
  const en = $("en"); en.innerHTML = "";
  s.en.split(/\s+/).forEach(w => {
    const sp = document.createElement("span"); sp.className = "w"; sp.textContent = w;
    sp.onclick = () => { if(!en.classList.contains("hidden-en")) speak(cleanWord(w), 0.8); };
    en.appendChild(sp);
  });
  en.classList.toggle("hidden-en", challenge);
  $("reveal").hidden = !challenge;
  $("tip").textContent = challenge ? "" : (s.tip || "");
  $("result").hidden = true; $("fixes").innerHTML = "";
  $("selfrate").hidden = micOK;
  $("micLabel").textContent = !micOK ? "תגיד את המשפט בקול, ואז דרג את עצמך"
    : challenge ? "תגיד את המשפט באנגלית מהזיכרון" : "לחץ ותגיד את המשפט באנגלית";
  $("prev").disabled = idx === 0;
  $("next").textContent = idx === list.length - 1 ? "מההתחלה" : "הבא";
  resetRecording();
  if($("autoplay").checked && !challenge && userInteracted) speak(s.en);
}
function showStatus(){
  const s = store.srs[list[idx].en];
  if(!s){ $("status").textContent = "חדש"; return; }
  const d = Math.round((new Date(s.due) - new Date(today())) / 864e5);
  $("status").textContent = d <= 0 ? "לחזרה היום" : d === 1 ? "חוזר מחר" : `חוזר בעוד ${d} ימים`;
}
$("mic").onclick = async () => {
  userInteracted = true;
  if(!micOK){ $("selfrate").hidden = false; $("micLabel").textContent = "תגיד בקול עכשיו, ואז בחר איך הלך"; return; }
  if(listening){ stopListening(); return; }
  $("mic").classList.add("on"); $("micLabel").textContent = "רגע, פותח מיקרופון..."; $("result").hidden = true; $("fixes").innerHTML = "";
  try{
    const alts = await listenOnce(t => $("micLabel").textContent = t, () => $("micLabel").textContent = "דבר עכשיו. כשתסיים, לחץ שוב על המיקרופון.", list[idx].en);
    $("mic").classList.remove("on");
    showGrade(grade(list[idx].en, alts));
  }catch(code){ $("mic").classList.remove("on"); handleMicError(code, $("micLabel")); }
};
function noiseNote(on){
  const n = $("noiseNote"); if(!n) return;
  n.hidden = !on;
  if(on) n.textContent = "המיקרופון קלט גם דיבור או רעש מהרקע (טלוויזיה, אנשים מדברים), וזה מבלבל את הבדיקה. נסה בשקט, קרוב למחשב, או עם אוזניות עם מיקרופון.";
}
function showGrade(g){
  dlog(`ציון ${g.pct}% · מילים לתיקון: ${g.words.filter(x=>!x.ok).length}`);
  const s = list[idx]; const r = $("result"); r.hidden = false;
  r.className = "result " + ["low", "mid", "good"][g.level];
  const unclear = g.pct === 100 && lastConfidence < 0.75;
  if(unclear){ g.level = 1; r.className = "result mid"; }
  $("score").textContent = unclear ? `כל המילים זוהו, אבל ההגייה לא הייתה חדה (ביטחון ${Math.round(lastConfidence*100)}%). הקשב שוב ונסה עוד פעם.` : g.pct === 100 ? "100% · כל המילים נשמעו נכון!" : g.level === 2 ? `${g.pct}% · מעולה, זה נשמע טבעי` : g.level === 1 ? `${g.pct}% · קרוב מאוד, עוד פעם אחת` : `${g.pct}% · הקשב שוב ונסה לאט`;
  const w = $("words"); w.innerHTML = "";
  s.en.split(/\s+/).forEach((word, k) => {
    const sp = document.createElement("span"); sp.textContent = word; sp.className = g.ok[k] ? "ok" : "miss";
    if(!g.ok[k]){ sp.title = "לחץ לשמוע"; sp.onclick = () => speak(cleanWord(word), 0.75); }
    w.appendChild(sp);
  });
  const h = $("heard"); h.textContent = "שמעתי: "; const b = document.createElement("bdi"); b.textContent = g.text; h.appendChild(b);
  renderFixes($("fixes"), g.words);
  noiseNote(lastNoisy);
  $("en").classList.remove("hidden-en");
  setMastery(s.en, g.level);
  showStatus();
}
$("selfrate").addEventListener("click", e => {
  const b = e.target.closest("[data-rate]"); if(!b) return;
  setMastery(list[idx].en, +b.dataset.rate); $("en").classList.remove("hidden-en"); showStatus();
  setTimeout(() => $("next").click(), 350);
});
$("listen").onclick = () => { userInteracted = true; speak(list[idx].en); };
$("slow").onclick = () => { userInteracted = true; speak(list[idx].en, 0.65); };
$("reveal").onclick = () => { $("en").classList.remove("hidden-en"); $("tip").textContent = list[idx].tip || ""; speak(list[idx].en); };
$("recBtn").onclick = () => { userInteracted = true; toggleRecord(); };
$("playMine").onclick = playMine;
$("prev").onclick = () => { if(idx > 0){ idx--; show(); } };
$("next").onclick = () => {
  if(mode === "review"){
    const cur = list[idx]; list = dueList();
    if(!list.length){ startReview(); return; }
    const k = list.indexOf(cur); idx = k >= 0 ? (k + 1) % list.length : idx % list.length;
    $("lessonTitle").textContent = `חזרה: ${list.length} משפטים להיום`;
  }
  else idx = (idx + 1) % list.length;
  show();
};
$("challenge").onchange = () => { if((mode === "course" || mode === "review") && !$("practiceCard").hidden) show(); if(mode === "talk" && turnIdx >= 0) renderTurnTarget(); };

/* ---------- שיחות ---------- */
let scen = null, turnIdx = -1, scores = [], attempts = 0, talkRun = 0, talkMistakes = [];
function showScenarios(){
  $("scenPick").hidden = false; $("scenRun").hidden = true; turnIdx = -1; talkRun++;
  const el = $("scenList"); el.innerHTML = "";
  DIALOGUES.forEach(d => {
    const b = document.createElement("button"); b.className = "scen";
    const best = store.dialogBest[d.id];
    b.innerHTML = `<b></b><small></small>${best != null ? `<span class="best">שיא: ${best}%</span>` : ""}`;
    b.querySelector("b").textContent = d.name; b.querySelector("small").textContent = d.place;
    b.onclick = () => { userInteracted = true; runScenario(d); };
    el.appendChild(b);
  });
}
function bubble(cls, en, he, scoreTxt, scoreCls){
  const b = document.createElement("div"); b.className = "bubble " + cls;
  const t = document.createElement("div"); t.className = "t"; t.lang = "en"; t.textContent = en; b.appendChild(t);
  if(he){ const h = document.createElement("div"); h.className = "h"; h.textContent = he; b.appendChild(h); }
  if(scoreTxt){ const s = document.createElement("div"); s.className = "s " + (scoreCls || ""); s.textContent = scoreTxt; b.appendChild(s); }
  if(cls === "them") b.onclick = () => speak(en, 0.92, true);
  $("chat").appendChild(b); $("chat").scrollTop = $("chat").scrollHeight;
}
function runScenario(d){
  scen = d; turnIdx = 0; scores = []; talkMistakes = []; talkRun++; $("scenFixes").innerHTML = "";
  $("scenPick").hidden = true; $("scenRun").hidden = false; $("scenDone").hidden = true;
  $("scenTitle").textContent = d.name; $("chat").innerHTML = "";
  step(talkRun);
}
async function step(run){
  $("yourTurn").hidden = true;
  while(turnIdx < scen.turns.length && scen.turns[turnIdx].them){
    const t = scen.turns[turnIdx];
    bubble("them", t.them, t.he);
    await speak(t.them, 0.92, true);
    if(run !== talkRun) return;
    turnIdx++;
  }
  if(turnIdx >= scen.turns.length){ finishScenario(); return; }
  attempts = 0; $("ytFixes").innerHTML = ""; $("ytFixes").hidden = true;
  $("yourTurn").hidden = false; $("ytSelf").hidden = micOK;
  $("ytHe").textContent = scen.turns[turnIdx].he;
  renderTurnTarget();
  $("ytLabel").textContent = micOK ? "לחץ וענה" : "ענה בקול, ואז לחץ 'אמרתי'";
}
function renderTurnTarget(){
  const t = scen && scen.turns[turnIdx]; if(!t || !t.you) return;
  $("ytEn").textContent = t.you;
  $("ytEn").classList.toggle("hidden-en", $("challenge").checked);
}
function acceptAnswer(text, pct){
  const lvl = pct == null ? 2 : pct >= 85 ? 2 : pct >= 60 ? 1 : 0;
  scores.push(pct == null ? 100 : pct);
  bubble("you", text, null, pct == null ? "" : `${pct}%`, ["low", "mid", ""][lvl]);
  countPractice();
  turnIdx++; step(talkRun);
}
$("ytMic").onclick = async () => {
  if(!micOK){ $("ytSelf").hidden = false; return; }
  if(listening){ stopListening(); return; }
  const target = scen.turns[turnIdx].you;
  $("ytMic").classList.add("on"); $("ytLabel").textContent = "רגע, פותח מיקרופון...";
  try{
    const alts = await listenOnce(t => $("ytLabel").textContent = t, () => $("ytLabel").textContent = "דבר עכשיו", target);
    $("ytMic").classList.remove("on");
    const g = grade(target, alts); attempts++;
    if(g.pct >= 60 || attempts >= 3){
      g.words.forEach(x => { if(!x.ok && cleanWord(x.word) && !talkMistakes.some(m => m.word === x.word)) talkMistakes.push(x); });
      acceptAnswer(target, g.pct);
    } else {
      $("ytLabel").textContent = `${g.pct}% · תקן את המילים למטה ונסה שוב`; $("ytEn").classList.remove("hidden-en");
      renderFixes($("ytFixes"), g.words, 3);
    }
  }catch(code){ $("ytMic").classList.remove("on"); handleMicError(code, $("ytLabel")); if(!micOK) $("ytSelf").hidden = false; }
};
$("ytSelf").addEventListener("click", e => {
  const b = e.target.closest("[data-rate]"); if(!b) return;
  if(b.dataset.rate === "2") acceptAnswer(scen.turns[turnIdx].you, null);
  else { $("ytEn").classList.remove("hidden-en"); speak(scen.turns[turnIdx].you); }
});
$("ytListen").onclick = () => { $("ytEn").classList.remove("hidden-en"); speak(scen.turns[turnIdx].you, 0.8); };
$("ytSkip").onclick = () => { scores.push(0); bubble("you", scen.turns[turnIdx].you, "דילגת", "", "low"); turnIdx++; step(talkRun); };
function finishScenario(){
  $("yourTurn").hidden = true;
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  store.dialogBest[scen.id] = Math.max(store.dialogBest[scen.id] || 0, avg); save();
  $("scenDone").hidden = false;
  renderFixes($("scenFixes"), talkMistakes, 6);
  $("scenScore").textContent = avg >= 85 ? `${avg}% · ניהלת שיחה שלמה באנגלית!` : avg >= 60 ? `${avg}% · שיחה טובה. עוד סבב ואתה שם.` : `${avg}% · התחלה טובה. נסה שוב, הפעם יהיה קל יותר.`;
}
$("scenBack").onclick = $("scenOthers").onclick = () => { if(hasTTS) speechSynthesis.cancel(); showScenarios(); };
$("scenAgain").onclick = () => runScenario(scen);

/* ---------- האזנה ---------- */
const Q_LEN = 10;
let quiz = [], qi = 0, qRight = 0;
function startQuiz(){
  const src = ALL.slice();
  for(let i = src.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [src[i], src[j]] = [src[j], src[i]]; }
  quiz = src.slice(0, Q_LEN); qi = 0; qRight = 0;
  $("quizCard").hidden = false; $("quizDone").hidden = true; showQ();
}
function showQ(){
  const q = quiz[qi];
  $("qPos").textContent = `שאלה ${qi + 1} / ${Q_LEN}`;
  $("qBar").style.width = ((qi + 1) / Q_LEN * 100) + "%";
  $("qScore").textContent = `${qRight} נכונות`;
  $("qReveal").hidden = true; $("qNext").disabled = true;
  const others = ALL.filter(s => s.en !== q.en).sort(() => Math.random() - .5).slice(0, 3);
  const opts = [q, ...others].sort(() => Math.random() - .5);
  const el = $("qOpts"); el.innerHTML = "";
  opts.forEach(o => {
    const b = document.createElement("button"); b.className = "opt"; b.textContent = o.he;
    b.onclick = () => {
      if(!$("qNext").disabled) return;
      const right = o === q; if(right) qRight++;
      b.classList.add(right ? "right" : "wrong");
      [...el.children].forEach((c, k) => { if(opts[k] === q) c.classList.add("right"); });
      $("qReveal").textContent = q.en; $("qReveal").hidden = false;
      $("qScore").textContent = `${qRight} נכונות`;
      $("qNext").disabled = false; $("qNext").textContent = qi === Q_LEN - 1 ? "סיום" : "הבא";
      if(right) countPractice();
    };
    el.appendChild(b);
  });
  if(userInteracted) speak(q.en);
}
$("qPlay").onclick = () => speak(quiz[qi].en);
$("qSlow").onclick = () => speak(quiz[qi].en, 0.65);
$("qNext").onclick = () => {
  if(qi < Q_LEN - 1){ qi++; showQ(); return; }
  $("quizCard").hidden = true; $("quizDone").hidden = false;
  $("qFinal").textContent = `${qRight} / ${Q_LEN}`;
  $("qMsg").textContent = qRight >= 9 ? "האוזן שלך כבר באנגלית. נסה שיחה!" : qRight >= 6 ? "יפה מאוד. עוד סבב או שניים ותשמע הכל." : "כל סבב מאמן את האוזן. נסה שוב.";
};
$("qRestart").onclick = startQuiz;

/* ---------- מבטא: זוגות מילים ---------- */
let accU = null, axR = [], axI = 0, axRight = 0, axDone = false;
const shuffle = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function showUnits(){
  $("accHome").hidden = false; $("accUnit").hidden = true;
  const el = $("units"); el.innerHTML = "";
  ACCENT.forEach(u => {
    const b = document.createElement("button"); b.className = "unit";
    const best = store.accentBest[u.id];
    b.innerHTML = `<span class="sym"></span><b></b><small></small>${best != null ? `<span class="best">שיא: ${best}%</span>` : ""}`;
    b.querySelector(".sym").textContent = u.sound; b.querySelector("b").textContent = u.name; b.querySelector("small").textContent = u.short;
    b.onclick = () => { userInteracted = true; openUnit(u); };
    el.appendChild(b);
  });
}
function openUnit(u){
  accU = u;
  $("accHome").hidden = true; $("accUnit").hidden = false;
  $("accLearn").hidden = false; $("accEx").hidden = true; $("accDone").hidden = true;
  $("accTitle").textContent = `${u.name} · ${u.short}`;
  $("accExplain").textContent = u.explain;
  const how = $("accHow"); how.innerHTML = "";
  u.how.forEach(t => { const li = document.createElement("li"); li.textContent = t; how.appendChild(li); });
  const pr = $("accPairs"); pr.innerHTML = "";
  u.pairs.forEach(p => {
    const d = document.createElement("div"); d.className = "pair";
    [[p[0], p[2]], [p[1], p[3]]].forEach(([w, m]) => {
      const b = document.createElement("button");
      b.innerHTML = `<span class="pw"></span><span class="pm"></span>`;
      b.querySelector(".pw").textContent = w; b.querySelector(".pm").textContent = m;
      b.onclick = () => speak(w, 0.75);
      d.appendChild(b);
    });
    pr.appendChild(d);
  });
}
function startAccent(){
  const listen = shuffle(accU.pairs).map(p => ({type:"listen", p, pick: Math.random() < .5 ? 0 : 1}));
  const say = shuffle(accU.pairs).map(p => ({type:"say", p, pick: Math.random() < .5 ? 0 : 1}));
  axR = [...listen, ...say]; axI = 0; axRight = 0;
  $("accLearn").hidden = true; $("accDone").hidden = true; $("accEx").hidden = false;
  showRound();
}
function showRound(){
  const r = axR[axI], w = r.p[r.pick], m = r.p[r.pick + 2];
  axDone = false;
  $("axPos").textContent = `${axI + 1} / ${axR.length}`;
  $("axBar").style.width = ((axI + 1) / axR.length * 100) + "%";
  $("axScore").textContent = `${axRight} נכונות`;
  $("axRes").hidden = true; $("axNext").disabled = true;
  $("axNext").textContent = axI === axR.length - 1 ? "סיום" : "הבא";
  $("axListen").hidden = r.type !== "listen"; $("axSay").hidden = r.type !== "say";
  if(r.type === "listen"){
    $("axQ").textContent = "איזו מילה שמעת?";
    const c = $("axChoices"); c.innerHTML = "";
    [0, 1].forEach(k => {
      const b = document.createElement("button"); b.className = "opt";
      b.innerHTML = `<bdi lang="en"></bdi><span></span>`;
      b.querySelector("bdi").textContent = r.p[k]; b.querySelector("span").textContent = r.p[k + 2];
      b.onclick = () => {
        if(axDone) return; axDone = true;
        const ok = k === r.pick; if(ok) axRight++;
        b.classList.add(ok ? "right" : "wrong");
        c.children[r.pick].classList.add("right");
        axResult(ok, ok ? "נכון!" : `השמעתי "${w}" (${m}). בחרת "${r.p[k]}".`, ok ? "" : "הקשב לשתיהן אחת אחרי השנייה:");
        if(!ok) speak(w, 0.7).then(() => sleep(300)).then(() => speak(r.p[k], 0.7));
        $("axNext").disabled = false; countPractice();
      };
      c.appendChild(b);
    });
    if(userInteracted) speak(w, 0.85);
  } else {
    $("axQ").textContent = "תגיד את המילה";
    $("axWord").textContent = w; $("axMean").textContent = m;
    $("axSelf").hidden = micOK;
    $("axLabel").textContent = micOK ? "לחץ ותגיד את המילה" : "תגיד בקול, ואז דרג את עצמך";
  }
}
function axResult(ok, main, sub){
  const el = $("axRes"); el.hidden = false; el.className = "axres " + (ok ? "good" : "bad");
  el.innerHTML = `<span></span><span class="sub"></span>`;
  el.firstChild.textContent = main; el.lastChild.textContent = sub || "";
}
$("axMic").onclick = async () => {
  userInteracted = true;
  if(!micOK){ $("axSelf").hidden = false; return; }
  if(listening){ stopListening(); return; }
  const r = axR[axI], w = r.p[r.pick], other = r.p[1 - r.pick], om = r.p[3 - r.pick];
  $("axMic").classList.add("on"); $("axLabel").textContent = "רגע, פותח מיקרופון...";
  try{
    const alts = await listenOnce(t => $("axLabel").textContent = t, () => $("axLabel").textContent = "תגיד את המילה עכשיו", w);
    $("axMic").classList.remove("on");
    const words = alts.flatMap(a => norm(a));
    const hit = words.includes(w.toLowerCase()), conf = words.includes(other.toLowerCase());
    const first = !axDone; axDone = true;
    if(hit && !(conf && norm(alts[0])[0] === other.toLowerCase())){
      if(first) axRight++;
      axResult(true, `מצוין! שמעתי "${w}".`, first ? "" : "הפעם יצא נכון. הניסיון הראשון כבר נספר.");
    } else if(conf){
      axResult(false, `שמעתי "${other}" (${om}) במקום "${w}".`, accU.how[0] + " לחץ על המיקרופון ונסה שוב.");
      speak(w, 0.7);
    } else {
      axResult(false, `שמעתי "${norm(alts[0]).join(" ")}".`, "המילה לא זוהתה. הקשב לה, ונסה שוב לאט וברור.");
    }
    $("axLabel").textContent = "לחץ כדי לנסות שוב";
    $("axNext").disabled = false; if(first) countPractice();
  }catch(code){ $("axMic").classList.remove("on"); handleMicError(code, $("axLabel")); if(!micOK) $("axSelf").hidden = false; }
};
$("axSelf").addEventListener("click", e => {
  const b = e.target.closest("[data-ok]"); if(!b || axDone) return;
  axDone = true; const ok = b.dataset.ok === "1"; if(ok) axRight++;
  axResult(ok, ok ? "יופי!" : "תקשיב שוב ונסה כמה פעמים לבד.", ok ? "" : accU.how[0]);
  $("axNext").disabled = false; countPractice();
});
$("axPlay").onclick = () => { const r = axR[axI]; speak(r.p[r.pick], 0.85); };
$("axSlow").onclick = () => { const r = axR[axI]; speak(r.p[r.pick], 0.55); };
$("axHear").onclick = () => { const r = axR[axI]; speak(r.p[r.pick], 0.7); };
$("axNext").onclick = () => { if(axI < axR.length - 1){ axI++; showRound(); } else accentDone(); };
function accentDone(){
  const pct = Math.round(axRight / axR.length * 100);
  store.accentBest[accU.id] = Math.max(store.accentBest[accU.id] || 0, pct); save();
  $("accEx").hidden = true; $("accDone").hidden = false;
  $("adScore").textContent = `${axRight} / ${axR.length}`;
  $("adMsg").textContent = pct >= 85 ? "מעולה! האוזן והפה שלך כבר מבדילים בין הצלילים." : pct >= 60 ? "יפה. עוד סבב אחד ותרגיש את ההבדל." : "זה צליל קשה לכל דובר עברית. חזור על ההסבר ונסה שוב.";
  $("twEn").textContent = accU.twister[0]; $("twHe").textContent = accU.twister[1];
  $("twWords").innerHTML = ""; $("twLabel").textContent = micOK ? "לחץ ותגיד את כל המשפט" : "תגיד את המשפט בקול 3 פעמים, כל פעם קצת יותר מהר.";
}
$("twHear").onclick = () => speak(accU.twister[0]);
$("twSlow").onclick = () => speak(accU.twister[0], 0.6);
$("twMic").onclick = async () => {
  if(!micOK) return;
  if(listening){ stopListening(); return; }
  const t = accU.twister[0];
  $("twMic").classList.add("on"); $("twLabel").textContent = "רגע, פותח מיקרופון...";
  try{
    const alts = await listenOnce(x => $("twLabel").textContent = x, () => $("twLabel").textContent = "דבר עכשיו", t);
    $("twMic").classList.remove("on");
    const g = grade(t, alts);
    $("twLabel").textContent = g.pct >= 85 ? `${g.pct}% · מצוין!` : `${g.pct}% · לחץ על מילה אדומה כדי לשמוע אותה`;
    const w = $("twWords"); w.innerHTML = "";
    t.split(/\s+/).forEach((word, k) => {
      const sp = document.createElement("span"); sp.textContent = word; sp.className = g.ok[k] ? "ok" : "miss";
      if(!g.ok[k]) sp.onclick = () => speak(cleanWord(word), 0.7);
      w.appendChild(sp);
    });
    countPractice();
  }catch(code){ $("twMic").classList.remove("on"); handleMicError(code, $("twLabel")); }
};
$("accStart").onclick = () => { userInteracted = true; startAccent(); };
$("accBack").onclick = $("adOther").onclick = () => { if(hasTTS) speechSynthesis.cancel(); showUnits(); };
$("adAgain").onclick = startAccent;

/* ---------- התחלה ---------- */
try{ const v = localStorage.getItem(KEY + "-voice"); if(v) $("voiceSel").value = v; }catch(e){}
$("engineSel").value = store.engine || "auto";
$("engineSel").onchange = () => { store.engine = $("engineSel").value; forceBrowser = false; browserFails = 0; save(); showEngine(); if(engine() === "local") LocalASR.load().then(showEngine, showEngine); };
showEngine();
// טוענים את המנוע היציב ברקע כבר בלחיצה הראשונה, כדי שלא נחכה באמצע תרגול
document.addEventListener("pointerdown", () => { if(engine() === "local"){ LocalASR.prime(); LocalASR.load().then(showEngine, () => { forceBrowser = !!SR; showEngine(); }); showEngine(); } }, {once:true});
$("voiceSel").onchange = () => { try{ localStorage.setItem(KEY + "-voice", $("voiceSel").value); }catch(e){} };
document.addEventListener("pointerdown", () => { userInteracted = true; }, {once:true});
renderStats();
setMode("course");
})();
