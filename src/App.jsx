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

const WHITE_KEYS = [0,2,4,5,7,9,11, 0,2,4,5,7,9,11];
const BLACK_KEYS = [
  [1,5.00],[3,12.14],[6,26.43],[8,33.57],[10,40.71],
  [1,54.99],[3,62.14],[6,76.43],[8,83.57],[10,90.71],
];

/* ─── Instruments ───────────────────────────────────────────────────── */
const INSTRUMENTS = [
  {
    id: 'piano',
    label: 'PIANO',
    icon: '♩',
    // Warm, sustained, mid register
    baseOctave: 1,
    strumMs: 28,
    synth: (ctx, freq, t, dur, magOn) => {
      // triangle body + sine air
      [['triangle', 0.10], ['sine', 0.06]].forEach(([type, vol], j) => {
        const osc  = ctx.createOscillator();
        const env  = ctx.createGain();
        const filt = ctx.createBiquadFilter();
        osc.type = type;
        osc.frequency.value = freq * (1 + j * 0.0015);
        filt.type = 'lowpass';
        filt.frequency.value = magOn ? 2800 : 2200;
        filt.Q.value = 0.8;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(vol, t + 0.012);
        env.gain.exponentialRampToValueAtTime(vol * 0.55, t + 0.3);
        env.gain.setValueAtTime(vol * 0.55, t + dur - 0.7);
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(filt); filt.connect(env);
        osc.start(t); osc.stop(t + dur + 0.1);
        return env;
      });
    },
    delayTime: (mag) => mag ? 0.38 : 0.22,
    delayFb:   (mag) => mag ? 0.28 : 0.18,
    delayMix:  0.18,
    dur: (mag) => mag ? 3.6 : 2.6,
    masterVol: 0.52,
  },
  {
    id: 'ukulele',
    label: 'UKULELE',
    icon: '𝄞',
    // Bright, short, high register — nylon pluck
    baseOctave: 2,
    strumMs: 18,
    synth: (ctx, freq, t, dur) => {
      // sine fundamental + 2nd harmonic (very bright)
      [[freq, 0.12], [freq * 2, 0.04], [freq * 3, 0.015]].forEach(([f, vol]) => {
        const osc  = ctx.createOscillator();
        const env  = ctx.createGain();
        const filt = ctx.createBiquadFilter();
        osc.type = 'sine';
        osc.frequency.value = f;
        filt.type = 'bandpass';
        filt.frequency.value = f * 1.8;
        filt.Q.value = 1.2;
        // Pluck: fast attack, exponential decay
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(vol, t + 0.006);
        env.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.12);
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(filt); filt.connect(env);
        osc.start(t); osc.stop(t + dur + 0.05);
        return env;
      });
    },
    delayTime: () => 0.14,
    delayFb:   () => 0.12,
    delayMix:  0.12,
    dur: (mag) => mag ? 1.8 : 1.2,
    masterVol: 0.58,
  },
  {
    id: 'violao',
    label: 'VIOLÃO',
    icon: '♪',
    // Warm pluck, wider range, steel-string feel — Karplus-Strong-like
    baseOctave: 0,  // bass notes start low, treble notes go up
    strumMs: 38,
    synth: (ctx, freq, t, dur) => {
      // Karplus-Strong approximation: noise burst shaped by lowpass
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data   = buffer.getChannelData(0);

      // Fill with shaped noise (decaying)
      const period = Math.round(ctx.sampleRate / freq);
      for (let s = 0; s < bufferSize; s++) {
        if (s < period * 2) {
          // Initial pluck energy
          data[s] = (Math.random() * 2 - 1) * (1 - s / (period * 2));
        } else {
          // KS feedback: average of previous samples (approximated)
          data[s] = (data[s - period] + data[s - period + 1]) * 0.499;
        }
      }

      const src  = ctx.createBufferSource();
      const filt = ctx.createBiquadFilter();
      const env  = ctx.createGain();

      src.buffer = buffer;
      src.loop   = true;
      src.loopEnd = period / ctx.sampleRate;

      filt.type = 'lowpass';
      filt.frequency.value = 3200;
      filt.Q.value = 0.5;

      env.gain.setValueAtTime(0.14, t);
      env.gain.exponentialRampToValueAtTime(0.08, t + 0.1);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      src.connect(filt); filt.connect(env);
      src.start(t); src.stop(t + dur + 0.05);
      return env;
    },
    delayTime: () => 0.28,
    delayFb:   () => 0.15,
    delayMix:  0.14,
    dur: (mag) => mag ? 3.2 : 2.2,
    masterVol: 0.60,
  },
];

