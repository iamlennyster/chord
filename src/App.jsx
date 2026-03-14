import { useState, useMemo, useRef, useEffect } from "react";

/* ─── Data ─────────────────────────────────────────────────────────── */
const ROOTS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const CHORD_TYPES = [
  { id:'major',   display:'',      btn:'M',     name:'Maior',       intervals:[0,4,7] },
  { id:'minor',   display:'m',     btn:'m',     name:'Menor',       intervals:[0,3,7] },
  { id:'dom7',    display:'7',     btn:'7',     name:'Dom. 7ª',     intervals:[0,4,7,10] },
  { id:'maj7',    display:'maj7',  btn:'maj7',  name:'Maior 7ª',    intervals:[0,4,7,11] },
  { id:'min7',    display:'m7',    btn:'m7',    name:'Menor 7ª',    intervals:[0,3,7,10] },
  { id:'sus2',    display:'sus2',  btn:'sus2',  name:'Suspensa 2',  intervals:[0,2,7] },
  { id:'sus',     display:'sus',   btn:'sus',   name:'Suspensa 4',  intervals:[0,5,7] },
  { id:'dim',     display:'•',     btn:'•',     name:'Diminuto',    intervals:[0,3,6] },
  { id:'dim7',    display:'•7',    btn:'•7',    name:'Dim 7ª',      intervals:[0,3,6,9] },
  { id:'aug',     display:'+',     btn:'+',     name:'Aumentado',   intervals:[0,4,8] },
  { id:'halfdim', display:'ø',     btn:'ø',     name:'Semi-dim',    intervals:[0,3,6,10] },
  { id:'add9',    display:'add9',  btn:'add9',  name:'Add 9',       intervals:[0,2,4,7] },
  { id:'6',       display:'6',     btn:'6',     name:'Sexta Maior', intervals:[0,4,7,9] },
  { id:'m6',      display:'m6',    btn:'m6',    name:'Sexta Menor', intervals:[0,3,7,9] },
  { id:'9',       display:'9',     btn:'9',     name:'Nona Dom.',   intervals:[0,2,4,7,10] },
  { id:'maj9',    display:'maj9',  btn:'maj9',  name:'Nona Maior',  intervals:[0,2,4,7,11] },
  { id:'min9',    display:'m9',    btn:'m9',    name:'Nona Menor',  intervals:[0,2,3,7,10] },
  { id:'11',      display:'11',    btn:'11',    name:'Décima-1ª',   intervals:[0,4,5,7,10] },
  { id:'13',      display:'13',    btn:'13',    name:'Décima-3ª',   intervals:[0,4,7,9,10] },
  { id:'7b5',     display:'7♭5',   btn:'7♭5',   name:'Dom 7ª ♭5',   intervals:[0,4,6,10] },
];

const NOTE_NAMES_PT = {
  0:'Dó',1:'Dó#',2:'Ré',3:'Ré#',4:'Mi',
  5:'Fá',6:'Fá#',7:'Sol',8:'Sol#',9:'Lá',10:'Lá#',11:'Si'
};

// 2 octaves of white keys: pitch classes
const WHITE_KEYS = [0,2,4,5,7,9,11, 0,2,4,5,7,9,11];
// [pitchClass, leftPct] for black keys in 2 octaves
const BLACK_KEYS = [
  [1,5.00],[3,12.14],[6,26.43],[8,33.57],[10,40.71],
  [1,54.99],[3,62.14],[6,76.43],[8,83.57],[10,90.71],
];

/* ─── Magnificat enrichment ─────────────────────────────────────────── */
function magnify(intervals, typeId) {
  const base = new Set(intervals);
  const add = [];
  // Add 9th (color tone) to almost everything
  if (!base.has(2) && !base.has(1)) add.push(2);
  // Major-ish: add 13th
  if (['major','maj7','dom7','add9','6'].includes(typeId) && !base.has(9)) add.push(9);
  // Minor: add 11th
  if (['minor','min7','min9','m6'].includes(typeId) && !base.has(5)) add.push(5);
  // Diminuto: add major 7th
  if (['dim','halfdim'].includes(typeId) && !base.has(11)) add.push(11);
  // Dom7: add ♭9 tension
  if (typeId === 'dom7' && !base.has(1)) { add.push(1); }
  // Sus chords: add major 7th
  if (['sus','sus2'].includes(typeId) && !base.has(11)) add.push(11);
  return add;
}

