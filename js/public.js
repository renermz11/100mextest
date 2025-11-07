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

  let state = {question:'(Listo para comenzar...)', answers:[], showQuestion:false};
  let strikes = 0; // 0..3
  const questionEl = document.getElementById('question');
  const answersEl = document.getElementById('answers');
  const strikeOverlay = document.getElementById('strikeOverlay');
  const strikeCounter = document.getElementById('strikeCounter');
  const cornerStrikesEl = document.getElementById('cornerStrikes');

    // try to preload audio files from project root (user provided)
    const revealAudioFile = 'respuesta_correcta.wav';
    const strikeAudioFile = 'strike.wav';
    let revealAudioEl = null;
    let strikeAudioEl = null;
  
    try{
      revealAudioEl = new Audio(revealAudioFile); revealAudioEl.preload = 'auto';
    }catch(e){ revealAudioEl = null; }
    try{
      strikeAudioEl = new Audio(strikeAudioFile); strikeAudioEl.preload = 'auto';
    }catch(e){ strikeAudioEl = null; }
  function render(){
    // show question only when showQuestion is true
    if(state.showQuestion){
      questionEl.textContent = state.question || '(Sin pregunta)';
      questionEl.classList.remove('hidden-question');
    } else {
      questionEl.textContent = 'Pregunta oculta';
      questionEl.classList.add('hidden-question');
    }
    answersEl.innerHTML = '';
    state.answers.forEach((a, i)=>{
      const card = document.createElement('div');
      card.className = 'answer-card ' + (a.revealed? 'revealed' : 'hidden');
      card.innerHTML = `
        <div class="answer-index">${i+1}</div>
        <div class="answer-text">${a.revealed? escapeHtml(a.text) : '—'}</div>
        <div class="answer-score">${a.revealed? a.score : ''}</div>
      `;
      answersEl.appendChild(card);
    });
    renderStrikes();
  }

  function renderStrikes(){
    if(!strikeCounter) return;
    strikeCounter.textContent = `${strikes} / 3`;
    // optionally show small dots (keep simple text for now)
    // update corner small X badges if present
    if(cornerStrikesEl){
      const badges = cornerStrikesEl.querySelectorAll('.strike-badge');
      badges.forEach((b, idx)=>{
        if(idx < strikes) b.classList.add('active'); else b.classList.remove('active');
      });
    }
  }

  function flashStrike(count){
    if(!strikeOverlay) return;
    // build content: N times X separated by space
    const n = Math.max(1, Math.min(3, Number(count) || 1));
    strikeOverlay.textContent = Array.from({length:n}).map(()=>'✖').join(' ');
    strikeOverlay.classList.remove('hidden');
    strikeOverlay.classList.add('visible');
    // duration: base 1200ms; if 3 strikes, add extra 2000ms
    const base = 1200;
    const extraForThree = (n === 3) ? 2000 : 0;
    setTimeout(()=>{
      strikeOverlay.classList.remove('visible');
      strikeOverlay.classList.add('hidden');
    }, base + extraForThree);
  }

  // --- Sounds: prefer provided audio files, fallback to WebAudio synth ---
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  function ensureAudio(){ if(!AudioCtx) return null; if(!audioCtx) audioCtx = new AudioCtx(); return audioCtx; }

  function playRevealSynth(){
    const ctx = ensureAudio(); if(!ctx) return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(880, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    o.connect(g); g.connect(ctx.destination);
    o.start(now); o.stop(now + 0.5);
  }

  function playStrikeSynth(){
    const ctx = ensureAudio(); if(!ctx) return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(140, now);
    o.frequency.exponentialRampToValueAtTime(60, now + 0.16);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    o.connect(g); g.connect(ctx.destination);
    o.start(now); o.stop(now + 0.26);
  }

  function playRevealSound(){
    if(revealAudioEl && typeof revealAudioEl.play === 'function'){
      try{ revealAudioEl.currentTime = 0; revealAudioEl.play().catch(()=>playRevealSynth()); }catch(e){ playRevealSynth(); }
    } else { playRevealSynth(); }
  }


  function playStrikeSound(){
    if(strikeAudioEl && typeof strikeAudioEl.play === 'function'){
      try{ strikeAudioEl.currentTime = 0; strikeAudioEl.play().catch(()=>playStrikeSynth()); }catch(e){ playStrikeSynth(); }
    } else { playStrikeSynth(); }
  }

  function escapeHtml(s){ return (s+'').replace(/[&<>\"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

  function handleIncomingMessage(msg){
    if(!msg || !msg.type) return;
    if(msg.type === 'init'){
      state.question = msg.question || '';
      state.answers = (msg.answers||[]).map(a=>({text:a.text||a, score:a.score||'', revealed:!!a.revealed}));
      // show question only if any answer already revealed
      state.showQuestion = state.answers.some(a=>a.revealed);
      render();
      // If an init includes revealed answers, play reveal sound for each revealed
      (state.answers||[]).forEach(a=>{ if(a.revealed) try{ playRevealSound() }catch(e){} });
      return;
    }
    if(msg.type === 'reveal'){
      const i = Number(msg.index);
      if(!Number.isFinite(i)) return;
      if(state.answers[i]) state.answers[i].revealed = true;
      // when any answer is revealed, reveal the question as well
      state.showQuestion = true;
      render();
      try{ playRevealSound(); }catch(e){}
      return;
    }
    if(msg.type === 'revealAll'){
      state.answers.forEach(a=>a.revealed = true);
      state.showQuestion = true;
      render();
      try{ playRevealSound(); }catch(e){}
      return;
    }
    if(msg.type === 'reset'){
      state = {question:'(Esperando pregunta...)', answers:[], showQuestion:false}; strikes = 0; render();
      if(strikeOverlay){ strikeOverlay.classList.remove('visible'); strikeOverlay.classList.add('hidden'); }
      return;
    }
    if(msg.type === 'strikeInc'){
      strikes = Math.min(3, (strikes||0) + 1);
      renderStrikes();
      // show overlay with current number of X's; longer when reaches 3
      flashStrike(strikes);
      // play strike sound on public when a strike is received
      try{ playStrikeSound(); }catch(e){}
      return;
    }
    if(msg.type === 'strikeDec'){
      strikes = Math.max(0, (strikes||0) - 1);
      renderStrikes();
      return;
    }
    if(msg.type === 'strikeReset'){
      strikes = 0; renderStrikes();
      return;
    }
    if(msg.type === 'showX'){
      flashStrike();
      return;
    }
  }

  // BroadcastChannel listener
  bc.onmessage = (ev) => handleIncomingMessage(ev.data);

  // Firebase realtime listener (if available)
  if(eventsRef){
    eventsRef.on('child_added', snap => {
      const node = snap.val();
      if(!node || !node.payload) return;
      handleIncomingMessage(node.payload);
    });
  }

  // show placeholder if no init arrives quickly
  render();
})();