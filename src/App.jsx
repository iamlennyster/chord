import { useState, useMemo, useRef } from "react";

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

const WHITE_KEYS  = [0,2,4,5,7,9,11, 0,2,4,5,7,9,11];
const BLACK_KEYS  = [
  [1,5.00],[3,12.14],[6,26.43],[8,33.57],[10,40.71],
  [1,54.99],[3,62.14],[6,76.43],[8,83.57],[10,90.71],
];
const INSTRUMENTS = [
  { id:'piano',   label:'PIANO',   strumMs:28, baseOctave:1, delayTime:(m)=>m?0.38:0.22, delayFb:(m)=>m?0.28:0.18, delayMix:0.18, dur:(m)=>m?3.6:2.6, masterVol:0.52 },
  { id:'ukulele', label:'UKULELE', strumMs:18, baseOctave:2, delayTime:()=>0.14, delayFb:()=>0.12, delayMix:0.12, dur:(m)=>m?1.8:1.2, masterVol:0.58 },
  { id:'violao',  label:'VIOLÃO',  strumMs:38, baseOctave:0, delayTime:()=>0.28, delayFb:()=>0.15, delayMix:0.14, dur:(m)=>m?3.2:2.2, masterVol:0.60 },
];

/* ─── Themes ────────────────────────────────────────────────────────── */
const THEMES = {
  light: {
    id: 'light',
    body:     '#E8E8E4',
    chassis:  '#DEDAD4',
    panel:    '#E8E4DC',
    raised:   '#F0EDE6',
    display:  '#1A1916',
    dispText: '#FFAA00',
    border:   '#C8C4BC',
    borderSt: '#B8B4AC',
    text:     '#1A1916',
    textMute: '#888880',
    textDim:  '#BCBAB4',
    btnBg:    '#F0EDE6',
    btnBgAct: '#CC4400',
    btnBdr:   '#C4C0B8',
    stripe:   '#CC4400',
    orange:   '#CC4400',
    amber:    '#FFAA00',
    scanlines: false,
    screwLight: true,
    shadow:   '0 0 0 1px #C0BCB4, 0 8px 40px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)',
  },
  dark: {
    id: 'dark',
    body:     '#141412',
    chassis:  '#1A1918',
    panel:    '#222220',
    raised:   '#2C2C28',
    display:  '#080806',
    dispText: '#FFAA00',
    border:   '#343430',
    borderSt: '#2A2A26',
    text:     '#8C8C80',
    textMute: '#5C5C52',
    textDim:  '#3A3A34',
    btnBg:    '#2C2C28',
    btnBgAct: '#CC4400',
    btnBdr:   '#343430',
    stripe:   '#CC4400',
    orange:   '#CC4400',
    amber:    '#FFAA00',
    scanlines: true,
    screwLight: false,
    shadow:   '0 0 0 1px #0A0908, 0 10px 60px rgba(0,0,0,0.85)',
  },
  hc: {
    id: 'hc',
    body:     '#FFFFFF',
    chassis:  '#FFFFFF',
    panel:    '#FFFFFF',
    raised:   '#FFFFFF',
    display:  '#000000',
    dispText: '#FFAA00',
    border:   '#000000',
    borderSt: '#000000',
    text:     '#000000',
    textMute: '#444444',
    textDim:  '#888888',
    btnBg:    '#FFFFFF',
    btnBgAct: '#CC4400',
    btnBdr:   '#000000',
    stripe:   '#CC4400',
    orange:   '#CC4400',
    amber:    '#FFAA00',
    scanlines: false,
    screwLight: true,
    shadow:   '0 0 0 2px #000000',
  },
};

/* ─── Magnificat ────────────────────────────────────────────────────── */
function magnify(intervals, typeId) {
  const base = new Set(intervals); const add = [];
  if (!base.has(2) && !base.has(1)) add.push(2);
  if (['major','maj7','dom7','add9','6'].includes(typeId) && !base.has(9))  add.push(9);
  if (['minor','min7','min9','m6'].includes(typeId)       && !base.has(5))  add.push(5);
  if (['dim','halfdim'].includes(typeId)                  && !base.has(11)) add.push(11);
  if (typeId === 'dom7'                                   && !base.has(1))  add.push(1);
  if (['sus','sus2'].includes(typeId)                     && !base.has(11)) add.push(11);
  return add;
}