/* ─── Audio synthesis ───────────────────────────────────────────────── */
const C3_FREQ = 130.813; // C3

function noteFreq(pitchClass, octaveShift = 0) {
  return C3_FREQ * Math.pow(2, (pitchClass + octaveShift * 12) / 12);
}

function buildVoicing(rootIdx, intervals, extraIntervals) {
  // Spread notes across ~2.5 octaves for richness
  const all = [...intervals, ...extraIntervals].sort((a,b)=>a-b);
  return all.map((interval, i) => {
    const pc = (rootIdx + interval) % 12;
    // bump up an octave if interval >= 12 or for color tones at top
    const oct = interval >= 12 ? 2 : (i > 2 && interval < intervals[i-1]) ? 2 : 1;
    return noteFreq(pc, oct);
  });
}

let globalCtx = null;
function getCtx() {
  if (!globalCtx || globalCtx.state === 'closed') {
    globalCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (globalCtx.state === 'suspended') globalCtx.resume();
  return globalCtx;
}

function playChordAudio(frequencies, magnificatOn) {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Master chain
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);

  // Warm delay/reverb
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = magnificatOn ? 0.38 : 0.22;
  const fbGain = ctx.createGain();
  fbGain.gain.value = magnificatOn ? 0.28 : 0.18;
  const delayOut = ctx.createGain();
  delayOut.gain.value = 0.18;
  delay.connect(fbGain);
  fbGain.connect(delay);
  delay.connect(delayOut);
  delayOut.connect(master);

  frequencies.forEach((freq, i) => {
    const t = now + i * 0.028; // strum timing
    const dur = magnificatOn ? 3.5 : 2.5;

    // Two oscillators per note: triangle body + sine air
    [[`triangle`, 0.10], [`sine`, 0.06]].forEach(([type, vol], j) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      const filt = ctx.createBiquadFilter();

      osc.type = type;
      osc.frequency.value = freq * (1 + (j * 0.0015)); // subtle detune

      filt.type = 'lowpass';
      filt.frequency.value = magnificatOn ? 2800 : 2200;
      filt.Q.value = 0.8;

      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vol, t + 0.012);
      env.gain.exponentialRampToValueAtTime(vol * 0.55, t + 0.25);
      env.gain.setValueAtTime(vol * 0.55, t + dur - 0.6);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(filt);
      filt.connect(env);
      env.connect(master);
      env.connect(delay);

      osc.start(t);
      osc.stop(t + dur + 0.1);
    });
  });
}

/* ─── Voice recognition ──────────────────────────────────────────────── */
function parseVoice(text, setRoot, setTypeId) {
  const noteMap = [
    ['dó#','C#'],['do#','C#'],['ré#','D#'],['re#','D#'],
    ['fá#','F#'],['fa#','F#'],['sol#','G#'],['lá#','A#'],['la#','A#'],
    ['dó','C'],['do','C'],['ré','D'],['re','D'],['mi','E'],
    ['fá','F'],['fa','F'],['sol','G'],['lá','A'],['la','A'],['si','B'],
  ];
  for (const [k, v] of noteMap) { if (text.includes(k)) { setRoot(v); break; } }
  if (/menor.?sete|m7/.test(text))          setTypeId('min7');
  else if (/maior.?sete|maj7/.test(text))   setTypeId('maj7');
  else if (/nona maior|maj9/.test(text))    setTypeId('maj9');
  else if (/nona/.test(text))               setTypeId('9');
  else if (/sete|dominante/.test(text))     setTypeId('dom7');
  else if (/menor/.test(text))              setTypeId('minor');
  else if (/maior/.test(text))              setTypeId('major');
  else if (/diminu/.test(text))             setTypeId('dim');
  else if (/aument/.test(text))             setTypeId('aug');
  else if (/sus.*dois|sus2/.test(text))     setTypeId('sus2');
  else if (/sus/.test(text))                setTypeId('sus');
  else if (/semi/.test(text))               setTypeId('halfdim');
  else if (/sexta menor|m6/.test(text))     setTypeId('m6');
  else if (/sexta|6/.test(text))            setTypeId('6');
}

