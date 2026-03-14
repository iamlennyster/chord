import { useState, useMemo, useRef } from "react";

/* ═══════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════ */
const ROOTS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const CHORD_TYPES = [
  { id:'major',   display:'',     btn:'M',    name:'Maior',       intervals:[0,4,7] },
  { id:'minor',   display:'m',    btn:'m',    name:'Menor',       intervals:[0,3,7] },
  { id:'dom7',    display:'7',    btn:'7',    name:'Dom. 7ª',     intervals:[0,4,7,10] },
  { id:'maj7',    display:'maj7', btn:'maj7', name:'Maior 7ª',    intervals:[0,4,7,11] },
  { id:'min7',    display:'m7',   btn:'m7',   name:'Menor 7ª',    intervals:[0,3,7,10] },
  { id:'sus2',    display:'sus2', btn:'sus2', name:'Suspensa 2',  intervals:[0,2,7] },
  { id:'sus',     display:'sus',  btn:'sus',  name:'Suspensa 4',  intervals:[0,5,7] },
  { id:'dim',     display:'•',    btn:'•',    name:'Diminuto',    intervals:[0,3,6] },
  { id:'dim7',    display:'•7',   btn:'•7',   name:'Dim 7ª',      intervals:[0,3,6,9] },
  { id:'aug',     display:'+',    btn:'+',    name:'Aumentado',   intervals:[0,4,8] },
  { id:'halfdim', display:'ø',    btn:'ø',    name:'Semi-dim',    intervals:[0,3,6,10] },
  { id:'add9',    display:'add9', btn:'add9', name:'Add 9',       intervals:[0,2,4,7] },
  { id:'6',       display:'6',    btn:'6',    name:'Sexta Maior', intervals:[0,4,7,9] },
  { id:'m6',      display:'m6',   btn:'m6',   name:'Sexta Menor', intervals:[0,3,7,9] },
  { id:'9',       display:'9',    btn:'9',    name:'Nona Dom.',   intervals:[0,2,4,7,10] },
  { id:'maj9',    display:'maj9', btn:'maj9', name:'Nona Maior',  intervals:[0,2,4,7,11] },
  { id:'min9',    display:'m9',   btn:'m9',   name:'Nona Menor',  intervals:[0,2,3,7,10] },
  { id:'11',      display:'11',   btn:'11',   name:'Décima-1ª',   intervals:[0,4,5,7,10] },
  { id:'13',      display:'13',   btn:'13',   name:'Décima-3ª',   intervals:[0,4,7,9,10] },
  { id:'7b5',     display:'7♭5',  btn:'7♭5',  name:'Dom 7ª ♭5',   intervals:[0,4,6,10] },
];

const NOTE_NAMES_PT = {
  0:'Dó',1:'Dó#',2:'Ré',3:'Ré#',4:'Mi',5:'Fá',
  6:'Fá#',7:'Sol',8:'Sol#',9:'Lá',10:'Lá#',11:'Si'
};

/* ═══════════════════════════════════════════════════
   FRETBOARD DATA
═══════════════════════════════════════════════════ */
// Guitar: E2 A2 D3 G3 B3 E4
const GUITAR_PC    = [4, 9, 2, 7, 11, 4];
const GUITAR_NAMES = ['E','A','D','G','B','e'];
const GUITAR_FREQ  = [82.41, 110.00, 146.83, 196.00, 246.94, 329.63];

// Ukulele soprano: G4(reentrant) C4 E4 A4
const UKE_PC    = [7, 0, 4, 9];
const UKE_NAMES = ['G','C','E','A'];
const UKE_FREQ  = [392.00, 261.63, 329.63, 440.00];

// Piano keyboard
const WHITE_KEYS = [0,2,4,5,7,9,11, 0,2,4,5,7,9,11];
const BLACK_KEYS = [
  [1,5.00],[3,12.14],[6,26.43],[8,33.57],[10,40.71],
  [1,54.99],[3,62.14],[6,76.43],[8,83.57],[10,90.71],
];

/* ═══════════════════════════════════════════════════
   FINGERING ALGORITHM
═══════════════════════════════════════════════════ */
function findFingering(rootPc, intervals, tuningPc) {
  const chordPcs = new Set(intervals.map(i => (rootPc + i) % 12));
  const n = tuningPc.length;
  let best = null, bestScore = -Infinity;

  for (let pos = 0; pos <= 10; pos++) {
    const frets = tuningPc.map(open => {
      for (let f = pos; f <= pos + 3; f++) {
        if (chordPcs.has((open + f) % 12)) return f;
      }
      return -1;
    });

    const played   = frets.filter(f => f >= 0);
    if (played.length < Math.min(n - 1, 3)) continue;

    const playedPcs = new Set(
      frets.map((f, i) => f >= 0 ? (tuningPc[i] + f) % 12 : null).filter(x => x !== null)
    );
    const covered  = [...chordPcs].filter(p => playedPcs.has(p)).length;
    const frettedNZ = frets.filter(f => f > 0);
    const span     = frettedNZ.length > 1
      ? Math.max(...frettedNZ) - Math.min(...frettedNZ) : 0;
    const bassIdx  = frets.findIndex(f => f >= 0);
    const bassNote = bassIdx >= 0 ? (tuningPc[bassIdx] + frets[bassIdx]) % 12 : -1;
    const rootBass = bassNote === rootPc;

    const score = covered * 12 + played.length * 3 + (rootBass ? 5 : 0) - span * 2 - pos * 0.3;
    if (score > bestScore) { bestScore = score; best = [...frets]; }
  }
  return best || new Array(n).fill(-1);
}

