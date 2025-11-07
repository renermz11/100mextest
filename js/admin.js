(function(){
  const bc = new BroadcastChannel('mex100_channel');
  // --- Firebase client (Realtime Database) initialization ---
  const firebaseConfig = {
    apiKey: "AIzaSyDBOxl1cXhhPpC4H-HNiOg1UVHOxU9aFrA",
    authDomain: "mex-9b577.firebaseapp.com",
    databaseURL: "https://mex-9b577-default-rtdb.firebaseio.com",
    projectId: "mex-9b577",
    storageBucket: "mex-9b577.firebasestorage.app",
    messagingSenderId: "353099255906",
    appId: "1:353099255906:web:bafb44467a1b5d9326013b",
    measurementId: "G-8L208V1GG5"
  };

  try{ firebase.initializeApp(firebaseConfig); }catch(e){}
  const eventsRef = (window.firebase && firebase.database) ? firebase.database().ref('events') : null;

  function sendRelayMessage(msg){
    if(!eventsRef) return;
    try{ eventsRef.push({ ts: Date.now(), payload: msg }).catch(()=>{}); }catch(e){}
  }

  function broadcast(msg){ bc.postMessage(msg); sendRelayMessage(msg); }

  const initForm = document.getElementById('initForm');
  const questionInput = document.getElementById('questionInput');
  const answersInput = document.getElementById('answersInput');
  const answerList = document.getElementById('answerList');
  const resetBtn = document.getElementById('resetBtn');
  const revealAllBtn = document.getElementById('revealAllBtn');
  const strikeBtn = document.getElementById('strikeBtn');
  const undoStrikeBtn = document.getElementById('undoStrikeBtn');
  const resetStrikesBtn = document.getElementById('resetStrikesBtn');
  const adminStrikesEl = document.getElementById('adminStrikes');
  // try to preload audio files from project root (user provided)
  const revealAudioFile = 'respuesta_correcta.wav';
  const strikeAudioFile = 'strike.wav';
  let revealAudioEl = null;
  let strikeAudioEl = null;
  try{ revealAudioEl = new Audio(revealAudioFile); revealAudioEl.preload = 'auto'; }catch(e){ revealAudioEl = null; }
  try{ strikeAudioEl = new Audio(strikeAudioFile); strikeAudioEl.preload = 'auto'; }catch(e){ strikeAudioEl = null; }
  // --- Simple WebAudio fallback (if audio files not usable) ---
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  function ensureAudio(){ if(!AudioCtx) return null; if(!audioCtx) audioCtx = new AudioCtx(); return audioCtx; }
  function playRevealSynth(){ const ctx = ensureAudio(); if(!ctx) return; const now = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(880, now); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.12, now+0.01); g.gain.exponentialRampToValueAtTime(0.0001, now+0.45); o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now+0.5); }
  function playStrikeSynth(){ const ctx = ensureAudio(); if(!ctx) return; const now = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type='square'; o.frequency.setValueAtTime(140, now); o.frequency.exponentialRampToValueAtTime(60, now+0.16); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.22, now+0.01); g.gain.exponentialRampToValueAtTime(0.0001, now+0.24); o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now+0.26); }
  function playRevealSound(){ if(revealAudioEl && typeof revealAudioEl.play === 'function'){ try{ revealAudioEl.currentTime = 0; revealAudioEl.play().catch(()=>playRevealSynth()); }catch(e){ playRevealSynth(); } } else { playRevealSynth(); } }
  function playStrikeSound(){ if(strikeAudioEl && typeof strikeAudioEl.play === 'function'){ try{ strikeAudioEl.currentTime = 0; strikeAudioEl.play().catch(()=>playStrikeSynth()); }catch(e){ playStrikeSynth(); } } else { playStrikeSynth(); } }

  let lastSent = null; // current answers array

  function buildList(answers){
    answerList.innerHTML = '';
    answers.forEach((text, i)=>{
      const li = document.createElement('li');
      li.innerHTML = `<div>#${i+1} — ${escapeHtml(text)}</div>`;
      const btn = document.createElement('button');
      btn.textContent = 'Revelar';
      btn.addEventListener('click', ()=> sendReveal(i));
      li.appendChild(btn);
      answerList.appendChild(li);
    });
  }

  function escapeHtml(s){ return (s+'').replace(/[&<>\"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

  initForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const question = questionInput.value.trim();
    const answers = answersInput.value.split('\n').map(s=>s.trim()).filter(Boolean);
    const payloadAnswers = answers.map(a=>({text:a, score:'', revealed:false}));
    lastSent = payloadAnswers;
    broadcast({type:'init', question, answers: payloadAnswers});
    buildList(answers);
  });

  function sendReveal(i){
    broadcast({type:'reveal', index: i});
  }

  // strikes handling in admin (local optimistic counter + BC messages)
  let adminStrikes = 0;
  function updateAdminStrikes(){
    if(adminStrikesEl) adminStrikesEl.textContent = `Strikes: ${adminStrikes} / 3`;
  }

  function sendStrike(){
    adminStrikes = Math.min(3, adminStrikes + 1);
    updateAdminStrikes();
    // notify public to increment strikes; public will show overlay
    broadcast({type:'strikeInc'});
  }

  function undoStrike(){
    adminStrikes = Math.max(0, adminStrikes - 1);
    updateAdminStrikes();
    broadcast({type:'strikeDec'});
  }

  function resetStrikes(){
    adminStrikes = 0; updateAdminStrikes(); bc.postMessage({type:'strikeReset'});
  }

  resetBtn.addEventListener('click', ()=>{
    broadcast({type:'reset'});
    answerList.innerHTML = '';
  });

  strikeBtn.addEventListener('click', ()=> sendStrike());
  undoStrikeBtn.addEventListener('click', ()=> undoStrike());
  resetStrikesBtn.addEventListener('click', ()=> resetStrikes());

  revealAllBtn.addEventListener('click', ()=>{
    broadcast({type:'revealAll'});
  });

  // keyboard shortcuts: 1..9 reveal index 0..8, A reveal all, R reset
  window.addEventListener('keydown', (ev)=>{
    if(document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
    const k = ev.key;
    if(/^[1-9]$/.test(k)){
      const idx = parseInt(k,10)-1; sendReveal(idx);
    } else if(k.toLowerCase() === 'a'){
      broadcast({type:'revealAll'});
    } else if(k.toLowerCase() === 'r'){
      broadcast({type:'reset'});
    }
  });
})();
