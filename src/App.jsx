import { useState, useMemo, useEffect, useRef } from "react";

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

const WHITE_NOTES = [0,2,4,5,7,9,11, 0,2,4,5,7,9,11];
const BLACK_KEYS_DATA = [
  [1,5.00],[3,12.14],[6,26.43],[8,33.57],[10,40.71],
  [1,54.99],[3,62.14],[6,76.43],[8,83.57],[10,90.71],
];
const NOTE_NAMES_PT = {
  0:'Dó',1:'Dó#',2:'Ré',3:'Ré#',4:'Mi',
  5:'Fá',6:'Fá#',7:'Sol',8:'Sol#',9:'Lá',10:'Lá#',11:'Si'
};

function Piano({ activeNotes }) {
  return (
    <div style={{ position:'relative', width:'100%', height:'140px' }}>
      <div style={{ display:'flex', height:'100%' }}>
        {WHITE_NOTES.map((note, i) => (
          <div key={i} style={{
            flex:1,
            background: activeNotes.has(note) ? '#CC4400' : '#F6F4F0',
            borderRight:'1px solid #C4C4BF',
            borderBottom:'4px solid #B8B8B3',
            borderRadius:'0 0 6px 6px',
            transition:'background 0.1s ease',
            position:'relative',
          }}>
            {activeNotes.has(note) && (
              <div style={{
                position:'absolute', bottom:'8px', left:'50%',
                transform:'translateX(-50%)',
                width:'6px', height:'6px', borderRadius:'50%',
                background:'rgba(255,255,255,0.55)',
              }}/>
            )}
          </div>
        ))}
      </div>
      {BLACK_KEYS_DATA.map(([pitch, left], i) => (
        <div key={i} style={{
          position:'absolute', top:0,
          left:`${left}%`, width:'4.28%', height:'60%',
          background: activeNotes.has(pitch) ? '#CC4400' : '#141414',
          borderRadius:'0 0 4px 4px', zIndex:2,
          transition:'background 0.1s ease',
          boxShadow: activeNotes.has(pitch)
            ? '0 4px 14px rgba(204,68,0,0.4)'
            : '0 4px 8px rgba(0,0,0,0.45)',
        }}/>
      ))}
    </div>
  );
}