/* ─── Piano component ───────────────────────────────────────────────── */
function Piano({ activeNotes, extraNotes }) {
  return (
    <div style={{ position:'relative', width:'100%', height:'148px', userSelect:'none' }}>
      {/* White keys */}
      <div style={{ display:'flex', height:'100%', gap:'2px' }}>
        {WHITE_KEYS.map((note, i) => {
          const isActive = activeNotes.has(note);
          const isExtra  = extraNotes.has(note) && !isActive;
          return (
            <div key={i} style={{
              flex:1,
              background: isActive
                ? 'linear-gradient(180deg, #E8660A 0%, #CC4400 100%)'
                : isExtra
                  ? 'linear-gradient(180deg, #F5D5A0 0%, #E8C070 100%)'
                  : 'linear-gradient(180deg, #EDEAE0 0%, #D8D4C8 100%)',
              borderRadius:'0 0 6px 6px',
              boxShadow: isActive
                ? 'inset 0 -3px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(204,68,0,0.5)'
                : isExtra
                  ? 'inset 0 -3px 0 rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.25)'
                  : 'inset 0 -4px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.3)',
              transition:'background 0.08s ease, box-shadow 0.08s ease',
              position:'relative',
            }}>
              {(isActive || isExtra) && (
                <div style={{
                  position:'absolute', bottom:'10px', left:'50%',
                  transform:'translateX(-50%)',
                  width:'5px', height:'5px', borderRadius:'50%',
                  background: isExtra ? 'rgba(180,120,0,0.7)' : 'rgba(255,255,255,0.6)',
                }}/>
              )}
            </div>
          );
        })}
      </div>
      {/* Black keys */}
      {BLACK_KEYS.map(([pitch, left], i) => {
        const isActive = activeNotes.has(pitch);
        const isExtra  = extraNotes.has(pitch) && !isActive;
        return (
          <div key={i} style={{
            position:'absolute', top:0,
            left:`calc(${left}% + 1px)`,
            width:'calc(4.28% - 1px)', height:'58%',
            background: isActive
              ? 'linear-gradient(180deg, #FF6622 0%, #CC3300 100%)'
              : isExtra
                ? 'linear-gradient(180deg, #886622 0%, #664400 100%)'
                : 'linear-gradient(180deg, #3A3835 0%, #1A1816 100%)',
            borderRadius:'0 0 4px 4px', zIndex:2,
            boxShadow: isActive
              ? '0 4px 16px rgba(204,68,0,0.6), inset 0 1px 0 rgba(255,140,80,0.4)'
              : isExtra
                ? '0 3px 8px rgba(100,60,0,0.4), inset 0 1px 0 rgba(160,100,40,0.3)'
                : 'inset 0 -2px 0 rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 8px rgba(0,0,0,0.5)',
            transition:'background 0.08s ease, box-shadow 0.08s ease',
          }}/>
        );
      })}
    </div>
  );
}

/* ─── Screw decoration ───────────────────────────────────────────────── */
function Screw({ style }) {
  return (
    <div style={{
      width:'12px', height:'12px', borderRadius:'50%',
      background:'radial-gradient(circle at 35% 35%, #4A4A46, #2A2A26)',
      boxShadow:'0 1px 3px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
      flexShrink:0, ...style,
    }}>
      <div style={{
        width:'60%', height:'1.5px', background:'rgba(0,0,0,0.6)',
        position:'relative', top:'49%', left:'20%',
        transform:'rotate(45deg)',
        boxShadow:'0 0.5px 0 rgba(255,255,255,0.08)',
      }}/>
    </div>
  );
}

