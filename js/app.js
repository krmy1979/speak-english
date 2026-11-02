// ===== מדברים אנגלית — לוגיקת האפליקציה =====
(function(){
const $ = id => document.getElementById(id);
const ALL = TOPICS.flatMap(t => t.items.map(i => ({en:i[0], he:i[1], tip:i[2], topic:t.id})));
const DAILY_GOAL = 10;

/* ---------- שמירת התקדמות ---------- */
const KEY = "speak-en-v2";
let store = {mastery:{}, days:{}, dialogBest:{}};
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
const dayKey = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0,10); };
const today = () => dayKey(new Date());

function countPractice(){ const d = today(); store.days[d] = (store.days[d] || 0) + 1; save(); renderStats(); }
function setMastery(en, level){ store.mastery[en] = level; countPractice(); }
function streak(){
  let n = 0; const dt = new Date();
  if(!store.days[today()]) dt.setDate(dt.getDate() - 1);
  while(store.days[dayKey(dt)]){ n++; dt.setDate(dt.getDate() - 1); }
  return n;
}
function reviewList(){ return ALL.filter(s => s.en in store.mastery && store.mastery[s.en] < 2); }
function renderStats(){
  const done = store.days[today()] || 0;
  $("goalTxt").textContent = `${Math.min(done, 99)}/${DAILY_GOAL}`;
  $("goalRing").style.strokeDashoffset = 157.1 * (1 - Math.min(done / DAILY_GOAL, 1));
  $("sStreak").textContent = streak();
  $("sMastered").textContent = Object.values(store.mastery).filter(v => v >= 2).length;
  const r = reviewList().length;
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
let rec = SR ? new SR() : null, micOK = !!rec, listening = false;
function micFallback(msg){
  micOK = false;
  $("micNote").hidden = false; $("micNote").textContent = msg;
  $("selfrate").hidden = false;
  $("micLabel").textContent = "תגיד את המשפט בקול, ואז דרג את עצמך";
  $("ytLabel").textContent = "ענה בקול, ואז לחץ 'אמרתי'";
}
const NO_MIC_MSG = "המיקרופון לא זמין כאן, אז עובדים בדירוג עצמי. לציון אוטומטי פתח את index.html מתיקיית הפרויקט בכרום או באדג' ואשר גישה למיקרופון.";
if(!rec) setTimeout(() => micFallback("הדפדפן הזה לא מזהה דיבור, אז עובדים בדירוג עצמי. לציון אוטומטי פתח את האפליקציה בכרום או באדג'."), 0);

function listenOnce(onInterim){
  return new Promise((resolve, reject) => {
    if(!rec){ reject("no-sr"); return; }
    let finals = [];
    rec.lang = $("voiceSel").value === "gb" ? "en-GB" : "en-US";
    rec.interimResults = true; rec.maxAlternatives = 4; rec.continuous = false;
    rec.onresult = e => {
      const r = e.results[e.results.length - 1];
      onInterim && onInterim(r[0].transcript);
      if(r.isFinal) finals = [...r].map(a => a.transcript);
    };
    rec.onerror = e => { listening = false; reject(e.error); };
    rec.onend = () => { listening = false; finals.length ? resolve(finals) : reject("no-speech"); };
    try{ if(hasTTS) speechSynthesis.cancel(); rec.start(); listening = true; }
    catch(e){ listening = false; reject("busy"); }
  });
}
function handleMicError(code, labelEl){
  if(code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture" || code === "no-sr") micFallback(NO_MIC_MSG);
  else if(code === "no-speech") labelEl.textContent = "לא שמעתי. נסה שוב, קצת יותר קרוב.";
  else if(code === "network") labelEl.textContent = "זיהוי הדיבור צריך חיבור לאינטרנט. בדוק חיבור ונסה שוב.";
  else if(code !== "aborted") labelEl.textContent = "משהו השתבש. נסה שוב.";
}

/* ---------- ציון ---------- */
const norm = t => t.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
const NUMS = {zero:"0",one:"1",two:"2",three:"3",four:"4",five:"5",six:"6",seven:"7",eight:"8",nine:"9",ten:"10",eleven:"11",fifty:"50"};
const canon = w => { w = w.replace(/'/g, ""); return NUMS[w] || w; };
function marks(target, said){
  const T = target.map(canon), S = said.map(canon), n = T.length, m = S.length;
  const dp = Array.from({length:n+1}, () => new Array(m+1).fill(0));
  for(let i = n-1; i >= 0; i--) for(let j = m-1; j >= 0; j--)
    dp[i][j] = T[i] === S[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
  const ok = new Array(n).fill(false); let i = 0, j = 0;
  while(i < n && j < m){ if(T[i] === S[j]){ ok[i] = true; i++; j++; } else if(dp[i+1][j] >= dp[i][j+1]) i++; else j++; }
  return ok;
}
function grade(targetText, alts){
  // מתעלם מ"..." ומספרים שנכתבו כספרות
  const target = norm(targetText.replace(/\d/g, d => " " + Object.keys(NUMS).find(k => NUMS[k] === d) + " "));
  let best = null;
  for(const a of alts){
    const ok = marks(target, norm(a)); const sc = ok.filter(Boolean).length / Math.max(target.length, 1);
    if(!best || sc > best.sc) best = {sc, ok, text:a};
  }
  best.pct = Math.round(best.sc * 100);
  best.level = best.pct >= 85 ? 2 : best.pct >= 60 ? 1 : 0;
  return best;
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
let mode = "practice";
function setMode(m){
  mode = m;
  document.querySelectorAll(".mode").forEach(b => b.setAttribute("aria-selected", String(b.dataset.mode === m)));
  if(listening && rec) rec.abort();
  if(hasTTS) speechSynthesis.cancel();
  $("view-practice").hidden = !(m === "practice" || m === "review");
  $("view-talk").hidden = m !== "talk";
  $("view-listen").hidden = m !== "listen";
  if(m === "practice"){ $("topics").hidden = false; selectTopic(currentTopic); }
  if(m === "review") startReview();
  if(m === "talk") showScenarios();
  if(m === "listen") startQuiz();
}
document.querySelectorAll(".mode").forEach(b => b.onclick = () => { userInteracted = true; setMode(b.dataset.mode); });

/* ---------- משפטים ---------- */
let list = [], idx = 0, currentTopic = "daily";
function dailyList(){
  const seed = [...today()].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  let r = seed; const rnd = () => ((r = (r * 1103515245 + 12345) >>> 0) / 4294967296);
  const fresh = ALL.filter(s => (store.mastery[s.en] || 0) < 2);
  const src = (fresh.length >= DAILY_GOAL ? fresh : ALL).slice();
  for(let i = src.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [src[i], src[j]] = [src[j], src[i]]; }
  return src.slice(0, DAILY_GOAL);
}
function renderTopics(){
  const el = $("topics"); el.innerHTML = "";
  const mk = (id, name, cls) => {
    const b = document.createElement("button"); b.className = "chip" + (cls ? " " + cls : ""); b.textContent = name;
    b.setAttribute("aria-pressed", String(id === currentTopic)); b.onclick = () => { userInteracted = true; selectTopic(id); };
    el.appendChild(b);
  };
  mk("daily", "10 של היום", "daily");
  TOPICS.forEach(t => mk(t.id, t.name));
}
function selectTopic(id){
  currentTopic = id; idx = 0;
  list = id === "daily" ? dailyList() : ALL.filter(s => s.topic === id);
  renderTopics(); $("practiceCard").hidden = false; $("reviewEmpty").hidden = true; show();
}
function startReview(){
  $("topics").hidden = true; idx = 0; list = reviewList();
  const empty = !list.length;
  $("practiceCard").hidden = empty; $("reviewEmpty").hidden = !empty;
  if(!empty) show();
}
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
  $("result").hidden = true;
  $("selfrate").hidden = micOK;
  $("micLabel").textContent = !micOK ? "תגיד את המשפט בקול, ואז דרג את עצמך"
    : challenge ? "תגיד את המשפט באנגלית מהזיכרון" : "לחץ ותגיד את המשפט באנגלית";
  $("prev").disabled = idx === 0;
  $("next").textContent = idx === list.length - 1 ? "מההתחלה" : "הבא";
  resetRecording();
  if($("autoplay").checked && !challenge && userInteracted) speak(s.en);
}
function showStatus(){
  const m = store.mastery[list[idx].en];
  $("status").textContent = m >= 2 ? "שולט" : m === 1 ? "כמעט" : m === 0 ? "לחזרה" : "";
}
$("mic").onclick = async () => {
  userInteracted = true;
  if(!micOK){ $("selfrate").hidden = false; $("micLabel").textContent = "תגיד בקול עכשיו, ואז בחר איך הלך"; return; }
  if(listening){ rec.stop(); return; }
  $("mic").classList.add("on"); $("micLabel").textContent = "מקשיב... דבר עכשיו"; $("result").hidden = true;
  try{
    const alts = await listenOnce(t => $("micLabel").textContent = t);
    $("mic").classList.remove("on");
    showGrade(grade(list[idx].en, alts));
  }catch(code){ $("mic").classList.remove("on"); handleMicError(code, $("micLabel")); }
};
function showGrade(g){
  const s = list[idx]; const r = $("result"); r.hidden = false;
  r.className = "result " + ["low", "mid", "good"][g.level];
  $("score").textContent = g.level === 2 ? `${g.pct}% · מעולה, זה נשמע טבעי` : g.level === 1 ? `${g.pct}% · קרוב מאוד, עוד פעם אחת` : `${g.pct}% · הקשב שוב ונסה לאט`;
  const w = $("words"); w.innerHTML = "";
  s.en.split(/\s+/).forEach((word, k) => {
    const sp = document.createElement("span"); sp.textContent = word; sp.className = g.ok[k] ? "ok" : "miss";
    if(!g.ok[k]){ sp.title = "לחץ לשמוע"; sp.onclick = () => speak(cleanWord(word), 0.75); }
    w.appendChild(sp);
  });
  const h = $("heard"); h.textContent = "שמעתי: "; const b = document.createElement("bdi"); b.textContent = g.text; h.appendChild(b);
  $("en").classList.remove("hidden-en");
  // בחזרה: שומרים את הציון הטוב ביותר; בתרגול רגיל: את האחרון
  const prev = store.mastery[s.en];
  setMastery(s.en, mode === "review" ? Math.max(prev || 0, g.level) : g.level);
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
  if(mode === "review"){ list = reviewList(); if(!list.length){ startReview(); return; } idx = idx % list.length; }
  else idx = (idx + 1) % list.length;
  show();
};
$("challenge").onchange = () => { if(mode === "practice" || mode === "review") show(); if(mode === "talk" && turnIdx >= 0) renderTurnTarget(); };

/* ---------- שיחות ---------- */
let scen = null, turnIdx = -1, scores = [], attempts = 0, talkRun = 0;
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
  scen = d; turnIdx = 0; scores = []; talkRun++;
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
  attempts = 0;
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
  if(listening){ rec.stop(); return; }
  const target = scen.turns[turnIdx].you;
  $("ytMic").classList.add("on"); $("ytLabel").textContent = "מקשיב...";
  try{
    const alts = await listenOnce(t => $("ytLabel").textContent = t);
    $("ytMic").classList.remove("on");
    const g = grade(target, alts); attempts++;
    if(g.pct >= 60 || attempts >= 3) acceptAnswer(target, g.pct);
    else { $("ytLabel").textContent = `${g.pct}% · לחץ "איך אומרים", ואז נסה שוב`; $("ytEn").classList.remove("hidden-en"); }
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

/* ---------- התחלה ---------- */
try{ const v = localStorage.getItem(KEY + "-voice"); if(v) $("voiceSel").value = v; }catch(e){}
$("voiceSel").onchange = () => { try{ localStorage.setItem(KEY + "-voice", $("voiceSel").value); }catch(e){} };
document.addEventListener("pointerdown", () => { userInteracted = true; }, {once:true});
renderStats();
selectTopic("daily");
})();