/* ─── Audio ─────────────────────────────────────────────────────────── */
const BASE_C = { 0:32.703, 1:65.406, 2:130.813, 3:261.626 };
function noteFreq(pc, oct) { return BASE_C[Math.min(oct,3)] * Math.pow(2, pc / 12); }

function buildVoicing(rootIdx, intervals, extraIntervals, instrument) {
  const all = [...intervals, ...extraIntervals].sort((a,b)=>a-b);
  return all.map((interval, i) => {
    const pc = (rootIdx + interval) % 12;
    let oct = instrument.baseOctave;
    if (instrument.id === 'violao') {
      oct = i === 0 ? instrument.baseOctave : i <= 1 ? instrument.baseOctave : i <= 3 ? instrument.baseOctave+1 : instrument.baseOctave+2;
    } else if (instrument.id === 'ukulele') {
      oct = i < 2 ? instrument.baseOctave : instrument.baseOctave+1;
    } else {
      oct = i < 3 ? instrument.baseOctave : instrument.baseOctave+1;
    }
    return noteFreq(pc, oct);
  });
}

let globalCtx = null;
function getCtx() {
  if (!globalCtx || globalCtx.state === 'closed') globalCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (globalCtx.state === 'suspended') globalCtx.resume();
  return globalCtx;
}

function playChord(frequencies, instrument, magOn) {
  const ctx = getCtx(); const now = ctx.currentTime;
  const master = ctx.createGain(); master.gain.value = instrument.masterVol; master.connect(ctx.destination);
  const delay = ctx.createDelay(1.2); const fbGain = ctx.createGain(); const delayOut = ctx.createGain();
  delay.delayTime.value = instrument.delayTime(magOn); fbGain.gain.value = instrument.delayFb(magOn); delayOut.gain.value = instrument.delayMix;
  delay.connect(fbGain); fbGain.connect(delay); delay.connect(delayOut); delayOut.connect(master);
  const dur = instrument.dur(magOn); const strumSec = instrument.strumMs / 1000;

  frequencies.forEach((freq, i) => {
    const t = now + i * strumSec;
    if (instrument.id === 'piano') {
      [['triangle',0.10],['sine',0.06]].forEach(([type,vol],j) => {
        const osc=ctx.createOscillator(), env=ctx.createGain(), filt=ctx.createBiquadFilter();
        osc.type=type; osc.frequency.value=freq*(1+j*0.0015);
        filt.type='lowpass'; filt.frequency.value=magOn?2800:2200; filt.Q.value=0.8;
        env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(vol,t+0.012);
        env.gain.exponentialRampToValueAtTime(vol*0.55,t+0.3); env.gain.setValueAtTime(vol*0.55,t+dur-0.7);
        env.gain.exponentialRampToValueAtTime(0.0001,t+dur);
        osc.connect(filt); filt.connect(env); env.connect(master); env.connect(delay);
        osc.start(t); osc.stop(t+dur+0.1);
      });
    }
    if (instrument.id === 'ukulele') {
      [[freq,0.13],[freq*2,0.045],[freq*3,0.018]].forEach(([f,vol]) => {
        const osc=ctx.createOscillator(), env=ctx.createGain(), filt=ctx.createBiquadFilter();
        osc.type='sine'; osc.frequency.value=f;
        filt.type='bandpass'; filt.frequency.value=f*1.6; filt.Q.value=1.4;
        env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(vol,t+0.005);
        env.gain.exponentialRampToValueAtTime(vol*0.25,t+0.1); env.gain.exponentialRampToValueAtTime(0.0001,t+dur);
        osc.connect(filt); filt.connect(env); env.connect(master); env.connect(delay);
        osc.start(t); osc.stop(t+dur+0.05);
      });
    }
    if (instrument.id === 'violao') {
      const sr=ctx.sampleRate, period=Math.max(2,Math.round(sr/freq)), bufLen=period*80;
      const buffer=ctx.createBuffer(1,bufLen,sr); const data=buffer.getChannelData(0);
      for (let s=0;s<period;s++) data[s]=Math.random()*2-1;
      for (let s=period;s<bufLen;s++) data[s]=(data[s-period]+data[s-period+1])*0.4995;
      const src=ctx.createBufferSource(), filt=ctx.createBiquadFilter(), env=ctx.createGain();
      src.buffer=buffer; filt.type='lowpass'; filt.frequency.value=4000; filt.Q.value=0.4;
      env.gain.setValueAtTime(0.0001,t); env.gain.linearRampToValueAtTime(0.22,t+0.004);
      env.gain.exponentialRampToValueAtTime(0.10,t+0.08); env.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      src.connect(filt); filt.connect(env); env.connect(master); env.connect(delay);
      src.start(t); src.stop(t+dur+0.05);
    }
  });
}