/* ═══════════════════════════════════════════════════
   AUDIO ENGINE
═══════════════════════════════════════════════════ */
let _ctx = null;
function getCtx() {
  if (!_ctx || _ctx.state === 'closed')
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function makeReverb(ctx, decayTime = 1.5) {
  const sr     = ctx.sampleRate;
  const len    = Math.ceil(sr * decayTime);
  const buf    = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

/* — Grand Piano — additive synthesis w/ inharmonicity */
function playPianoNote(ctx, freq, t, dur, dest) {
  const B = 0.00018; // inharmonicity constant
  // [partial_number, relative_amplitude]
  const partials = [[1,1.0],[2,0.55],[3,0.38],[4,0.22],[5,0.16],[6,0.10],[8,0.06],[10,0.04]];

  partials.forEach(([n, amp]) => {
    const pf = freq * n * Math.sqrt(1 + B * n * n);
    [0, 0.0011].forEach(detune => {                    // pair of slightly detuned sine = chorus
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = pf * (1 + detune);

      const vol = amp * 0.065;
      const attack = 0.004;
      const halfLife = Math.max(0.3, dur * 0.5 / Math.sqrt(n)); // higher partials decay faster

      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vol, t + attack);
      env.gain.exponentialRampToValueAtTime(vol * 0.55, t + halfLife);
      env.gain.exponentialRampToValueAtTime(vol * 0.2, t + dur * 0.85);
      env.gain.exponentialRampToValueAtTime(0.00005, t + dur);

      osc.connect(env); env.connect(dest);
      osc.start(t); osc.stop(t + dur + 0.15);
    });
  });
}

/* — Soprano Ukulele — Karplus-Strong at proper uke frequencies */
function playUkeNote(ctx, freq, t, dur, dest) {
  const sr  = ctx.sampleRate;
  const N   = Math.max(2, Math.round(sr / freq));
  const len = Math.ceil(sr * dur);
  const buf = ctx.createBuffer(1, len, sr);
  const d   = buf.getChannelData(0);

  // Seed: white noise, LP filtered once (softer pluck)
  for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
  for (let i = 1; i < N; i++) d[i] = d[i] * 0.65 + d[i - 1] * 0.35;

  // KS: lossy averaging filter (0.499 = warm, faster decay; 0.4998 = bright, longer)
  const decay = 0.4994 + (freq / 44100) * 0.001; // brightness tracks pitch
  for (let s = N; s < len; s++)
    d[s] = decay * (d[s - N] + (s - N - 1 >= 0 ? d[s - N - 1] : 0));

  const src   = ctx.createBufferSource();
  const body  = ctx.createBiquadFilter(); // mahogany warmth
  const bite  = ctx.createBiquadFilter(); // nylon bite / presence
  const shelf = ctx.createBiquadFilter(); // air
  const env   = ctx.createGain();

  src.buffer = buf;

  body.type        = 'peaking';
  body.frequency.value = 900;
  body.gain.value      = 5;
  body.Q.value         = 1.2;

  bite.type        = 'peaking';
  bite.frequency.value = 3400;
  bite.gain.value      = 7;
  bite.Q.value         = 1.5;

  shelf.type = 'highshelf';
  shelf.frequency.value = 8000;
  shelf.gain.value      = -4; // roll off extreme highs = wood damping

  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(0.26, t + 0.003);
  env.gain.exponentialRampToValueAtTime(0.00005, t + dur);

  src.connect(body); body.connect(bite); bite.connect(shelf);
  shelf.connect(env); env.connect(dest);
  src.start(t); src.stop(t + dur + 0.08);
}

/* — Steel-string Violão — Karplus-Strong with guitar body EQ */
function playGuitarNote(ctx, freq, t, dur, dest) {
  const sr  = ctx.sampleRate;
  const N   = Math.max(2, Math.round(sr / freq));
  const len = Math.ceil(sr * dur);
  const buf = ctx.createBuffer(1, len, sr);
  const d   = buf.getChannelData(0);

  // Seed: coloured noise (LP filtered twice = round pluck)
  for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
  for (let i = 2; i < N; i++) d[i] = d[i] * 0.5 + d[i-1] * 0.35 + d[i-2] * 0.15;

  // KS with slightly stretched string coefficient
  const decay = 0.4996 + Math.min(freq, 400) / 400 * 0.0002;
  for (let s = N; s < len; s++) {
    const prev1 = d[s - N];
    const prev2 = s - N - 1 >= 0 ? d[s - N - 1] : 0;
    d[s] = decay * (prev1 + prev2);
    // Hard clip to prevent blow-ups
    if (d[s] >  1) d[s] =  1;
    if (d[s] < -1) d[s] = -1;
  }

  const src   = ctx.createBufferSource();
  const warm  = ctx.createBiquadFilter(); // guitar body warmth
  const pres  = ctx.createBiquadFilter(); // string presence
  const air   = ctx.createBiquadFilter(); // top-end roll-off (hollow body)
  const env   = ctx.createGain();

  src.buffer = buf;

  warm.type        = 'peaking';
  warm.frequency.value = 200;
  warm.gain.value      = 6;
  warm.Q.value         = 0.9;

  pres.type        = 'peaking';
  pres.frequency.value = 1800;
  pres.gain.value      = 3;
  pres.Q.value         = 1.3;

  air.type = 'lowpass';
  air.frequency.value = 5500; // acoustic top dampens extreme highs

  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(0.28, t + 0.003);
  env.gain.exponentialRampToValueAtTime(0.12, t + 0.12);
  env.gain.exponentialRampToValueAtTime(0.00005, t + dur);

  src.connect(warm); warm.connect(pres); pres.connect(air);
  air.connect(env); env.connect(dest);
  src.start(t); src.stop(t + dur + 0.1);
}

/* — Dispatcher — */
const INSTRUMENT_PARAMS = {
  piano:   { strumMs: 28, dur: (m) => m ? 4.5 : 3.5, vol: 0.52, revMix: 0.14, revDecay: 2.0 },
  ukulele: { strumMs: 16, dur: (m) => m ? 1.8 : 1.3, vol: 0.62, revMix: 0.10, revDecay: 0.8 },
  violao:  { strumMs: 40, dur: (m) => m ? 3.5 : 2.8, vol: 0.58, revMix: 0.12, revDecay: 1.4 },
};

function playChord(instId, freqs, magOn) {
  const ctx  = getCtx();
  const P    = INSTRUMENT_PARAMS[instId];
  const now  = ctx.currentTime;

  const master = ctx.createGain(); master.gain.value = P.vol;
  master.connect(ctx.destination);

  const rev    = makeReverb(ctx, P.revDecay);
  const revGain = ctx.createGain(); revGain.gain.value = P.revMix;
  rev.connect(revGain); revGain.connect(ctx.destination);

  const dur      = P.dur(magOn);
  const strumSec = P.strumMs / 1000;
  const playFn   = instId === 'piano' ? playPianoNote
                  : instId === 'ukulele' ? playUkeNote
                  : playGuitarNote;

  // Dry + reverb send
  const dryGain = ctx.createGain(); dryGain.gain.value = 1;
  dryGain.connect(master);
  const wetNode = ctx.createGain(); wetNode.gain.value = 1;
  wetNode.connect(rev);

  freqs.forEach((freq, i) => {
    const t = now + i * strumSec;
    playFn(ctx, freq, t, dur, dryGain);
    playFn(ctx, freq, t, dur, wetNode);
  });
}

/* ═══════════════════════════════════════════════════
   MAGNIFY
═══════════════════════════════════════════════════ */
function magnify(intervals, typeId) {
  const base = new Set(intervals); const add = [];
  if (!base.has(2) && !base.has(1))                             add.push(2);
  if (['major','maj7','dom7','add9','6'].includes(typeId) && !base.has(9))  add.push(9);
  if (['minor','min7','min9','m6'].includes(typeId)       && !base.has(5))  add.push(5);
  if (['dim','halfdim'].includes(typeId)                  && !base.has(11)) add.push(11);
  if (typeId === 'dom7'                                   && !base.has(1))  add.push(1);
  if (['sus','sus2'].includes(typeId)                     && !base.has(11)) add.push(11);
  return add;
}

/* ═══════════════════════════════════════════════════
   VOICE
═══════════════════════════════════════════════════ */
function parseVoice(text, setRoot, setTypeId) {
  const map = [
    ['dó#','C#'],['do#','C#'],['ré#','D#'],['re#','D#'],['fá#','F#'],['fa#','F#'],
    ['sol#','G#'],['lá#','A#'],['la#','A#'],
    ['dó','C'],['do','C'],['ré','D'],['re','D'],['mi','E'],
    ['fá','F'],['fa','F'],['sol','G'],['lá','A'],['la','A'],['si','B'],
  ];
  for (const [k,v] of map) { if (text.includes(k)) { setRoot(v); break; } }
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

/* ═══════════════════════════════════════════════════
   THEMES
═══════════════════════════════════════════════════ */
const THEMES = {
  light: {
    id:'light', body:'#E8E8E4', chassis:'linear-gradient(160deg,#EDEAE2 0%,#E4E0D8 60%,#DDD9D0 100%)',
    display:'#1A1916', dispText:'#FFAA00', border:'#C8C4BC', borderSt:'#BDB9B0',
    text:'#1A1916', textMute:'#888880', textDim:'#C0BCB4',
    btnBg:'linear-gradient(160deg,#F0EDE6,#DDD9D0)', btnBgAct:'linear-gradient(160deg,#CC4400,#991100)',
    btnBdr:'#C4C0B8', btnShadow:'inset 0 1px 0 rgba(255,255,255,0.7),inset 0 -2px 0 rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.1)',
    orange:'#CC4400', amber:'#FFAA00', pianoBox:'#C8C4BC', scanlines:false,
    diagBg:'#C8C4BC', shadow:'0 0 0 1px #C0BCB4,0 8px 40px rgba(0,0,0,0.12)',
    screwBg:'radial-gradient(circle at 35% 35%,#C8C4BC,#A8A49C)',
  },
  dark: {
    id:'dark', body:'#141412', chassis:'linear-gradient(160deg,#272724 0%,#1E1D1B 60%,#1A1918 100%)',
    display:'#080806', dispText:'#FFAA00', border:'#343430', borderSt:'#2A2A26',
    text:'#8C8C80', textMute:'#5C5C52', textDim:'#3A3A34',
    btnBg:'linear-gradient(160deg,#2C2C28,#222220)', btnBgAct:'linear-gradient(160deg,#CC4400,#991100)',
    btnBdr:'#343430', btnShadow:'inset 0 2px 3px rgba(0,0,0,0.4)',
    orange:'#CC4400', amber:'#FFAA00', pianoBox:'#121210', scanlines:true,
    diagBg:'#121210', shadow:'0 0 0 1px #0A0908,0 10px 60px rgba(0,0,0,0.85)',
    screwBg:'radial-gradient(circle at 35% 35%,#4A4A44,#222220)',
  },
  hc: {
    id:'hc', body:'#FFFFFF', chassis:'#FFFFFF',
    display:'#000000', dispText:'#FFAA00', border:'#000000', borderSt:'#000000',
    text:'#000000', textMute:'#444444', textDim:'#888888',
    btnBg:'#FFFFFF', btnBgAct:'#CC4400',
    btnBdr:'#000000', btnShadow:'none',
    orange:'#CC4400', amber:'#FFAA00', pianoBox:'#FFFFFF', scanlines:false,
    diagBg:'#FFFFFF', shadow:'0 0 0 2px #000000',
    screwBg:'radial-gradient(circle at 35% 35%,#888888,#333333)',
  },
};

/* ═══════════════════════════════════════════════════
   COMPONENTS
═══════════════════════════════════════════════════ */

function Screw({ T }) {
  return (
    <div style={{ width:'11px', height:'11px', borderRadius:'50%', background:T.screwBg,
      boxShadow: T.id==='light' ? 'inset 0 1px 0 rgba(255,255,255,0.5),0 1px 2px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.7)', position:'relative' }}>
      <div style={{ width:'60%', height:'1.5px', background:'rgba(0,0,0,0.3)', position:'absolute', top:'49%', left:'20%', transform:'rotate(42deg)' }}/>
    </div>
  );
}

function PianoKeyboard({ activeNotes, extraNotes, T }) {
  return (
    <div style={{ position:'relative', width:'100%', height:'144px', userSelect:'none' }}>
      <div style={{ display:'flex', height:'100%', gap:'2px' }}>
        {WHITE_KEYS.map((note, i) => {
          const isActive = activeNotes.has(note);
          const isExtra  = extraNotes.has(note) && !isActive;
          return (
            <div key={i} style={{
              flex:1, borderRadius:'0 0 6px 6px', position:'relative',
              background: isActive ? 'linear-gradient(180deg,#E8660A,#CC4400)'
                        : isExtra  ? 'linear-gradient(180deg,#E8C060,#C89040)'
                        : T.id==='dark' ? 'linear-gradient(180deg,#E8E4D8,#CECABC)'
                        : T.id==='hc'   ? '#FFFFFF'
                        : 'linear-gradient(180deg,#F2EFE6,#DDD9CE)',
              border: T.id==='hc' ? '1px solid #000' : 'none',
              boxShadow: isActive ? 'inset 0 -3px 0 rgba(0,0,0,0.35),0 2px 10px rgba(204,68,0,0.5)'
                       : isExtra  ? 'inset 0 -3px 0 rgba(0,0,0,0.2)'
                       : T.id==='hc' ? 'none'
                       : 'inset 0 -4px 0 rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.55)',
              transition:'background 0.08s',
            }}>
              {(isActive || isExtra) && <div style={{ position:'absolute', bottom:'9px', left:'50%', transform:'translateX(-50%)', width:'5px', height:'5px', borderRadius:'50%', background: isExtra ? 'rgba(140,80,0,0.7)' : 'rgba(255,255,255,0.55)' }}/>}
            </div>
          );
        })}
      </div>
      {BLACK_KEYS.map(([pitch, left], i) => {
        const isActive = activeNotes.has(pitch);
        const isExtra  = extraNotes.has(pitch) && !isActive;
        return (
          <div key={i} style={{
            position:'absolute', top:0, left:`calc(${left}% + 1px)`, width:'calc(4.28% - 1px)', height:'58%',
            borderRadius:'0 0 4px 4px', zIndex:2,
            background: isActive ? 'linear-gradient(180deg,#FF6622,#CC3300)'
                       : isExtra  ? 'linear-gradient(180deg,#8B6222,#5A3E0A)'
                       : T.id==='hc' ? '#000' : 'linear-gradient(180deg,#3A3835,#1A1816)',
            boxShadow: isActive ? '0 4px 16px rgba(204,68,0,0.55)'
                      : 'inset 0 -2px 0 rgba(0,0,0,0.6),0 4px 8px rgba(0,0,0,0.4)',
            transition:'background 0.08s',
          }}/>
        );
      })}
    </div>
  );
}

/* — Chord Diagram (guitar & uke) — */
function ChordDiagram({ frets, stringNames, T }) {
  const n         = frets.length;
  const frettedNZ = frets.filter(f => f > 0);
  const minFret   = frettedNZ.length > 0 ? Math.min(...frettedNZ) : 0;
  const showNut   = minFret <= 1;
  const startFret = showNut ? 0 : minFret - 1;
  const NUM_FRETS = 4;

  // Barre detection: ≥ 2 consecutive strings at same fret
  const barreAt = (!showNut && frettedNZ.length >= 2 && frettedNZ.filter(f => f === minFret).length >= 2)
    ? minFret : null;
  const barreIdxs = barreAt !== null
    ? frets.map((f, i) => f === barreAt ? i : -1).filter(i => i >= 0) : [];

  // SVG layout
  const W = 280, H = 180;
  const TM = 36, BM = 22, LM = 26, RM = 14;
  const sw = (W - LM - RM) / (n - 1); // string spacing
  const fh = (H - TM - BM) / NUM_FRETS; // fret height
  const sx = i  => LM + i * sw;
  const fy = f  => TM + f * fh; // f=0 is nut line

  const dotCy = (fret) => fy(fret - startFret) - fh / 2;

  const txtColor  = T.id === 'hc' ? '#000' : T.id === 'dark' ? '#6C6C60' : '#888880';
  const lineColor = T.id === 'hc' ? '#000' : T.id === 'dark' ? '#444440' : '#9C9890';
  const nutColor  = T.id === 'hc' ? '#000' : T.text;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'160px' }}>
      {/* String lines */}
      {frets.map((_, i) => (
        <line key={`s${i}`} x1={sx(i)} y1={fy(0)} x2={sx(i)} y2={fy(NUM_FRETS)} stroke={lineColor} strokeWidth="1.5"/>
      ))}

      {/* Fret lines */}
      {Array.from({ length: NUM_FRETS + 1 }, (_, f) => (
        <line key={`f${f}`} x1={sx(0)} y1={fy(f)} x2={sx(n - 1)} y2={fy(f)}
          stroke={f === 0 && showNut ? nutColor : lineColor}
          strokeWidth={f === 0 && showNut ? 4 : 1.5}
        />
      ))}

      {/* Position label if not open */}
      {!showNut && (
        <text x={sx(0) - 8} y={fy(1) + fh * 0.38 + 4}
          textAnchor="end" fontSize="11" fill={txtColor} fontFamily="IBM Plex Mono, monospace">
          {startFret + 1}fr
        </text>
      )}

      {/* Barre bar */}
      {barreAt !== null && barreIdxs.length >= 2 && (
        <rect
          x={sx(barreIdxs[0]) - 9} y={dotCy(barreAt) - 9}
          width={sx(barreIdxs[barreIdxs.length - 1]) - sx(barreIdxs[0]) + 18}
          height={18} rx="9"
          fill={T.orange} opacity="0.88"
        />
      )}

      {/* Finger dots */}
      {frets.map((fret, i) => {
        if (fret <= 0) return null;
        if (barreAt !== null && fret === barreAt) return null; // covered by barre bar
        const row = fret - startFret;
        if (row < 1 || row > NUM_FRETS) return null;
        return (
          <circle key={`d${i}`} cx={sx(i)} cy={dotCy(fret)} r="9.5" fill={T.orange}/>
        );
      })}

      {/* Mute / Open indicators above nut */}
      {frets.map((fret, i) => (
        <text key={`io${i}`} x={sx(i)} y={fy(0) - 10}
          textAnchor="middle" fontSize="13" fontWeight="bold"
          fill={fret === -1 ? '#CC3333' : fret === 0 ? (T.id==='dark'?'#8C8C80':'#666660') : 'none'}
          fontFamily="IBM Plex Mono, monospace">
          {fret === -1 ? '✕' : fret === 0 ? '○' : ''}
        </text>
      ))}

      {/* String name labels */}
      {stringNames.map((name, i) => (
        <text key={`ln${i}`} x={sx(i)} y={fy(NUM_FRETS) + 16}
          textAnchor="middle" fontSize="10" fill={txtColor}
          fontFamily="IBM Plex Mono, monospace">
          {name}
        </text>
      ))}
    </svg>
  );
}