/* ─── Magnificat ────────────────────────────────────────────────────── */
function magnify(intervals, typeId) {
  const base = new Set(intervals);
  const add = [];
  if (!base.has(2) && !base.has(1)) add.push(2);
  if (['major','maj7','dom7','add9','6'].includes(typeId) && !base.has(9))  add.push(9);
  if (['minor','min7','min9','m6'].includes(typeId)       && !base.has(5))  add.push(5);
  if (['dim','halfdim'].includes(typeId)                  && !base.has(11)) add.push(11);
  if (typeId === 'dom7'                                   && !base.has(1))  add.push(1);
  if (['sus','sus2'].includes(typeId)                     && !base.has(11)) add.push(11);
  return add;
}

/* ─── Audio engine ──────────────────────────────────────────────────── */
const BASE_C = { 0: 32.703, 1: 65.406, 2: 130.813, 3: 261.626 }; // C0–C3

function noteFreq(pitchClass, octave) {
  return BASE_C[octave] * Math.pow(2, pitchClass / 12);
}

function buildVoicing(rootIdx, intervals, extraIntervals, instrument) {
  const all = [...intervals, ...extraIntervals].sort((a, b) => a - b);
  const base = instrument.baseOctave;

  return all.map((interval, i) => {
    const pc  = (rootIdx + interval) % 12;
    // Spread: bass on bottom, treble climb up
    let oct = base;
    if (instrument.id === 'violao') {
      // Guitar spread: bass 2 bottom strings, middle, treble
      if (i === 0) oct = base;
      else if (i === 1) oct = base;
      else if (i <= 3)  oct = base + 1;
      else              oct = base + 2;
    } else if (instrument.id === 'ukulele') {
      // Uke: tight high voicing
      oct = i < 2 ? base : base + 1;
    } else {
      // Piano
      oct = i < 3 ? base : base + 1;
    }
    return noteFreq(pc, Math.min(oct, 3));
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

function playChord(frequencies, instrument, magOn) {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.value = instrument.masterVol;
  master.connect(ctx.destination);

  // Delay/reverb
  const delay    = ctx.createDelay(1.0);
  const fbGain   = ctx.createGain();
  const delayOut = ctx.createGain();
  delay.delayTime.value = instrument.delayTime(magOn);
  fbGain.gain.value     = instrument.delayFb(magOn);
  delayOut.gain.value   = instrument.delayMix;
  delay.connect(fbGain); fbGain.connect(delay);
  delay.connect(delayOut); delayOut.connect(master);

  const dur      = instrument.dur(magOn);
  const strumSec = instrument.strumMs / 1000;

  frequencies.forEach((freq, i) => {
    const t = now + i * strumSec;
    const envNodes = instrument.synth(ctx, freq, t, dur, magOn);

    // Connect returned env nodes to master + delay if they exist
    if (envNodes) {
      [].concat(envNodes).forEach(env => {
        try { env.connect(master); env.connect(delay); } catch(_) {}
      });
    } else {
      // For instruments that wire internally, hook last gain to master
      // We rely on internal wiring reaching master via closure
    }
  });
}

/* ─── Fix: instruments wire env internally, we need to hook master ─── */
// Rewire: pass master + delay into synth
function playChordFixed(frequencies, instrument, magOn) {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.value = instrument.masterVol;
  master.connect(ctx.destination);

  const delay    = ctx.createDelay(1.2);
  const fbGain   = ctx.createGain();
  const delayOut = ctx.createGain();
  delay.delayTime.value = instrument.delayTime(magOn);
  fbGain.gain.value     = instrument.delayFb(magOn);
  delayOut.gain.value   = instrument.delayMix;
  delay.connect(fbGain); fbGain.connect(delay);
  delay.connect(delayOut); delayOut.connect(master);

  const dur      = instrument.dur(magOn);
  const strumSec = instrument.strumMs / 1000;

  frequencies.forEach((freq, i) => {
    const t = now + i * strumSec;

    if (instrument.id === 'piano') {
      [['triangle', 0.10], ['sine', 0.06]].forEach(([type, vol], j) => {
        const osc  = ctx.createOscillator();
        const env  = ctx.createGain();
        const filt = ctx.createBiquadFilter();
        osc.type = type;
        osc.frequency.value = freq * (1 + j * 0.0015);
        filt.type = 'lowpass';
        filt.frequency.value = magOn ? 2800 : 2200;
        filt.Q.value = 0.8;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(vol, t + 0.012);
        env.gain.exponentialRampToValueAtTime(vol * 0.55, t + 0.3);
        env.gain.setValueAtTime(vol * 0.55, t + dur - 0.7);
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(filt); filt.connect(env);
        env.connect(master); env.connect(delay);
        osc.start(t); osc.stop(t + dur + 0.1);
      });
    }

    if (instrument.id === 'ukulele') {
      [[freq, 0.13], [freq * 2, 0.045], [freq * 3, 0.018]].forEach(([f, vol]) => {
        const osc  = ctx.createOscillator();
        const env  = ctx.createGain();
        const filt = ctx.createBiquadFilter();
        osc.type = 'sine';
        osc.frequency.value = f;
        filt.type = 'bandpass';
        filt.frequency.value = f * 1.6;
        filt.Q.value = 1.4;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(vol, t + 0.005);
        env.gain.exponentialRampToValueAtTime(vol * 0.25, t + 0.1);
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(filt); filt.connect(env);
        env.connect(master); env.connect(delay);
        osc.start(t); osc.stop(t + dur + 0.05);
      });
    }

    if (instrument.id === 'violao') {
      // Karplus-Strong approximation
      const sampleRate = ctx.sampleRate;
      const period     = Math.max(2, Math.round(sampleRate / freq));
      const bufLen     = period * 80; // ~enough cycles for the dur
      const buffer     = ctx.createBuffer(1, bufLen, sampleRate);
      const data       = buffer.getChannelData(0);

      // Seed: short noise burst
      for (let s = 0; s < period; s++) {
        data[s] = Math.random() * 2 - 1;
      }
      // KS feedback average
      for (let s = period; s < bufLen; s++) {
        data[s] = (data[s - period] + data[s - period + 1]) * 0.4995;
      }

      const src  = ctx.createBufferSource();
      const filt = ctx.createBiquadFilter();
      const env  = ctx.createGain();

      src.buffer = buffer;
      filt.type  = 'lowpass';
      filt.frequency.value = 4000;
      filt.Q.value = 0.4;

      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.22, t + 0.004);
      env.gain.exponentialRampToValueAtTime(0.10, t + 0.08);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      src.connect(filt); filt.connect(env);
      env.connect(master); env.connect(delay);
      src.start(t); src.stop(t + dur + 0.05);
    }
  });
}

/* ─── Voice recognition ─────────────────────────────────────────────── */
function parseVoice(text, setRoot, setTypeId) {
  const noteMap = [
    ['dó#','C#'],['do#','C#'],['ré#','D#'],['re#','D#'],
    ['fá#','F#'],['fa#','F#'],['sol#','G#'],['lá#','A#'],['la#','A#'],
    ['dó','C'],['do','C'],['ré','D'],['re','D'],['mi','E'],
    ['fá','F'],['fa','F'],['sol','G'],['lá','A'],['la','A'],['si','B'],
  ];
  for (const [k, v] of noteMap) { if (text.includes(k)) { setRoot(v); break; } }
  if      (/menor.?sete|m7/.test(text))        setTypeId('min7');
  else if (/maior.?sete|maj7/.test(text))      setTypeId('maj7');
  else if (/nona maior|maj9/.test(text))       setTypeId('maj9');
  else if (/nona/.test(text))                  setTypeId('9');
  else if (/sete|dominante/.test(text))        setTypeId('dom7');
  else if (/menor/.test(text))                 setTypeId('minor');
  else if (/maior/.test(text))                 setTypeId('major');
  else if (/diminu/.test(text))                setTypeId('dim');
  else if (/aument/.test(text))                setTypeId('aug');
  else if (/sus.*dois|sus2/.test(text))        setTypeId('sus2');
  else if (/sus/.test(text))                   setTypeId('sus');
  else if (/semi/.test(text))                  setTypeId('halfdim');
  else if (/sexta menor|m6/.test(text))        setTypeId('m6');
  else if (/sexta|6/.test(text))               setTypeId('6');
}

/* ─── Sub-components ────────────────────────────────────────────────── */
function Screw() {
  return (
    <div style={{
      width:'11px', height:'11px', borderRadius:'50%',
      background:'radial-gradient(circle at 35% 35%, #4A4A44, #222220)',
      boxShadow:'0 1px 3px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
      flexShrink:0, position:'relative',
    }}>
      <div style={{ width:'60%', height:'1.5px', background:'rgba(0,0,0,0.55)', position:'absolute', top:'49%', left:'20%', transform:'rotate(42deg)' }}/>
    </div>
  );
}

function Piano({ activeNotes, extraNotes }) {
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
                  : 'linear-gradient(180deg,#E8E4D8 0%,#CECA BC 100%)',
              borderRadius:'0 0 6px 6px',
              boxShadow: isActive
                ? 'inset 0 -3px 0 rgba(0,0,0,0.35),0 2px 10px rgba(204,68,0,0.5)'
                : isExtra
                  ? 'inset 0 -3px 0 rgba(0,0,0,0.2),0 1px 4px rgba(0,0,0,0.3)'
                  : 'inset 0 -4px 0 rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.5),0 2px 4px rgba(0,0,0,0.35)',
              transition:'background 0.08s,box-shadow 0.08s',
              position:'relative',
            }}>
              {(isActive || isExtra) && (
                <div style={{
                  position:'absolute', bottom:'9px', left:'50%',
                  transform:'translateX(-50%)',
                  width:'5px', height:'5px', borderRadius:'50%',
                  background: isExtra ? 'rgba(160,100,0,0.7)' : 'rgba(255,255,255,0.55)',
                }}/>
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
                : 'linear-gradient(180deg,#3A3835 0%,#1A1816 100%)',
            borderRadius:'0 0 4px 4px', zIndex:2,
            boxShadow: isActive
              ? '0 4px 16px rgba(204,68,0,0.55),inset 0 1px 0 rgba(255,140,80,0.3)'
              : isExtra
                ? '0 3px 8px rgba(100,60,0,0.4)'
                : 'inset 0 -2px 0 rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.07),0 4px 8px rgba(0,0,0,0.5)',
            transition:'background 0.08s,box-shadow 0.08s',
          }}/>
        );
      })}
    </div>
  );
}