/* ─── Voice ─────────────────────────────────────────────────────────── */
function parseVoice(text, setRoot, setTypeId) {
  const noteMap = [
    ['dó#','C#'],['do#','C#'],['ré#','D#'],['re#','D#'],['fá#','F#'],['fa#','F#'],['sol#','G#'],['lá#','A#'],['la#','A#'],
    ['dó','C'],['do','C'],['ré','D'],['re','D'],['mi','E'],['fá','F'],['fa','F'],['sol','G'],['lá','A'],['la','A'],['si','B'],
  ];
  for (const [k,v] of noteMap) { if (text.includes(k)) { setRoot(v); break; } }
  if      (/menor.?sete|m7/.test(text))     setTypeId('min7');
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
function Piano({ activeNotes, extraNotes, T }) {
  return (
    <div style={{ position:'relative', width:'100%', height:'144px', userSelect:'none' }}>
      <div style={{ display:'flex', height:'100%', gap:'2px' }}>
        {WHITE_KEYS.map((note, i) => {
          const isActive = activeNotes.has(note);
          const isExtra  = extraNotes.has(note) && !isActive;
          return (
            <div key={i} style={{
              flex:1,
              background: isActive
                ? 'linear-gradient(180deg,#E8660A 0%,#CC4400 100%)'
                : isExtra
                  ? 'linear-gradient(180deg,#E8C060 0%,#C89040 100%)'
                  : T.id === 'dark'
                    ? 'linear-gradient(180deg,#E8E4D8 0%,#CECABC 100%)'
                    : T.id === 'hc'
                      ? '#FFFFFF'
                      : 'linear-gradient(180deg,#F2EFE6 0%,#DDD9CE 100%)',
              borderRadius:'0 0 6px 6px',
              border: T.id === 'hc' ? '1px solid #000' : 'none',
              boxShadow: isActive
                ? 'inset 0 -3px 0 rgba(0,0,0,0.35),0 2px 10px rgba(204,68,0,0.5)'
                : isExtra
                  ? 'inset 0 -3px 0 rgba(0,0,0,0.2)'
                  : T.id === 'hc'
                    ? 'none'
                    : 'inset 0 -4px 0 rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.55),0 2px 4px rgba(0,0,0,0.2)',
              transition:'background 0.08s,box-shadow 0.08s',
              position:'relative',
            }}>
              {(isActive || isExtra) && (
                <div style={{ position:'absolute', bottom:'9px', left:'50%', transform:'translateX(-50%)', width:'5px', height:'5px', borderRadius:'50%', background: isExtra ? 'rgba(140,80,0,0.7)' : 'rgba(255,255,255,0.55)' }}/>
              )}
            </div>
          );
        })}
      </div>
      {BLACK_KEYS.map(([pitch, left], i) => {
        const isActive = activeNotes.has(pitch);
        const isExtra  = extraNotes.has(pitch) && !isActive;
        return (
          <div key={i} style={{
            position:'absolute', top:0,
            left:`calc(${left}% + 1px)`, width:'calc(4.28% - 1px)', height:'58%',
            background: isActive
              ? 'linear-gradient(180deg,#FF6622 0%,#CC3300 100%)'
              : isExtra
                ? 'linear-gradient(180deg,#8B6222 0%,#5A3E0A 100%)'
                : T.id === 'hc'
                  ? '#000000'
                  : 'linear-gradient(180deg,#3A3835 0%,#1A1816 100%)',
            borderRadius:'0 0 4px 4px', zIndex:2,
            boxShadow: isActive ? '0 4px 16px rgba(204,68,0,0.55)' : 'inset 0 -2px 0 rgba(0,0,0,0.6),0 4px 8px rgba(0,0,0,0.4)',
            transition:'background 0.08s,box-shadow 0.08s',
          }}/>
        );
      })}
    </div>
  );
}

/* ─── Theme toggle ──────────────────────────────────────────────────── */
function ThemeToggle({ current, onChange, T }) {
  const items = [
    { id:'light', symbol:'○', label:'LUZ' },
    { id:'dark',  symbol:'●', label:'ESC' },
    { id:'hc',    symbol:'◉', label:'HC'  },
  ];
  return (
    <div style={{ display:'flex', gap:'3px', alignItems:'center' }}>
      {items.map(item => (
        <button key={item.id} onClick={() => onChange(item.id)} style={{
          width:'36px', height:'24px',
          background: current === item.id ? T.orange : 'transparent',
          border:`1px solid ${current === item.id ? T.orange : T.border}`,
          borderRadius:'3px', cursor:'pointer',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1px',
          transition:'all 0.12s',
        }}>
          <span style={{ fontSize:'9px', color: current === item.id ? '#fff' : T.textMute, lineHeight:1, fontFamily:"'IBM Plex Mono',monospace" }}>{item.symbol}</span>
        </button>
      ))}
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────────── */
export default function App() {
  const [root,       setRoot]      = useState('C');
  const [typeId,     setTypeId]    = useState('major');
  const [instId,     setInstId]    = useState('piano');
  const [magnificat, setMagnicat]  = useState(false);
  const [playing,    setPlaying]   = useState(false);
  const [listening,  setListening] = useState(false);
  const [voiceMsg,   setVoiceMsg]  = useState('');
  const [search,     setSearch]    = useState('');
  const [themeId,    setThemeId]   = useState('light');
  const recRef = useRef(null);

  const T = THEMES[themeId];
  const rootIdx    = ROOTS.indexOf(root);
  const chord      = CHORD_TYPES.find(c => c.id === typeId);
  const instrument = INSTRUMENTS.find(i => i.id === instId);
  const intervals  = chord?.intervals || [];

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
    return CHORD_TYPES.filter(c => c.name.toLowerCase().includes(s) || c.display.toLowerCase().includes(s) || c.btn.toLowerCase().includes(s));
  }, [search]);

  const handlePlay = () => {
    const freqs = buildVoicing(rootIdx, intervals, extraIntervals, instrument);
    setPlaying(true);
    playChord(freqs, instrument, magnificat);
    setTimeout(() => setPlaying(false), 500);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceMsg('Não suportado.'); return; }
    const rec = new SR();
    rec.lang = 'pt-BR'; rec.interimResults = false;
    rec.onstart  = () => { setListening(true); setVoiceMsg(''); };
    rec.onresult = (e) => { const t = e.results[0][0].transcript; setVoiceMsg(`"${t}"`); parseVoice(t.toLowerCase(), setRoot, setTypeId); };
    rec.onerror  = () => { setListening(false); setVoiceMsg('Erro.'); };
    rec.onend    = () => setListening(false);
    rec.start(); recRef.current = rec;
  };
  const stopListening = () => { recRef.current?.stop(); setListening(false); };

  const mono = "'IBM Plex Mono', monospace";

  /* ── Derived styles ── */
  const btnBase = (active) => ({
    background: active
      ? `linear-gradient(160deg, ${T.orange}, #991100)`
      : T.id === 'hc'
        ? '#FFFFFF'
        : T.id === 'light'
          ? `linear-gradient(160deg, ${T.raised}, #DDD9D0)`
          : `linear-gradient(160deg, #2C2C28, #222220)`,
    color:   active ? '#FFFFFF' : T.id === 'hc' ? '#000000' : T.id === 'light' ? T.text : '#8C8C80',
    border:  `1px solid ${active ? T.orange : T.id === 'hc' ? '#000000' : T.btnBdr}`,
    borderRadius: '4px', cursor:'pointer', transition:'all 0.1s',
    boxShadow: active
      ? `0 0 8px rgba(204,68,0,0.35), inset 0 1px 0 rgba(255,140,80,0.2)`
      : T.id === 'hc'
        ? 'none'
        : T.id === 'light'
          ? `inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -2px 0 rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.1)`
          : `inset 0 2px 3px rgba(0,0,0,0.4)`,
  });

  const labelStyle = {
    fontSize:'7px', letterSpacing:'0.22em',
    textTransform:'uppercase', color: T.textMute,
    fontFamily: mono, marginBottom:'8px',
  };

  return (
    <div style={{ minHeight:'100vh', background:T.body, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', fontFamily:mono, transition:'background 0.2s' }}>

      <div style={{
        width:'100%', maxWidth:'680px',
        background: T.id === 'dark'
          ? 'linear-gradient(160deg,#272724 0%,#1E1D1B 60%,#1A1918 100%)'
          : T.id === 'hc'
            ? '#FFFFFF'
            : 'linear-gradient(160deg,#EDEAE2 0%,#E4E0D8 60%,#DDD9D0 100%)',
        borderRadius: T.id === 'hc' ? '0' : '12px',
        boxShadow: T.shadow,
        padding:'24px',
        position:'relative',
        overflow:'hidden',
        border: T.id === 'hc' ? '2px solid #000' : 'none',
        transition:'background 0.2s, box-shadow 0.2s',
      }}>

        {/* Top stripe */}
        {T.id !== 'hc' && (
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:`linear-gradient(90deg,${T.stripe} 0%,#FF6622 40%,${T.stripe} 100%)`, borderRadius:'12px 12px 0 0' }}/>
        )}
        {T.id === 'hc' && (
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'4px', background:'#CC4400' }}/>
        )}

        {/* Screws — only for light/dark */}
        {T.id !== 'hc' && [
          {top:'14px',left:'14px'},{top:'14px',right:'14px'},
          {bottom:'14px',left:'14px'},{bottom:'14px',right:'14px'}
        ].map((pos,i) => (
          <div key={i} style={{ position:'absolute', ...pos }}>
            <div style={{
              width:'11px', height:'11px', borderRadius:'50%',
              background: T.id === 'light'
                ? 'radial-gradient(circle at 35% 35%,#C8C4BC,#A8A49C)'
                : 'radial-gradient(circle at 35% 35%,#4A4A44,#222220)',
              boxShadow: T.id === 'light'
                ? 'inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 2px rgba(0,0,0,0.2)'
                : '0 1px 3px rgba(0,0,0,0.7)',
              position:'relative',
            }}>
              <div style={{ width:'60%', height:'1.5px', background: T.id === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.55)', position:'absolute', top:'49%', left:'20%', transform:'rotate(42deg)' }}/>
            </div>
          </div>
        ))}

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', paddingBottom:'16px', borderBottom:`1px solid ${T.borderSt}` }}>
          <div>
            <div style={{ fontSize:'10px', letterSpacing:'0.25em', textTransform:'uppercase', color: T.text, fontWeight:'500', marginBottom:'2px' }}>AKORD</div>
            <div style={{ fontSize:'8px', letterSpacing:'0.14em', color:T.textMute, textTransform:'uppercase' }}>Chord Visualizer · v3</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            {/* Signal LED */}
            <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: playing ? T.amber : T.textDim, boxShadow: playing ? `0 0 7px ${T.amber}` : 'none', transition:'all 0.1s' }}/>
              <div style={{ fontSize:'8px', letterSpacing:'0.15em', color:T.textMute, textTransform:'uppercase' }}>SIG</div>
            </div>
            {/* Theme toggle */}
            <ThemeToggle current={themeId} onChange={setThemeId} T={T} />
          </div>
        </div>

        {/* ── Instrument selector ── */}
        <div style={{ marginBottom:'18px' }}>
          <div style={labelStyle}>INSTRUMENTO</div>
          <div style={{ display:'flex', gap:'6px' }}>
            {INSTRUMENTS.map(inst => {
              const active = instId === inst.id;
              return (
                <button key={inst.id} onClick={() => setInstId(inst.id)} style={{
                  ...btnBase(active),
                  flex:1, padding:'10px 8px',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:'6px',
                  boxShadow: active
                    ? T.id === 'hc' ? `0 0 0 2px #000` : `0 0 10px rgba(204,68,0,0.3),inset 0 1px 0 rgba(255,140,80,0.15)`
                    : T.id === 'hc' ? 'none'
                    : T.id === 'light'
                      ? `inset 0 1px 0 rgba(255,255,255,0.7),inset 0 -2px 0 rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.1)`
                      : `inset 0 2px 4px rgba(0,0,0,0.5)`,
                }}>
                  <div style={{
                    width:'6px', height:'6px', borderRadius:'50%',
                    background: active ? (T.id === 'hc' ? '#CC4400' : T.amber) : T.textDim,
                    boxShadow: active && T.id !== 'hc' ? `0 0 7px ${T.amber}` : 'none',
                    transition:'all 0.12s',
                  }}/>
                  <div style={{ fontSize:'8px', letterSpacing:'0.18em', color: active ? (T.id === 'hc' ? '#fff' : T.amber) : T.textMute, textTransform:'uppercase', transition:'color 0.12s' }}>
                    {inst.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Display + Play/Magnificat ── */}
        <div style={{ display:'flex', gap:'14px', marginBottom:'18px', alignItems:'stretch' }}>
          {/* LED Display */}
          <div style={{
            flex:1,
            background: T.display,
            border:`1px solid ${T.id === 'hc' ? '#000' : T.id === 'light' ? '#B0AB9E' : '#0A0A08'}`,
            borderRadius:'6px', padding:'14px 18px 12px',
            boxShadow: T.id === 'dark' ? 'inset 0 2px 14px rgba(0,0,0,0.85)' : T.id === 'light' ? 'inset 0 2px 8px rgba(0,0,0,0.35)' : 'none',
            position:'relative', overflow:'hidden',
          }}>
            {T.scanlines && <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)', pointerEvents:'none', zIndex:1 }}/>}
            <div style={{ position:'relative', zIndex:2 }}>
              <div style={{ fontFamily:"'VT323','Courier New',monospace", fontSize:'clamp(50px,10vw,86px)', color:T.dispText, textShadow:`0 0 12px rgba(255,170,0,0.7),0 0 28px rgba(255,140,0,0.3)`, letterSpacing:'0.02em', lineHeight:1 }}>
                {chordName}
              </div>
              <div style={{ marginTop:'8px', display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ fontSize:'10px', color:'rgba(255,170,0,0.65)', letterSpacing:'0.06em', fontFamily:mono }}>{chord?.name?.toUpperCase()}</div>
                <div style={{ fontSize:'9px', color:'rgba(255,170,0,0.35)', letterSpacing:'0.03em', fontFamily:mono }}>{noteListFull}</div>
              </div>
              {magnificat && extraNames && (
                <div style={{ marginTop:'3px', fontSize:'9px', color:'rgba(255,180,60,0.45)', fontStyle:'italic', letterSpacing:'0.04em', fontFamily:mono }}>✦ {extraNames}</div>
              )}
            </div>
          </div>

          {/* PLAY + MAGNIFICAT */}
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', minWidth:'76px' }}>
            <button onClick={handlePlay} style={{
              flex:1, borderRadius:'7px', cursor:'pointer',
              background: playing
                ? `radial-gradient(circle,#FF6622 0%,${T.orange} 100%)`
                : T.id === 'hc' ? '#FFFFFF'
                : T.id === 'light' ? `linear-gradient(160deg,${T.raised},#D4D0C8)`
                : 'radial-gradient(circle at 40% 35%,#383834,#222220)',
              border:`1px solid ${playing ? T.orange : T.id === 'hc' ? '#000' : T.border}`,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'5px',
              boxShadow: playing
                ? `0 0 18px rgba(204,68,0,0.55),inset 0 1px 0 rgba(255,140,80,0.3)`
                : T.id === 'hc' ? 'none'
                : T.id === 'light' ? `inset 0 1px 0 rgba(255,255,255,0.7),inset 0 -2px 0 rgba(0,0,0,0.1),0 2px 5px rgba(0,0,0,0.12)`
                : `inset 0 2px 4px rgba(0,0,0,0.5)`,
              transform: playing ? 'scale(0.97)' : 'scale(1)',
              transition:'all 0.08s',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <polygon points="6,3 18,10 6,17" fill={playing ? '#fff' : T.id === 'hc' ? '#000' : T.id === 'light' ? T.textMute : '#8C8C80'} style={{ transition:'fill 0.08s' }}/>
              </svg>
              <div style={{ fontSize:'7px', letterSpacing:'0.18em', textTransform:'uppercase', color: playing ? 'rgba(255,255,255,0.9)' : T.textMute, fontFamily:mono }}>PLAY</div>
            </button>

            <button onClick={() => setMagnicat(m => !m)} style={{
              flex:1, borderRadius:'7px', cursor:'pointer',
              background: magnificat
                ? T.id === 'hc' ? '#CC4400' : 'linear-gradient(160deg,#3A2200,#281600)'
                : T.id === 'hc' ? '#FFFFFF'
                : T.id === 'light' ? `linear-gradient(160deg,${T.raised},#D4D0C8)`
                : 'radial-gradient(circle at 40% 35%,#383834,#222220)',
              border:`1px solid ${magnificat ? (T.id === 'hc' ? '#CC4400' : '#AA7722') : T.id === 'hc' ? '#000' : T.border}`,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'4px',
              boxShadow: magnificat
                ? T.id === 'hc' ? 'none' : `0 0 12px rgba(170,119,34,0.4),inset 0 1px 0 rgba(255,200,80,0.15)`
                : T.id === 'hc' ? 'none'
                : T.id === 'light' ? `inset 0 1px 0 rgba(255,255,255,0.7),inset 0 -2px 0 rgba(0,0,0,0.1),0 2px 5px rgba(0,0,0,0.12)`
                : `inset 0 2px 4px rgba(0,0,0,0.5)`,
              transition:'all 0.14s',
            }}>
              <div style={{ fontSize:'17px', lineHeight:1, fontFamily:'serif', color: magnificat ? (T.id === 'hc' ? '#fff' : '#FFCC55') : T.id === 'hc' ? '#000' : T.textMute, textShadow: magnificat && T.id !== 'hc' ? '0 0 8px rgba(255,200,80,0.7)' : 'none', transition:'all 0.14s' }}>✦</div>
              <div style={{ fontSize:'6px', letterSpacing:'0.14em', textTransform:'uppercase', color: magnificat ? (T.id === 'hc' ? '#fff' : 'rgba(255,200,80,0.9)') : T.textMute, textAlign:'center', lineHeight:'1.4', fontFamily:mono }}>MAGNI<br/>FICAT</div>
            </button>
          </div>
        </div>

        {/* ── Piano ── */}
        <div style={{
          background: T.id === 'dark' ? '#121210' : T.id === 'hc' ? '#FFFFFF' : '#C8C4BC',
          border:`1px solid ${T.id === 'hc' ? '#000' : T.id === 'light' ? '#B4B0A8' : '#0A0A08'}`,
          borderRadius:'6px', padding:'12px 12px 16px', marginBottom:'18px',
          boxShadow: T.id === 'dark' ? 'inset 0 3px 12px rgba(0,0,0,0.7)' : T.id === 'light' ? 'inset 0 2px 6px rgba(0,0,0,0.15)' : 'none',
        }}>
          <div style={{ ...labelStyle, marginBottom:'10px', display:'flex', justifyContent:'space-between' }}>
            <span>TECLADO · 2 OITAVAS</span>
            {magnificat && <span style={{ color: T.id === 'hc' ? T.orange : 'rgba(255,180,60,0.55)' }}>✦ EXT.</span>}
          </div>
          <Piano activeNotes={activeNotes} extraNotes={extraNotes} T={T} />
        </div>

        {/* ── Root ── */}
        <div style={{ marginBottom:'16px' }}>
          <div style={labelStyle}>NOTA RAIZ</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
            {ROOTS.map(r => {
              const active = root === r;
              return (
                <button key={r} onClick={() => setRoot(r)} style={{
                  ...btnBase(active),
                  width:'46px', height:'34px', fontSize:'12px',
                  fontWeight: active ? '500' : '400',
                }}>
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chord type ── */}
        <div style={{ marginBottom:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
            <div style={labelStyle}>TIPO DE ACORDE</div>
            <input placeholder="buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{
              background:'transparent',
              border:'none',
              borderBottom:`1px solid ${T.border}`,
              outline:'none', padding:'2px 4px',
              fontSize:'10px', color:T.text,
              fontFamily:mono, letterSpacing:'0.05em', width:'90px',
            }}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(62px,1fr))', gap:'4px' }}>
            {filteredTypes.map(ct => {
              const active = typeId === ct.id;
              return (
                <button key={ct.id} onClick={() => setTypeId(ct.id)} style={{
                  ...btnBase(active),
                  padding:'8px 4px 6px',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:'3px',
                }}>
                  <span style={{ fontSize:'14px', fontFamily:mono, fontWeight:'500', lineHeight:1, color: active ? '#fff' : T.id === 'hc' ? '#000' : T.amber }}>{ct.btn||'M'}</span>
                  <span style={{ fontSize:'7px', color: active ? 'rgba(255,255,255,0.55)' : T.textMute, textAlign:'center', lineHeight:'1.2', letterSpacing:'0.02em' }}>{ct.name}</span>
                </button>
              );
            })}
            {filteredTypes.length === 0 && (
              <div style={{ gridColumn:'1/-1', padding:'16px', textAlign:'center', color:T.textMute, fontSize:'10px' }}>Nenhum acorde encontrado.</div>
            )}
          </div>
        </div>

        {/* ── Voice ── */}
        <div style={{ paddingTop:'16px', borderTop:`1px solid ${T.borderSt}` }}>
          <div style={labelStyle}>VOZ</div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
            <button onClick={listening ? stopListening : startListening} style={{
              ...btnBase(listening),
              padding:'8px 16px',
              fontSize:'9px', letterSpacing:'0.15em', textTransform:'uppercase',
              display:'flex', alignItems:'center', gap:'7px',
            }}>
              <span style={{
                width:'6px', height:'6px', borderRadius:'50%', display:'inline-block',
                background: listening ? (T.id === 'hc' ? '#fff' : 'rgba(255,255,255,0.9)') : T.textMute,
                animation: listening ? 'pulse 1s infinite' : 'none',
              }}/>
              {listening ? 'PARAR' : 'FALAR ACORDE'}
            </button>
            {voiceMsg
              ? <span style={{ fontSize:'9px', color:T.textMute, fontStyle:'italic', letterSpacing:'0.04em' }}>{voiceMsg}</span>
              : <span style={{ fontSize:'8px', color:T.textDim, letterSpacing:'0.04em' }}>Ex: "Dó menor sete" · "Sol maior"</span>
            }
          </div>
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=VT323&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:${T.body}; transition:background 0.2s; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
        button { font-family:'IBM Plex Mono',monospace; }
        input::placeholder { color:${T.textDim}; }
        input { color:${T.text}; }
      `}</style>
    </div>
  );
}