function ThemeToggle({ current, onChange, T }) {
  return (
    <div style={{ display:'flex', gap:'3px' }}>
      {[['light','○'],['dark','●'],['hc','◉']].map(([id, sym]) => (
        <button key={id} onClick={() => onChange(id)} style={{
          width:'28px', height:'24px', borderRadius:'3px', cursor:'pointer',
          background: current===id ? T.orange : 'transparent',
          border:`1px solid ${current===id ? T.orange : T.border}`,
          color: current===id ? '#fff' : T.textMute,
          fontSize:'11px', transition:'all 0.12s', fontFamily:"'IBM Plex Mono',monospace",
        }}>{sym}</button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════ */
export default function App() {
  const [root,      setRoot]      = useState('C');
  const [typeId,    setTypeId]    = useState('major');
  const [instId,    setInstId]    = useState('piano');
  const [magOn,     setMagOn]     = useState(false);
  const [playing,   setPlaying]   = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMsg,  setVoiceMsg]  = useState('');
  const [search,    setSearch]    = useState('');
  const [themeId,   setThemeId]   = useState('light');
  const recRef = useRef(null);

  const T        = THEMES[themeId];
  const mono     = "'IBM Plex Mono', monospace";
  const rootIdx  = ROOTS.indexOf(root);
  const chord    = CHORD_TYPES.find(c => c.id === typeId);
  const intervals = chord?.intervals || [];

  const activeNotes = useMemo(() =>
    new Set(intervals.map(i => (rootIdx + i) % 12)), [rootIdx, intervals]);
  const extraIntervals = useMemo(() =>
    magOn ? magnify(intervals, typeId) : [], [magOn, intervals, typeId]);
  const extraNotes = useMemo(() =>
    new Set(extraIntervals.map(i => (rootIdx + i) % 12)), [rootIdx, extraIntervals]);

  const chordName = root + (chord?.display || '');
  const noteListFull = [...activeNotes].sort((a,b)=>a-b).map(n=>NOTE_NAMES_PT[n]).join(' — ');
  const extraNames   = extraIntervals.map(i=>NOTE_NAMES_PT[(rootIdx+i)%12]).join(' · ');

  // Fretboard fingering (only for guitar/uke)
  const guitarFrets = useMemo(() =>
    findFingering(rootIdx, intervals, GUITAR_PC), [rootIdx, intervals]);
  const ukeFrets = useMemo(() =>
    findFingering(rootIdx, intervals, UKE_PC), [rootIdx, intervals]);

  // Frequencies for playback
  const playFreqs = useMemo(() => {
    const allIntervals = [...intervals, ...extraIntervals].sort((a,b)=>a-b);
    if (instId === 'piano') {
      // Piano: spread across 2 octaves, root=C3 base
      const C3 = 130.813;
      return allIntervals.map((iv, i) => {
        const pc  = (rootIdx + iv) % 12;
        const oct = i < 3 ? 1 : 2;
        return C3 * Math.pow(2, (pc + oct * 12) / 12);
      });
    }
    const frets = instId === 'ukulele' ? ukeFrets : guitarFrets;
    const openFreqs = instId === 'ukulele' ? UKE_FREQ : GUITAR_FREQ;
    return frets
      .map((f, i) => f >= 0 ? openFreqs[i] * Math.pow(2, f / 12) : null)
      .filter(Boolean);
  }, [instId, rootIdx, intervals, extraIntervals, guitarFrets, ukeFrets]);

  const filteredTypes = useMemo(() => {
    if (!search.trim()) return CHORD_TYPES;
    const s = search.toLowerCase();
    return CHORD_TYPES.filter(c =>
      c.name.toLowerCase().includes(s) || c.display.toLowerCase().includes(s) || c.btn.toLowerCase().includes(s));
  }, [search]);

  const handlePlay = () => {
    setPlaying(true);
    playChord(instId, playFreqs, magOn);
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

  /* — Style helpers — */
  const btn = (active, extraStyle = {}) => ({
    background: active ? T.btnBgAct : T.btnBg,
    color: active ? '#fff' : T.id === 'hc' ? '#000' : T.id === 'dark' ? '#8C8C80' : T.text,
    border: `1px solid ${active ? T.orange : T.btnBdr}`,
    borderRadius: '4px', cursor: 'pointer', transition: 'all 0.1s',
    fontFamily: mono,
    boxShadow: active
      ? `0 0 8px rgba(204,68,0,0.3),inset 0 1px 0 rgba(255,140,80,0.2)`
      : T.btnShadow,
    ...extraStyle,
  });

  const label = { fontSize:'7px', letterSpacing:'0.22em', textTransform:'uppercase', color:T.textMute, fontFamily:mono, marginBottom:'8px' };

  return (
    <div style={{ minHeight:'100vh', background:T.body, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', fontFamily:mono, transition:'background 0.2s' }}>
      <div style={{
        width:'100%', maxWidth:'680px',
        background: T.chassis,
        borderRadius: T.id==='hc' ? '0' : '12px',
        border: T.id==='hc' ? '2px solid #000' : 'none',
        boxShadow: T.shadow,
        padding:'24px', position:'relative', overflow:'hidden',
        transition:'background 0.2s',
      }}>

        {/* Accent stripe */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height: T.id==='hc'?'4px':'3px',
          background:`linear-gradient(90deg,${T.orange} 0%,#FF6622 40%,${T.orange} 100%)`,
          borderRadius: T.id==='hc'?'0':'12px 12px 0 0' }}/>

        {/* Screws */}
        {T.id !== 'hc' && [{top:'14px',left:'14px'},{top:'14px',right:'14px'},{bottom:'14px',left:'14px'},{bottom:'14px',right:'14px'}].map((pos,i)=>(
          <div key={i} style={{ position:'absolute', ...pos }}><Screw T={T}/></div>
        ))}

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', paddingBottom:'16px', borderBottom:`1px solid ${T.borderSt}` }}>
          <div>
            <div style={{ fontSize:'10px', letterSpacing:'0.25em', textTransform:'uppercase', color:T.text, fontWeight:'500', marginBottom:'2px' }}>AKORD</div>
            <div style={{ fontSize:'8px', letterSpacing:'0.14em', color:T.textMute, textTransform:'uppercase' }}>Chord Visualizer · v4</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: playing ? T.amber : T.textDim, boxShadow: playing ? `0 0 7px ${T.amber}` : 'none', transition:'all 0.1s' }}/>
              <div style={{ fontSize:'8px', letterSpacing:'0.15em', color:T.textMute, textTransform:'uppercase' }}>SIG</div>
            </div>
            <ThemeToggle current={themeId} onChange={setThemeId} T={T}/>
          </div>
        </div>

        {/* ── Instrument selector ── */}
        <div style={{ marginBottom:'18px' }}>
          <div style={label}>INSTRUMENTO</div>
          <div style={{ display:'flex', gap:'6px' }}>
            {[{id:'piano',lbl:'PIANO'},{id:'ukulele',lbl:'UKULELE'},{id:'violao',lbl:'VIOLÃO'}].map(({ id, lbl }) => {
              const active = instId === id;
              return (
                <button key={id} onClick={() => setInstId(id)} style={{
                  ...btn(active),
                  flex:1, padding:'10px 8px',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:'6px',
                }}>
                  <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: active ? T.amber : T.textDim, boxShadow: active ? `0 0 7px ${T.amber}` : 'none', transition:'all 0.12s' }}/>
                  <div style={{ fontSize:'8px', letterSpacing:'0.18em', color: active ? (T.id==='hc'?'#fff':T.amber) : T.textMute, textTransform:'uppercase', transition:'color 0.12s' }}>{lbl}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Display + Play/Magnificat ── */}
        <div style={{ display:'flex', gap:'14px', marginBottom:'18px', alignItems:'stretch' }}>
          <div style={{
            flex:1, background:T.display,
            border:`1px solid ${T.id==='hc'?'#000':T.id==='light'?'#B0AB9E':'#0A0A08'}`,
            borderRadius:'6px', padding:'14px 18px 12px',
            boxShadow: T.id==='dark' ? 'inset 0 2px 14px rgba(0,0,0,0.85)' : T.id==='light' ? 'inset 0 2px 8px rgba(0,0,0,0.35)' : 'none',
            position:'relative', overflow:'hidden',
          }}>
            {T.scanlines && <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)', pointerEvents:'none', zIndex:1 }}/>}
            <div style={{ position:'relative', zIndex:2 }}>
              <div style={{ fontFamily:"'VT323','Courier New',monospace", fontSize:'clamp(50px,10vw,86px)', color:T.dispText, textShadow:`0 0 12px rgba(255,170,0,0.7),0 0 28px rgba(255,140,0,0.3)`, lineHeight:1 }}>{chordName}</div>
              <div style={{ marginTop:'8px', display:'flex', gap:'10px', flexWrap:'wrap' }}>
                <div style={{ fontSize:'10px', color:'rgba(255,170,0,0.65)', letterSpacing:'0.06em', fontFamily:mono }}>{chord?.name?.toUpperCase()}</div>
                <div style={{ fontSize:'9px',  color:'rgba(255,170,0,0.35)', letterSpacing:'0.03em', fontFamily:mono }}>{noteListFull}</div>
              </div>
              {magOn && extraNames && (
                <div style={{ marginTop:'3px', fontSize:'9px', color:'rgba(255,180,60,0.45)', fontStyle:'italic', fontFamily:mono }}>✦ {extraNames}</div>
              )}
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'8px', minWidth:'76px' }}>
            {/* PLAY */}
            <button onClick={handlePlay} style={{
              flex:1, borderRadius:'7px', cursor:'pointer',
              background: playing ? `radial-gradient(circle,#FF6622,${T.orange})` : T.btnBg,
              border:`1px solid ${playing ? T.orange : T.btnBdr}`,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'5px',
              boxShadow: playing ? `0 0 18px rgba(204,68,0,0.55)` : T.btnShadow,
              transform: playing ? 'scale(0.97)' : 'scale(1)', transition:'all 0.08s',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <polygon points="6,3 18,10 6,17" fill={playing ? '#fff' : T.id==='hc'?'#000':T.textMute} style={{ transition:'fill 0.08s' }}/>
              </svg>
              <div style={{ fontSize:'7px', letterSpacing:'0.18em', textTransform:'uppercase', color: playing ? '#fff' : T.textMute, fontFamily:mono }}>PLAY</div>
            </button>

            {/* MAGNIFICAT */}
            <button onClick={() => setMagOn(m => !m)} style={{
              flex:1, borderRadius:'7px', cursor:'pointer',
              background: magOn ? (T.id==='hc'?'#CC4400':'linear-gradient(160deg,#3A2200,#281600)') : T.btnBg,
              border:`1px solid ${magOn ? (T.id==='hc'?'#CC4400':'#AA7722') : T.btnBdr}`,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'4px',
              boxShadow: magOn ? `0 0 12px rgba(170,119,34,0.4)` : T.btnShadow,
              transition:'all 0.14s',
            }}>
              <div style={{ fontSize:'17px', lineHeight:1, fontFamily:'serif', color: magOn ? (T.id==='hc'?'#fff':'#FFCC55') : T.id==='hc'?'#000':T.textMute, textShadow: magOn&&T.id!=='hc' ? '0 0 8px rgba(255,200,80,0.7)' : 'none', transition:'all 0.14s' }}>✦</div>
              <div style={{ fontSize:'6px', letterSpacing:'0.14em', textTransform:'uppercase', color: magOn ? (T.id==='hc'?'#fff':'rgba(255,200,80,0.9)') : T.textMute, textAlign:'center', lineHeight:'1.4', fontFamily:mono }}>MAGNI<br/>FICAT</div>
            </button>
          </div>
        </div>

        {/* ── Instrument visualization ── */}
        <div style={{
          background: T.diagBg, border:`1px solid ${T.id==='hc'?'#000':T.id==='light'?'#B4B0A8':'#0A0A08'}`,
          borderRadius:'6px', padding:'12px 12px 14px', marginBottom:'18px',
          boxShadow: T.id==='dark' ? 'inset 0 3px 12px rgba(0,0,0,0.7)' : T.id==='light' ? 'inset 0 2px 6px rgba(0,0,0,0.15)' : 'none',
        }}>
          <div style={{ ...label, marginBottom:'10px', display:'flex', justifyContent:'space-between' }}>
            <span>{instId==='piano' ? 'TECLADO · 2 OITAVAS' : instId==='violao' ? 'DIAGRAMA · VIOLÃO' : 'DIAGRAMA · UKULELE'}</span>
            {magOn && <span style={{ color: T.id==='hc' ? T.orange : 'rgba(255,180,60,0.55)' }}>✦ EXT.</span>}
          </div>

          {instId === 'piano' && (
            <PianoKeyboard activeNotes={activeNotes} extraNotes={extraNotes} T={T}/>
          )}
          {instId === 'violao' && (
            <ChordDiagram frets={guitarFrets} stringNames={GUITAR_NAMES} T={T}/>
          )}
          {instId === 'ukulele' && (
            <div style={{ maxWidth:'280px', margin:'0 auto' }}>
              <ChordDiagram frets={ukeFrets} stringNames={UKE_NAMES} T={T}/>
            </div>
          )}
        </div>

        {/* ── Root ── */}
        <div style={{ marginBottom:'16px' }}>
          <div style={label}>NOTA RAIZ</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
            {ROOTS.map(r => (
              <button key={r} onClick={() => setRoot(r)} style={{ ...btn(root===r), width:'46px', height:'34px', fontSize:'12px', fontWeight: root===r?'500':'400' }}>{r}</button>
            ))}
          </div>
        </div>

        {/* ── Chord type ── */}
        <div style={{ marginBottom:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
            <div style={label}>TIPO DE ACORDE</div>
            <input placeholder="buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{
              background:'transparent', border:'none', borderBottom:`1px solid ${T.border}`,
              outline:'none', padding:'2px 4px', fontSize:'10px', color:T.text,
              fontFamily:mono, letterSpacing:'0.05em', width:'90px',
            }}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(62px,1fr))', gap:'4px' }}>
            {filteredTypes.map(ct => (
              <button key={ct.id} onClick={() => setTypeId(ct.id)} style={{
                ...btn(typeId===ct.id),
                padding:'8px 4px 6px',
                display:'flex', flexDirection:'column', alignItems:'center', gap:'3px',
              }}>
                <span style={{ fontSize:'14px', fontFamily:mono, fontWeight:'500', lineHeight:1, color: typeId===ct.id ? '#fff' : T.id==='hc'?'#000':T.amber }}>{ct.btn}</span>
                <span style={{ fontSize:'7px', color: typeId===ct.id ? 'rgba(255,255,255,0.55)' : T.textMute, textAlign:'center', lineHeight:'1.2' }}>{ct.name}</span>
              </button>
            ))}
            {filteredTypes.length === 0 && <div style={{ gridColumn:'1/-1', padding:'16px', textAlign:'center', color:T.textMute, fontSize:'10px' }}>Nenhum acorde encontrado.</div>}
          </div>
        </div>

        {/* ── Voice ── */}
        <div style={{ paddingTop:'16px', borderTop:`1px solid ${T.borderSt}` }}>
          <div style={label}>VOZ</div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
            <button onClick={listening ? stopListening : startListening} style={{ ...btn(listening), padding:'8px 16px', fontSize:'9px', letterSpacing:'0.15em', textTransform:'uppercase', display:'flex', alignItems:'center', gap:'7px' }}>
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', display:'inline-block', background: listening ? 'rgba(255,255,255,0.9)' : T.textMute, animation: listening ? 'pulse 1s infinite' : 'none' }}/>
              {listening ? 'PARAR' : 'FALAR ACORDE'}
            </button>
            {voiceMsg
              ? <span style={{ fontSize:'9px', color:T.textMute, fontStyle:'italic' }}>{voiceMsg}</span>
              : <span style={{ fontSize:'8px', color:T.textDim }}>Ex: "Dó menor sete" · "Sol maior"</span>
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