function parseVoice(text, setRoot, setTypeId) {
  const noteMap = [
    ['dó#','C#'],['do#','C#'],['ré#','D#'],['re#','D#'],
    ['fá#','F#'],['fa#','F#'],['sol#','G#'],['lá#','A#'],['la#','A#'],
    ['dó','C'],['do','C'],['ré','D'],['re','D'],['mi','E'],
    ['fá','F'],['fa','F'],['sol','G'],['lá','A'],['la','A'],['si','B'],
  ];
  for (const [k, v] of noteMap) {
    if (text.includes(k)) { setRoot(v); break; }
  }
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

export default function App() {
  const [root, setRoot]       = useState('C');
  const [typeId, setTypeId]   = useState('major');
  const [listening, setListening] = useState(false);
  const [voiceMsg, setVoiceMsg]   = useState('');
  const [search, setSearch]       = useState('');
  const recRef = useRef(null);

  const rootIdx    = ROOTS.indexOf(root);
  const chord      = CHORD_TYPES.find(c => c.id === typeId);
  const activeNotes = useMemo(() =>
    new Set((chord?.intervals || []).map(i => (rootIdx + i) % 12)),
    [rootIdx, chord]
  );
  const chordName    = root + (chord?.display || '');
  const noteListFull = [...activeNotes].sort((a,b)=>a-b).map(n => NOTE_NAMES_PT[n]).join(' — ');
  const noteList     = [...activeNotes].sort((a,b)=>a-b).map(n => ROOTS[n]).join(' · ');

  const filteredTypes = useMemo(() => {
    if (!search.trim()) return CHORD_TYPES;
    const s = search.toLowerCase();
    return CHORD_TYPES.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.display.toLowerCase().includes(s) ||
      c.btn.toLowerCase().includes(s)
    );
  }, [search]);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceMsg('Reconhecimento de voz não suportado neste navegador.'); return; }
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    rec.onstart  = () => { setListening(true); setVoiceMsg(''); };
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setVoiceMsg(`"${t}"`);
      parseVoice(t.toLowerCase(), setRoot, setTypeId);
    };
    rec.onerror  = () => { setListening(false); setVoiceMsg('Erro no microfone.'); };
    rec.onend    = () => setListening(false);
    rec.start();
    recRef.current = rec;
  };
  const stopListening = () => { recRef.current?.stop(); setListening(false); };

  const mono   = "'IBM Plex Mono', monospace";
  const sans   = "'IBM Plex Sans', Helvetica, sans-serif";
  const BG     = '#E8E8E5';
  const CARD   = '#F0EFEC';
  const BORDER = '#CCCCC8';
  const TEXT   = '#141414';
  const MUTED  = '#88887F';
  const ORANGE = '#CC4400';

  return (
    <div style={{ minHeight:'100vh', background:BG, fontFamily:sans, color:TEXT }}>

      {/* ── Header ── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'18px 32px', borderBottom:`1px solid ${BORDER}`,
      }}>
        <span style={{ fontFamily:mono, fontSize:'11px', letterSpacing:'0.18em', textTransform:'uppercase', fontWeight:'500' }}>
          Akord
        </span>
        <span style={{ fontFamily:mono, fontSize:'10px', letterSpacing:'0.12em', color:MUTED, textTransform:'uppercase' }}>
          {CHORD_TYPES.length} tipos · visualizador
        </span>
      </div>

      <div style={{ maxWidth:'660px', margin:'0 auto', padding:'32px 24px 80px' }}>

        {/* ── Big chord name ── */}
        <div style={{ paddingBottom:'28px', marginBottom:'28px', borderBottom:`1px solid ${BORDER}` }}>
          <div style={{
            fontFamily:mono,
            fontSize:'clamp(64px, 13vw, 100px)',
            fontWeight:'300',
            letterSpacing:'-0.03em',
            lineHeight:'0.88',
            color:TEXT,
          }}>
            {chordName}
          </div>
          <div style={{ marginTop:'14px', display:'flex', gap:'14px', flexWrap:'wrap', alignItems:'baseline' }}>
            <span style={{ fontFamily:mono, fontSize:'12px', color:ORANGE, fontWeight:'500', letterSpacing:'0.05em' }}>
              {chord?.name}
            </span>
            <span style={{ fontFamily:mono, fontSize:'11px', color:MUTED, letterSpacing:'0.03em' }}>
              {noteListFull}
            </span>
          </div>
          <div style={{ marginTop:'5px', fontFamily:mono, fontSize:'10px', color:MUTED, letterSpacing:'0.14em', textTransform:'uppercase' }}>
            {noteList}
          </div>
        </div>

        {/* ── Piano ── */}
        <div style={{ marginBottom:'32px' }}>
          <div style={{ fontFamily:mono, fontSize:'9px', letterSpacing:'0.22em', textTransform:'uppercase', color:MUTED, marginBottom:'10px' }}>
            Teclado — 2 oitavas
          </div>
          <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:'4px', padding:'14px 14px 20px' }}>
            <Piano activeNotes={activeNotes} />
          </div>
        </div>

        {/* ── Root selector ── */}
        <div style={{ marginBottom:'28px' }}>
          <div style={{ fontFamily:mono, fontSize:'9px', letterSpacing:'0.22em', textTransform:'uppercase', color:MUTED, marginBottom:'10px' }}>
            Nota raiz
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
            {ROOTS.map(r => (
              <button key={r} onClick={() => setRoot(r)} style={{
                width:'48px', height:'40px',
                fontFamily:mono, fontSize:'13px',
                background: root === r ? TEXT : 'transparent',
                color:       root === r ? '#F0EFEC' : TEXT,
                border:      `1px solid ${root === r ? TEXT : BORDER}`,
                borderRadius:'2px',
                fontWeight:  root === r ? '500' : '400',
                cursor:'pointer',
                transition:'all 0.1s',
              }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chord type ── */}
        <div style={{ marginBottom:'28px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
            <div style={{ fontFamily:mono, fontSize:'9px', letterSpacing:'0.22em', textTransform:'uppercase', color:MUTED }}>
              Tipo de acorde
            </div>
            <input
              placeholder="buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background:'transparent', border:'none',
                borderBottom:`1px solid ${BORDER}`,
                outline:'none', padding:'2px 0',
                fontSize:'11px', color:TEXT,
                fontFamily:mono, letterSpacing:'0.05em', width:'100px',
              }}
            />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(68px, 1fr))', gap:'5px' }}>
            {filteredTypes.map(ct => (
              <button key={ct.id} onClick={() => setTypeId(ct.id)} style={{
                padding:'10px 6px 8px', borderRadius:'2px',
                background: typeId === ct.id ? TEXT : 'transparent',
                color:       typeId === ct.id ? '#F0EFEC' : TEXT,
                border:      `1px solid ${typeId === ct.id ? TEXT : BORDER}`,
                cursor:'pointer', transition:'all 0.1s',
                display:'flex', flexDirection:'column', alignItems:'center', gap:'3px',
              }}>
                <span style={{
                  fontSize:'15px', fontFamily:mono, fontWeight:'500', lineHeight:1,
                  color: typeId === ct.id ? '#F0EFEC' : ORANGE,
                }}>
                  {ct.btn || 'M'}
                </span>
                <span style={{
                  fontSize:'8px',
                  color: typeId === ct.id ? 'rgba(240,239,236,0.55)' : MUTED,
                  textAlign:'center', lineHeight:'1.2',
                  fontFamily:sans, fontWeight:'400',
                }}>
                  {ct.name}
                </span>
              </button>
            ))}
            {filteredTypes.length === 0 && (
              <div style={{ gridColumn:'1/-1', padding:'20px', textAlign:'center', color:MUTED, fontFamily:mono, fontSize:'11px' }}>
                Nenhum acorde encontrado.
              </div>
            )}
          </div>
        </div>

        {/* ── Voice ── */}
        <div style={{ paddingTop:'24px', borderTop:`1px solid ${BORDER}` }}>
          <div style={{ fontFamily:mono, fontSize:'9px', letterSpacing:'0.22em', textTransform:'uppercase', color:MUTED, marginBottom:'10px' }}>
            Reconhecimento de voz
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap' }}>
            <button
              onClick={listening ? stopListening : startListening}
              style={{
                padding:'10px 20px', borderRadius:'2px',
                fontSize:'11px', fontFamily:mono,
                letterSpacing:'0.12em', textTransform:'uppercase',
                cursor:'pointer', transition:'all 0.15s',
                background: listening ? ORANGE : 'transparent',
                color:       listening ? '#fff' : TEXT,
                border:      `1px solid ${listening ? ORANGE : BORDER}`,
                display:'flex', alignItems:'center', gap:'8px',
              }}>
              <span style={{
                width:'7px', height:'7px', borderRadius:'50%', display:'inline-block',
                background: listening ? 'rgba(255,255,255,0.85)' : MUTED,
                animation: listening ? 'pulse 1s infinite' : 'none',
              }}/>
              {listening ? 'Parar' : 'Falar acorde'}
            </button>
            {voiceMsg && (
              <span style={{ fontFamily:mono, fontSize:'11px', color:MUTED, fontStyle:'italic' }}>
                {voiceMsg}
              </span>
            )}
          </div>
          {!voiceMsg && (
            <div style={{ marginTop:'8px', fontFamily:mono, fontSize:'9px', color:MUTED, letterSpacing:'0.05em', lineHeight:'1.7' }}>
              Ex: "Dó menor sete" · "Sol maior" · "Ré diminuto" · "Lá suspenso"
            </div>
          )}
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #E8E8E5; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