/* ─── LED display char ───────────────────────────────────────────────── */
function LEDDisplay({ children, small }) {
  return (
    <div style={{
      fontFamily:"'VT323', 'Courier New', monospace",
      fontSize: small ? '13px' : 'clamp(52px, 10vw, 88px)',
      color:'#FFAA00',
      textShadow:'0 0 12px rgba(255,170,0,0.8), 0 0 30px rgba(255,140,0,0.4)',
      letterSpacing: small ? '0.1em' : '0.02em',
      lineHeight:1,
      fontWeight:'normal',
    }}>
      {children}
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────── */
export default function App() {
  const [root,       setRoot]       = useState('C');
  const [typeId,     setTypeId]     = useState('major');
  const [magnificat, setMagnicat]   = useState(false);
  const [playing,    setPlaying]    = useState(false);
  const [listening,  setListening]  = useState(false);
  const [voiceMsg,   setVoiceMsg]   = useState('');
  const [search,     setSearch]     = useState('');
  const recRef = useRef(null);

  const rootIdx   = ROOTS.indexOf(root);
  const chord     = CHORD_TYPES.find(c => c.id === typeId);
  const intervals = chord?.intervals || [];

  const activeNotes = useMemo(() =>
    new Set(intervals.map(i => (rootIdx + i) % 12)), [rootIdx, intervals]);

  const extraIntervals = useMemo(() =>
    magnificat ? magnify(intervals, typeId) : [], [magnificat, intervals, typeId]);

  const extraNotes = useMemo(() =>
    new Set(extraIntervals.map(i => (rootIdx + i) % 12)), [rootIdx, extraIntervals]);

  const chordName    = root + (chord?.display || '');
  const noteListFull = [...activeNotes].sort((a,b)=>a-b).map(n=>NOTE_NAMES_PT[n]).join(' — ');
  const extraNames   = extraIntervals.map(i=>NOTE_NAMES_PT[(rootIdx+i)%12]).join(' · ');

  const filteredTypes = useMemo(() => {
    if (!search.trim()) return CHORD_TYPES;
    const s = search.toLowerCase();
    return CHORD_TYPES.filter(c =>
      c.name.toLowerCase().includes(s) || c.display.toLowerCase().includes(s) || c.btn.toLowerCase().includes(s)
    );
  }, [search]);

  const handlePlay = () => {
    const freqs = buildVoicing(rootIdx, intervals, extraIntervals);
    setPlaying(true);
    playChordAudio(freqs, magnificat);
    setTimeout(() => setPlaying(false), 600);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceMsg('Não suportado.'); return; }
    const rec = new SR();
    rec.lang = 'pt-BR'; rec.interimResults = false;
    rec.onstart  = () => { setListening(true); setVoiceMsg(''); };
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setVoiceMsg(`"${t}"`);
      parseVoice(t.toLowerCase(), setRoot, setTypeId);
    };
    rec.onerror  = () => { setListening(false); setVoiceMsg('Erro.'); };
    rec.onend    = () => setListening(false);
    rec.start(); recRef.current = rec;
  };
  const stopListening = () => { recRef.current?.stop(); setListening(false); };

  const mono = "'IBM Plex Mono', monospace";
  const C = {
    chassis:  '#1A1918',
    panel:    '#222220',
    raised:   '#2C2C28',
    display:  '#0A0908',
    border:   '#0E0E0C',
    stripe:   '#CC4400',
    amber:    '#FFAA00',
    label:    '#5C5C52',
    labelBrt: '#8C8C80',
    ivory:    '#EDEAE0',
    dim:      '#D0CCC0',
    orange:   '#CC4400',
  };

  return (
    <div style={{ minHeight:'100vh', background:C.chassis, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', fontFamily:mono }}>

      {/* ── Chassis ── */}
      <div style={{
        width:'100%', maxWidth:'680px',
        background:`linear-gradient(160deg, #272724 0%, #1E1D1B 50%, #1A1918 100%)`,
        borderRadius:'12px',
        boxShadow:'0 0 0 1px #0A0908, 0 8px 48px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)',
        padding:'24px',
        position:'relative',
        overflow:'hidden',
      }}>

        {/* Orange accent stripe top */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:`linear-gradient(90deg, ${C.stripe} 0%, #FF6622 40%, ${C.stripe} 100%)`, borderRadius:'12px 12px 0 0' }}/>

        {/* Screws */}
        <div style={{ position:'absolute', top:'14px', left:'14px' }}><Screw/></div>
        <div style={{ position:'absolute', top:'14px', right:'14px' }}><Screw/></div>
        <div style={{ position:'absolute', bottom:'14px', left:'14px' }}><Screw/></div>
        <div style={{ position:'absolute', bottom:'14px', right:'14px' }}><Screw/></div>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', paddingBottom:'16px', borderBottom:`1px solid #2E2E2A` }}>
          <div>
            <div style={{ fontSize:'10px', letterSpacing:'0.25em', textTransform:'uppercase', color:C.label, marginBottom:'2px' }}>AKORD</div>
            <div style={{ fontSize:'8px', letterSpacing:'0.15em', color:'#3C3C36', textTransform:'uppercase' }}>Chord Visualizer • v2</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: playing ? C.amber : '#3A3A34', boxShadow: playing ? `0 0 8px ${C.amber}` : 'none', transition:'all 0.1s' }}/>
            <div style={{ fontSize:'8px', letterSpacing:'0.15em', color:C.label, textTransform:'uppercase' }}>SIGNAL</div>
          </div>
        </div>

        {/* ── Display + Play row ── */}
        <div style={{ display:'flex', gap:'16px', marginBottom:'20px', alignItems:'stretch' }}>

          {/* LED Display panel */}
          <div style={{
            flex:1, background:C.display,
            border:`1px solid #0C0C0A`,
            borderRadius:'6px',
            padding:'16px 20px 12px',
            boxShadow:'inset 0 2px 12px rgba(0,0,0,0.8)',
            position:'relative',
            overflow:'hidden',
          }}>
            {/* scan lines */}
            <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)', pointerEvents:'none', zIndex:1 }}/>
            <div style={{ position:'relative', zIndex:2 }}>
              <LEDDisplay>{chordName}</LEDDisplay>
              <div style={{ marginTop:'8px', display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ fontSize:'10px', color:'rgba(255,170,0,0.6)', letterSpacing:'0.06em', fontFamily:mono }}>{chord?.name?.toUpperCase()}</div>
                <div style={{ fontSize:'9px', color:'rgba(255,170,0,0.35)', letterSpacing:'0.04em', fontFamily:mono }}>{noteListFull}</div>
              </div>
              {magnificat && extraNames && (
                <div style={{ marginTop:'4px', fontSize:'9px', color:'rgba(255,180,60,0.5)', letterSpacing:'0.05em', fontStyle:'italic', fontFamily:mono }}>
                  + {extraNames}
                </div>
              )}
            </div>
          </div>

          {/* Right controls */}
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', minWidth:'80px' }}>

            {/* PLAY button */}
            <button onClick={handlePlay} style={{
              flex:1,
              background: playing
                ? `radial-gradient(circle, #FF6622 0%, ${C.orange} 100%)`
                : `radial-gradient(circle at 40% 35%, #3A3A36, #222220)`,
              border:`1px solid ${playing ? C.orange : '#3A3A36'}`,
              borderRadius:'8px',
              cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'6px',
              boxShadow: playing
                ? `0 0 20px rgba(204,68,0,0.6), inset 0 1px 0 rgba(255,140,80,0.3)`
                : `inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(255,255,255,0.04)`,
              transition:'all 0.08s ease',
              transform: playing ? 'scale(0.97)' : 'scale(1)',
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <polygon points="7,4 19,11 7,18" fill={playing ? '#fff' : C.labelBrt} style={{ transition:'fill 0.08s' }}/>
              </svg>
              <div style={{ fontSize:'7px', letterSpacing:'0.18em', textTransform:'uppercase', color: playing ? 'rgba(255,255,255,0.85)' : C.label }}>PLAY</div>
            </button>

            {/* MAGNIFICAT toggle */}
            <button onClick={() => setMagnicat(m => !m)} style={{
              flex:1,
              background: magnificat
                ? `linear-gradient(160deg, #8B5A0A, #5A3A04)`
                : `radial-gradient(circle at 40% 35%, #3A3A36, #222220)`,
              border:`1px solid ${magnificat ? '#AA7722' : '#3A3A36'}`,
              borderRadius:'8px',
              cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'5px',
              boxShadow: magnificat
                ? `0 0 14px rgba(170,119,34,0.4), inset 0 1px 0 rgba(255,200,80,0.2)`
                : `inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.04)`,
              transition:'all 0.15s ease',
            }}>
              {/* Fleur symbol */}
              <div style={{ fontSize:'18px', lineHeight:1, color: magnificat ? '#FFCC66' : C.label, textShadow: magnificat ? '0 0 8px rgba(255,200,80,0.8)' : 'none', transition:'all 0.15s', fontFamily:'serif' }}>✦</div>
              <div style={{ fontSize:'6px', letterSpacing:'0.15em', textTransform:'uppercase', color: magnificat ? 'rgba(255,200,80,0.9)' : C.label, lineHeight:'1.3', textAlign:'center' }}>MAGNI<br/>FICAT</div>
            </button>
          </div>
        </div>

        {/* ── Piano ── */}
        <div style={{
          background:'#141412',
          border:'1px solid #0C0C0A',
          borderRadius:'6px',
          padding:'12px 12px 16px',
          marginBottom:'20px',
          boxShadow:'inset 0 3px 10px rgba(0,0,0,0.7)',
        }}>
          <div style={{ fontSize:'7px', letterSpacing:'0.22em', textTransform:'uppercase', color:C.label, marginBottom:'10px', display:'flex', justifyContent:'space-between' }}>
            <span>TECLADO · 2 OITAVAS</span>
            {magnificat && <span style={{ color:'rgba(255,180,60,0.5)' }}>✦ EXT. ATIVAS</span>}
          </div>
          <Piano activeNotes={activeNotes} extraNotes={extraNotes} />
        </div>

        {/* ── Root selector ── */}
        <div style={{ marginBottom:'18px' }}>
          <div style={{ fontSize:'7px', letterSpacing:'0.22em', textTransform:'uppercase', color:C.label, marginBottom:'8px' }}>NOTA RAIZ</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
            {ROOTS.map(r => {
              const active = root === r;
              return (
                <button key={r} onClick={() => setRoot(r)} style={{
                  width:'46px', height:'36px', fontFamily:mono, fontSize:'12px',
                  background: active
                    ? `linear-gradient(160deg, #CC4400, #991100)`
                    : 'linear-gradient(160deg, #2C2C28, #222220)',
                  color: active ? '#fff' : C.labelBrt,
                  border:`1px solid ${active ? '#CC4400' : '#383834'}`,
                  borderRadius:'4px', cursor:'pointer',
                  boxShadow: active
                    ? `0 0 10px rgba(204,68,0,0.4), inset 0 1px 0 rgba(255,140,80,0.3)`
                    : `inset 0 2px 3px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.04)`,
                  transition:'all 0.1s',
                  fontWeight: active ? '500' : '400',
                }}>
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chord type ── */}
        <div style={{ marginBottom:'18px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
            <div style={{ fontSize:'7px', letterSpacing:'0.22em', textTransform:'uppercase', color:C.label }}>TIPO DE ACORDE</div>
            <input
              placeholder="buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background:'#161614', border:'none',
                borderBottom:`1px solid #383834`,
                outline:'none', padding:'2px 4px',
                fontSize:'10px', color:C.labelBrt,
                fontFamily:mono, letterSpacing:'0.05em', width:'90px',
              }}
            />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(62px, 1fr))', gap:'4px' }}>
            {filteredTypes.map(ct => {
              const active = typeId === ct.id;
              return (
                <button key={ct.id} onClick={() => setTypeId(ct.id)} style={{
                  padding:'8px 4px 6px', borderRadius:'4px', cursor:'pointer',
                  background: active
                    ? `linear-gradient(160deg, #CC4400, #991100)`
                    : 'linear-gradient(160deg, #2C2C28, #222220)',
                  color: active ? '#fff' : C.labelBrt,
                  border:`1px solid ${active ? '#CC4400' : '#383834'}`,
                  boxShadow: active
                    ? `0 0 8px rgba(204,68,0,0.3), inset 0 1px 0 rgba(255,140,80,0.2)`
                    : `inset 0 2px 3px rgba(0,0,0,0.4)`,
                  transition:'all 0.1s',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:'3px',
                }}>
                  <span style={{ fontSize:'14px', fontFamily:mono, fontWeight:'500', lineHeight:1, color: active ? '#fff' : C.amber }}>{ct.btn||'M'}</span>
                  <span style={{ fontSize:'7px', color: active ? 'rgba(255,255,255,0.55)' : C.label, textAlign:'center', lineHeight:'1.2', letterSpacing:'0.02em' }}>{ct.name}</span>
                </button>
              );
            })}
            {filteredTypes.length === 0 && (
              <div style={{ gridColumn:'1/-1', padding:'16px', textAlign:'center', color:C.label, fontSize:'10px' }}>Nenhum acorde encontrado.</div>
            )}
          </div>
        </div>

        {/* ── Voice + divider ── */}
        <div style={{ paddingTop:'16px', borderTop:'1px solid #2A2A26' }}>
          <div style={{ fontSize:'7px', letterSpacing:'0.22em', textTransform:'uppercase', color:C.label, marginBottom:'8px' }}>VOZ</div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
            <button
              onClick={listening ? stopListening : startListening}
              style={{
                padding:'8px 16px', borderRadius:'4px', cursor:'pointer',
                fontFamily:mono, fontSize:'9px', letterSpacing:'0.15em', textTransform:'uppercase',
                background: listening
                  ? `linear-gradient(160deg, ${C.orange}, #991100)`
                  : 'linear-gradient(160deg, #2C2C28, #222220)',
                color: listening ? '#fff' : C.labelBrt,
                border:`1px solid ${listening ? C.orange : '#383834'}`,
                boxShadow: listening
                  ? `0 0 12px rgba(204,68,0,0.5)`
                  : `inset 0 2px 3px rgba(0,0,0,0.4)`,
                display:'flex', alignItems:'center', gap:'7px', transition:'all 0.12s',
              }}>
              <span style={{
                width:'6px', height:'6px', borderRadius:'50%', display:'inline-block',
                background: listening ? 'rgba(255,255,255,0.9)' : C.label,
                animation: listening ? 'pulse 1s infinite' : 'none',
                boxShadow: listening ? '0 0 6px rgba(255,255,255,0.6)' : 'none',
              }}/>
              {listening ? 'PARAR' : 'FALAR ACORDE'}
            </button>
            {voiceMsg
              ? <span style={{ fontSize:'9px', color:C.label, fontStyle:'italic', letterSpacing:'0.04em' }}>{voiceMsg}</span>
              : <span style={{ fontSize:'8px', color:'#3C3C36', letterSpacing:'0.04em' }}>Ex: "Dó menor sete" · "Sol maior" · "Ré diminuto"</span>
            }
          </div>
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=VT323&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#141412; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        button { font-family:'IBM Plex Mono',monospace; }
        input::placeholder { color:#3C3C36; }
      `}</style>
    </div>
  );
}
