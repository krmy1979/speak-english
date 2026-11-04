// ===== מנוע זיהוי דיבור מקומי =====
// מקליט ישירות מהמיקרופון (עובד יציב גם באייפון), מזהה מתי סיימת לדבר,
// ומתמלל עם מודל בינה מלאכותית קטן (Whisper) שרץ בתוך הדפדפן.
// המודל יורד פעם אחת (בערך 40MB) ונשמר בדפדפן. אין שליחת הקלטות לשום שרת.
(function(){
  const LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1";
  const MODEL = "Xenova/whisper-tiny.en";
  let ctx = null, asr = null, loading = null, loadPct = 0;

  function prime(){
    // חייב לרוץ בתוך הלחיצה עצמה, אחרת אייפון משאיר את האודיו כבוי
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    if(!ctx) ctx = new AC();
    if(ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function load(onProgress){
    if(asr) return Promise.resolve(asr);
    if(!loading){
      loading = (async () => {
        const T = await import(LIB);
        T.env.allowLocalModels = false;
        const files = {};
        asr = await T.pipeline("automatic-speech-recognition", MODEL, {
          progress_callback: p => {
            if(p.status === "progress" && p.total){
              files[p.file] = [p.loaded, p.total];
              const v = Object.values(files);
              loadPct = Math.round(v.reduce((a, b) => a + b[0], 0) / v.reduce((a, b) => a + b[1], 0) * 100);
              LocalASR.onProgress && LocalASR.onProgress(loadPct);
            }
          }
        });
        loadPct = 100;
        return asr;
      })().catch(e => { loading = null; throw e; });
    }
    if(onProgress){ const prev = LocalASR.onProgress; LocalASR.onProgress = p => { prev && prev(p); onProgress(p); }; }
    return loading;
  }

  // הקלטה עד שקט. מחזיר {done: Promise<Float32Array 16kHz | null>, stop()}
  function record(opts = {}){
    const c = prime();
    let stopFlag = false, stream = null, node = null, src = null;
    const stop = () => { stopFlag = true; };
    const done = (async () => {
      if(!c) throw "no-sr";
      try{
        stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}});
      }catch(e){ throw (e && e.name === "NotAllowedError") ? "not-allowed" : "audio-capture"; }
      if(c.state === "suspended"){ try{ await c.resume(); }catch(e){} }
      src = c.createMediaStreamSource(stream);
      node = c.createScriptProcessor(4096, 1, 1);
      const sink = c.createGain(); sink.gain.value = 0;
      src.connect(node); node.connect(sink); sink.connect(c.destination);
      const rate = c.sampleRate, chunkMs = 4096 / rate * 1000;
      const chunks = [];
      let floor = null, calib = [], speechAt = -1, loud = 0, quietMs = 0, elapsed = 0, maxRms = 0;
      opts.onReady && opts.onReady();
      await new Promise(resolve => {
        node.onaudioprocess = e => {
          const d = new Float32Array(e.inputBuffer.getChannelData(0));
          chunks.push(d); elapsed += chunkMs;
          let sum = 0; for(let i = 0; i < d.length; i++) sum += d[i] * d[i];
          const rms = Math.sqrt(sum / d.length);
          opts.onLevel && opts.onLevel(rms);
          if(rms > maxRms) maxRms = rms;
          if(floor === null){
            calib.push(rms);
            if(elapsed >= 250) floor = Math.min(0.02, Math.min(...calib)); // גם אם התחלת לדבר מיד
            if(stopFlag) resolve();
            return;
          }
          const thr = Math.max(0.012, floor * 3.5);
          if(speechAt < 0){
            loud = rms > thr ? loud + 1 : 0;
            if(loud >= 2){ speechAt = chunks.length - 3; opts.onSpeech && opts.onSpeech(); }
            else if(elapsed > 8000) stopFlag = true;
          } else {
            quietMs = rms > thr * 0.7 ? 0 : quietMs + chunkMs;
            if(quietMs > 1100) stopFlag = true;
          }
          if(elapsed > 12000) stopFlag = true;
          if(stopFlag) resolve();
        };
      });
      try{ node.disconnect(); src.disconnect(); sink.disconnect(); }catch(e){}
      stream.getTracks().forEach(t => t.stop());
      if(speechAt < 0 && maxRms < 0.02) return null;
      if(speechAt < 0) speechAt = 0; // עצרת ידנית אחרי שדיברת חלש: בודקים הכול
      // חותכים שקט בהתחלה, משאירים מעט מרווח
      const used = chunks.slice(Math.max(0, speechAt - 2));
      const len = used.reduce((a, b) => a + b.length, 0);
      const all = new Float32Array(len); let o = 0;
      used.forEach(b => { all.set(b, o); o += b.length; });
      // המרה ל-16kHz שהמודל צריך
      const ratio = rate / 16000, outLen = Math.floor(len / ratio), out = new Float32Array(outLen);
      for(let i = 0; i < outLen; i++){
        const s = Math.floor(i * ratio), e = Math.min(len, Math.floor((i + 1) * ratio));
        let acc = 0; for(let k = s; k < e; k++) acc += all[k];
        out[i] = acc / Math.max(1, e - s);
      }
      return out;
    })().catch(e => {
      try{ node && node.disconnect(); src && src.disconnect(); }catch(x){}
      stream && stream.getTracks().forEach(t => t.stop());
      throw e;
    });
    return {done, stop};
  }

  async function transcribe(audio){
    const m = await load();
    const r = await m(audio);
    let text = (r && r.text || "").trim();
    // Whisper ממציא לפעמים טקסט כשאין דיבור ברור
    if(/^[\[\(].*[\]\)]$/.test(text) || /^(you|thank you\.?|thanks for watching!?)$/i.test(text)) text = "";
    return text;
  }

  window.LocalASR = {
    available: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext)),
    prime, load, record, transcribe,
    get ready(){ return !!asr; }, get pct(){ return loadPct; }, onProgress: null
  };
})();
