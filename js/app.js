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
let rec = null, micOK = !!SR, listening = false;
function micFallback(msg){
  micOK = false;
  $("micNote").hidden = false; $("micNote").textContent = msg;
  $("selfrate").hidden = false;
  $("micLabel").textContent = "תגיד את המשפט בקול, ואז דרג את עצמך";
  $("ytLabel").textContent = "ענה בקול, ואז לחץ 'אמרתי'";
}
const NO_MIC_MSG = "המיקרופון לא זמין כאן, אז עובדים בדירוג עצמי. לציון אוטומטי פתח את index.html מתיקיית הפרויקט בכרום או באדג' ואשר גישה למיקרופון.";
if(!SR) setTimeout(() => micFallback("הדפדפן הזה לא מזהה דיבור, אז עובדים בדירוג עצמי. לציון אוטומטי פתח את האפליקציה בכרום או באדג'."), 0);

// כל האזנה יוצרת מזהה דיבור חדש. שימוש חוזר באותו מזהה נתקע בכרום אחרי כמה פעמים.
let lastConfidence = 1;
function listenOnce(onInterim){
  return new Promise((resolve, reject) => {
    if(!SR){ reject("no-sr"); return; }
    if(rec && listening){ try{ rec.abort(); }catch(e){} }
    const r = new SR(); rec = r;
    let finals = [], interim = "", settled = false, heardAnything = false;
    const done = (ok, val) => { if(settled) return; settled = true; clearTimeout(guard); listening = false; ok ? resolve(val) : reject(val); };
    r.lang = $("voiceSel").value === "gb" ? "en-GB" : "en-US";
    r.interimResults = true; r.maxAlternatives = 4; r.continuous = false;
    r.onresult = e => {
      heardAnything = true;
      let text = "";
      for(let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + " ";
      interim = text.trim();
      onInterim && onInterim(interim);
      const last = e.results[e.results.length - 1];
      if(last.isFinal){
        const prefix = [...e.results].slice(0, -1).map(x => x[0].transcript).join(" ");
        finals = [...last].map(a => (prefix + " " + a.transcript).trim());
        lastConfidence = typeof last[0].confidence === "number" && last[0].confidence > 0 ? last[0].confidence : 1;
      }
    };
    r.onerror = e => {
      // אם כבר נשמע משהו, עדיף לבדוק אותו מאשר להציג שגיאה
      if(interim && (e.error === "aborted" || e.error === "no-speech" || e.error === "network")) done(true, finals.length ? finals : [interim]);
      else done(false, e.error);
    };
    r.onend = () => {
      if(finals.length) done(true, finals);
      else if(interim){ lastConfidence = 1; done(true, [interim]); }
      else done(false, heardAnything ? "no-match" : "no-speech");
    };
    // שומר בטיחות: אם הדפדפן לא סוגר את ההאזנה, עוצרים לבד אחרי 12 שניות
    const guard = setTimeout(() => { try{ r.stop(); }catch(e){} setTimeout(() => r.onend(), 1500); }, 12000);
    try{ if(hasTTS) speechSynthesis.cancel(); r.start(); listening = true; }
    catch(e){ done(false, "busy"); }
  });
}
function stopListening(){ if(rec && listening){ try{ rec.stop(); }catch(e){} } }
function handleMicError(code, labelEl){
  if(code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture" || code === "no-sr") micFallback(NO_MIC_MSG);
  else if(code === "no-speech") labelEl.textContent = "לא שמעתי כלום. דבר קרוב יותר למיקרופון, ותתחיל לדבר מיד אחרי הלחיצה.";
  else if(code === "no-match") labelEl.textContent = "שמעתי קול אבל לא הצלחתי לזהות מילים. נסה שוב לאט וברור.";
  else if(code === "network") labelEl.textContent = "זיהוי הדיבור צריך חיבור לאינטרנט. בדוק חיבור ונסה שוב.";
  else if(code === "busy") labelEl.textContent = "המיקרופון עוד היה תפוס. לחץ שוב.";
  else labelEl.textContent = `ההאזנה נעצרה (${code}). לחץ שוב על המיקרופון.`;
}

/* ---------- ציון ---------- */
const norm = t => t.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
const NUMS = {zero:"0",one:"1",two:"2",three:"3",four:"4",five:"5",six:"6",seven:"7",eight:"8",nine:"9",ten:"10",eleven:"11",fifty:"50"};
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
  btn.classList.add("on"); res.className = "fix-res"; res.textContent = "מקשיב... תגיד רק את המילה";
  try{
    const alts = await listenOnce(t => res.textContent = t);
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
  const m = store.mastery[list[idx].en];
  $("status").textContent = m >= 2 ? "שולט" : m === 1 ? "כמעט" : m === 0 ? "לחזרה" : "";
}
$("mic").onclick = async () => {
  userInteracted = true;
  if(!micOK){ $("selfrate").hidden = false; $("micLabel").textContent = "תגיד בקול עכשיו, ואז בחר איך הלך"; return; }
  if(listening){ stopListening(); return; }
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
  $("ytMic").classList.add("on"); $("ytLabel").textContent = "מקשיב...";
  try{
    const alts = await listenOnce(t => $("ytLabel").textContent = t);
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

/* ---------- התחלה ---------- */
try{ const v = localStorage.getItem(KEY + "-voice"); if(v) $("voiceSel").value = v; }catch(e){}
$("voiceSel").onchange = () => { try{ localStorage.setItem(KEY + "-voice", $("voiceSel").value); }catch(e){} };
document.addEventListener("pointerdown", () => { userInteracted = true; }, {once:true});
renderStats();
selectTopic("daily");
})();