/* ─── Instrument selector button ────────────────────────────────────── */
function InstrumentBtn({ instrument, active, onClick }) {
  const icons = { piano: '⊟', ukulele: '⊞', violao: '⊠' };
  return (
    <button onClick={onClick} style={{
      flex:1, padding:'10px 8px',
      background: active
        ? 'linear-gradient(160deg,#3A2800,#281C00)'
        : 'linear-gradient(160deg,#2A2A26,#1E1E1C)',
      border:`1px solid ${active ? '#AA7722' : '#343430'}`,
      borderRadius:'5px',
      cursor:'pointer',
      display:'flex', flexDirection:'column', alignItems:'center', gap:'6px',
      boxShadow: active
        ? '0 0 12px rgba(170,119,34,0.35),inset 0 1px 0 rgba(255,200,80,0.15)'
        : 'inset 0 2px 4px rgba(0,0,0,0.5)',
      transition:'all 0.12s',
    }}>
      {/* Indicator LED */}
      <div style={{
        width:'6px', height:'6px', borderRadius:'50%',
        background: active ? '#FFCC44' : '#2E2E2A',
        boxShadow: active ? '0 0 8px rgba(255,200,60,0.8)' : 'none',
        transition:'all 0.12s',
      }}/>
      {/* Label */}
      <div style={{
        fontSize:'8px', letterSpacing:'0.18em',
        fontFamily:"'IBM Plex Mono', monospace",
        color: active ? '#FFCC44' : '#5C5C52',
        textTransform:'uppercase',
        transition:'color 0.12s',
      }}>
        {instrument.label}
      </div>
    </button>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────── */
export default function App() {
  const [root,        setRoot]       = useState('C');
  const [typeId,      setTypeId]     = useState('major');
  const [instId,      setInstId]     = useState('piano');
  const [magnificat,  setMagnicat]   = useState(false);
  const [playing,     setPlaying]    = useState(false);
  const [listening,   setListening]  = useState(false);
  const [voiceMsg,    setVoiceMsg]   = useState('');
  const [search,      setSearch]     = useState('');
  const recRef = useRef(null);

  const rootIdx    = ROOTS.indexOf(root);
  const chord      = CHORD_TYPES.find(c => c.id === typeId);
  const instrument = INSTRUMENTS.find(i => i.id === instId);
  const intervals  = chord?.intervals || [];

  const activeNotes = useMemo(() =>
    new Set(intervals.map(i => (rootIdx + i) % 12)),
    [rootIdx, intervals]);

  const extraIntervals = useMemo(() =>
    magnificat ? magnify(intervals, typeId) : [],
    [magnificat, intervals, typeId]);

  const extraNotes = useMemo(() =>
    new Set(extraIntervals.map(i => (rootIdx + i) % 12)),
    [rootIdx, extraIntervals]);

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
    const freqs = buildVoicing(rootIdx, intervals, extraIntervals, instrument);
    setPlaying(true);
    playChordFixed(freqs, instrument, magnificat);
    setTimeout(() => setPlaying(false), 500);
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
    chassis: '#1A1918',
    panel:   '#222220',
    display: '#080806',
    label:   '#5C5C52',
    lblBrt:  '#8C8C80',
    border:  '#343430',
    stripe:  '#CC4400',
    amber:   '#FFAA00',
    orange:  '#CC4400',
  };

  return (
    <div style={{ minHeight:'100vh', background:C.chassis, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', fontFamily:mono }}>

      <div style={{
        width:'100%', maxWidth:'680px',
        background:'linear-gradient(160deg,#272724 0%,#1E1D1B 60%,#1A1918 100%)',
        borderRadius:'12px',
        boxShadow:'0 0 0 1px #0A0908,0 10px 60px rgba(0,0,0,0.85),0 2px 4px rgba(0,0,0,0.9)',
        padding:'24px',
        position:'relative',
        overflow:'hidden',
      }}>

        {/* Top stripe */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:`linear-gradient(90deg,${C.stripe} 0%,#FF6622 40%,${C.stripe} 100%)`, borderRadius:'12px 12px 0 0' }}/>

        {/* Screws */}
        {[['14px','14px'],['14px','auto'],['auto','14px'],['auto','auto']].map(([t,b,l,r],i) => {
          const pos = [
            {top:'14px',left:'14px'},{top:'14px',right:'14px'},
            {bottom:'14px',left:'14px'},{bottom:'14px',right:'14px'}
          ][i];
          return <div key={i} style={{ position:'absolute', ...pos }}><Screw/></div>;
        })}

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', paddingBottom:'16px', borderBottom:`1px solid #2A2A26` }}>
          <div>
            <div style={{ fontSize:'10px', letterSpacing:'0.25em', textTransform:'uppercase', color:C.lblBrt, marginBottom:'2px' }}>AKORD</div>
            <div style={{ fontSize:'8px', letterSpacing:'0.14em', color:'#3C3C36', textTransform:'uppercase' }}>Chord Visualizer · v3</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: playing ? C.amber : '#302E2C', boxShadow: playing ? `0 0 8px ${C.amber}` : 'none', transition:'all 0.1s' }}/>
            <div style={{ fontSize:'8px', letterSpacing:'0.15em', color:C.label, textTransform:'uppercase' }}>SIGNAL</div>
          </div>
        </div>

        {/* ── Instrument selector ── */}
        <div style={{ marginBottom:'18px' }}>
          <div style={{ fontSize:'7px', letterSpacing:'0.22em', textTransform:'uppercase', color:C.label, marginBottom:'8px' }}>INSTRUMENTO</div>
          <div style={{ display:'flex', gap:'6px' }}>
            {INSTRUMENTS.map(inst => (
              <InstrumentBtn
                key={inst.id}
                instrument={inst}
                active={instId === inst.id}
                onClick={() => setInstId(inst.id)}
              />
            ))}
          </div>
        </div>

        {/* ── Display + Play/Magnificat ── */}
        <div style={{ display:'flex', gap:'14px', marginBottom:'18px', alignItems:'stretch' }}>

          {/* LED Display */}
          <div style={{
            flex:1, background:C.display,
            border:`1px solid #0A0A08`,
            borderRadius:'6px', padding:'14px 18px 12px',
            boxShadow:'inset 0 2px 14px rgba(0,0,0,0.85)',
            position:'relative', overflow:'hidden',
          }}>
            <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)', pointerEvents:'none', zIndex:1 }}/>
            <div style={{ position:'relative', zIndex:2 }}>
              <div style={{
                fontFamily:"'VT323','Courier New',monospace",
                fontSize:'clamp(50px,10vw,86px)',
                color:C.amber,
                textShadow:`0 0 12px rgba(255,170,0,0.8),0 0 30px rgba(255,140,0,0.35)`,
                letterSpacing:'0.02em',
                lineHeight:1,
              }}>
                {chordName}
              </div>
              <div style={{ marginTop:'8px', display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ fontSize:'10px', color:'rgba(255,170,0,0.6)', letterSpacing:'0.06em' }}>{chord?.name?.toUpperCase()}</div>
                <div style={{ fontSize:'9px',  color:'rgba(255,170,0,0.32)', letterSpacing:'0.03em' }}>{noteListFull}</div>
              </div>
              {magnificat && extraNames && (
                <div style={{ marginTop:'3px', fontSize:'9px', color:'rgba(255,180,60,0.45)', fontStyle:'italic', letterSpacing:'0.04em' }}>✦ {extraNames}</div>
              )}
            </div>
          </div>

          {/* PLAY + MAGNIFICAT */}
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', minWidth:'76px' }}>
            <button onClick={handlePlay} style={{
              flex:1,
              background: playing
                ? `radial-gradient(circle,#FF6622 0%,${C.orange} 100%)`
                : 'radial-gradient(circle at 40% 35%,#383834,#222220)',
              border:`1px solid ${playing ? C.orange : C.border}`,
              borderRadius:'7px', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'5px',
              boxShadow: playing
                ? `0 0 20px rgba(204,68,0,0.6),inset 0 1px 0 rgba(255,140,80,0.3)`
                : `inset 0 2px 4px rgba(0,0,0,0.5),inset 0 -1px 0 rgba(255,255,255,0.04)`,
              transition:'all 0.08s', transform: playing ? 'scale(0.97)' : 'scale(1)',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <polygon points="6,3 18,10 6,17" fill={playing ? '#fff' : C.lblBrt} style={{ transition:'fill 0.08s' }}/>
              </svg>
              <div style={{ fontSize:'7px', letterSpacing:'0.18em', textTransform:'uppercase', color: playing ? 'rgba(255,255,255,0.85)' : C.label }}>PLAY</div>
            </button>

            <button onClick={() => setMagnicat(m => !m)} style={{
              flex:1,
              background: magnificat
                ? 'linear-gradient(160deg,#3A2200,#281600)'
                : 'radial-gradient(circle at 40% 35%,#383834,#222220)',
              border:`1px solid ${magnificat ? '#AA7722' : C.border}`,
              borderRadius:'7px', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'4px',
              boxShadow: magnificat
                ? `0 0 14px rgba(170,119,34,0.4),inset 0 1px 0 rgba(255,200,80,0.15)`
                : `inset 0 2px 4px rgba(0,0,0,0.5)`,
              transition:'all 0.14s',
            }}>
              <div style={{ fontSize:'17px', lineHeight:1, fontFamily:'serif', color: magnificat ? '#FFCC55' : C.label, textShadow: magnificat ? '0 0 8px rgba(255,200,80,0.8)' : 'none', transition:'all 0.14s' }}>✦</div>
              <div style={{ fontSize:'6px', letterSpacing:'0.14em', textTransform:'uppercase', color: magnificat ? 'rgba(255,200,80,0.9)' : C.label, textAlign:'center', lineHeight:'1.4' }}>MAGNI<br/>FICAT</div>
            </button>
          </div>
        </div>

        {/* ── Piano ── */}
        <div style={{
          background:'#121210', border:`1px solid #0A0A08`,
          borderRadius:'6px', padding:'12px 12px 16px', marginBottom:'18px',
          boxShadow:'inset 0 3px 12px rgba(0,0,0,0.7)',
        }}>
          <div style={{ fontSize:'7px', letterSpacing:'0.22em', textTransform:'uppercase', color:C.label, marginBottom:'10px', display:'flex', justifyContent:'space-between' }}>
            <span>TECLADO · 2 OITAVAS</span>
            {magnificat && <span style={{ color:'rgba(255,180,60,0.45)' }}>✦ EXT. ATIVAS</span>}
          </div>
          <Piano activeNotes={activeNotes} extraNotes={extraNotes} />
        </div>

        {/* ── Root ── */}
        <div style={{ marginBottom:'16px' }}>
          <div style={{ fontSize:'7px', letterSpacing:'0.22em', textTransform:'uppercase', color:C.label, marginBottom:'8px' }}>NOTA RAIZ</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
            {ROOTS.map(r => {
              const active = root === r;
              return (
                <button key={r} onClick={() => setRoot(r)} style={{
                  width:'46px', height:'34px', fontFamily:mono, fontSize:'12px',
                  background: active ? 'linear-gradient(160deg,#CC4400,#991100)' : 'linear-gradient(160deg,#2C2C28,#222220)',
                  color: active ? '#fff' : C.lblBrt,
                  border:`1px solid ${active ? '#CC4400' : C.border}`,
                  borderRadius:'4px', cursor:'pointer', fontWeight: active ? '500' : '400',
                  boxShadow: active ? '0 0 10px rgba(204,68,0,0.4),inset 0 1px 0 rgba(255,140,80,0.3)' : 'inset 0 2px 3px rgba(0,0,0,0.4)',
                  transition:'all 0.1s',
                }}>{r}</button>
              );
            })}
          </div>
        </div>

        {/* ── Chord type ── */}
        <div style={{ marginBottom:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
            <div style={{ fontSize:'7px', letterSpacing:'0.22em', textTransform:'uppercase', color:C.label }}>TIPO DE ACORDE</div>
            <input placeholder="buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{
              background:'#161614', border:'none', borderBottom:`1px solid ${C.border}`,
              outline:'none', padding:'2px 4px', fontSize:'10px', color:C.lblBrt,
              fontFamily:mono, letterSpacing:'0.05em', width:'90px',
            }}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(62px,1fr))', gap:'4px' }}>
            {filteredTypes.map(ct => {
              const active = typeId === ct.id;
              return (
                <button key={ct.id} onClick={() => setTypeId(ct.id)} style={{
                  padding:'8px 4px 6px', borderRadius:'4px', cursor:'pointer',
                  background: active ? 'linear-gradient(160deg,#CC4400,#991100)' : 'linear-gradient(160deg,#2C2C28,#222220)',
                  color: active ? '#fff' : C.lblBrt,
                  border:`1px solid ${active ? '#CC4400' : C.border}`,
                  boxShadow: active ? '0 0 8px rgba(204,68,0,0.3),inset 0 1px 0 rgba(255,140,80,0.2)' : 'inset 0 2px 3px rgba(0,0,0,0.4)',
                  transition:'all 0.1s',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:'3px',
                }}>
                  <span style={{ fontSize:'14px', fontFamily:mono, fontWeight:'500', lineHeight:1, color: active ? '#fff' : C.amber }}>{ct.btn||'M'}</span>
                  <span style={{ fontSize:'7px', color: active ? 'rgba(255,255,255,0.5)' : C.label, textAlign:'center', lineHeight:'1.2', letterSpacing:'0.02em' }}>{ct.name}</span>
                </button>
              );
            })}
            {filteredTypes.length === 0 && (
              <div style={{ gridColumn:'1/-1', padding:'16px', textAlign:'center', color:C.label, fontSize:'10px' }}>Nenhum acorde encontrado.</div>
            )}
          </div>
        </div>

        {/* ── Voice ── */}
        <div style={{ paddingTop:'16px', borderTop:`1px solid #2A2A26` }}>
          <div style={{ fontSize:'7px', letterSpacing:'0.22em', textTransform:'uppercase', color:C.label, marginBottom:'8px' }}>VOZ</div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
            <button onClick={listening ? stopListening : startListening} style={{
              padding:'8px 16px', borderRadius:'4px', cursor:'pointer',
              fontFamily:mono, fontSize:'9px', letterSpacing:'0.15em', textTransform:'uppercase',
              background: listening ? `linear-gradient(160deg,${C.orange},#991100)` : 'linear-gradient(160deg,#2C2C28,#222220)',
              color: listening ? '#fff' : C.lblBrt,
              border:`1px solid ${listening ? C.orange : C.border}`,
              boxShadow: listening ? `0 0 12px rgba(204,68,0,0.5)` : 'inset 0 2px 3px rgba(0,0,0,0.4)',
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
              : <span style={{ fontSize:'8px', color:'#363630', letterSpacing:'0.04em' }}>Ex: "Dó menor sete" · "Sol maior"</span>
            }
          </div>
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=VT323&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#141412; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
        button { font-family:'IBM Plex Mono',monospace; }
        input::placeholder { color:#3A3A34; }
      `}</style>
    </div>
  );
}
