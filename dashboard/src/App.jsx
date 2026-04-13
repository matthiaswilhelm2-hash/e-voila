import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)
const PROXY = 'http://localhost:3001'

const KATEGORIEN = ['Medikation','Vitalzeichen','Arzttermin','Sturz','Wunde',
  'Körperpflege','Ernährung','Mobilisation','Angehörige','Task','Sonstiges']

const REQUIRED = [
  { key: 'bewohner',  q: 'Für welchen Bewohner?', ph: 'z. B. Frau Müller' },
  { key: 'kategorie', q: 'Welche Kategorie?',      ph: 'Kategorie wählen'  },
]

const LANG_MAP = { de:'🇩🇪 Deutsch', en:'🇬🇧 English', tr:'🇹🇷 Türkçe',
  ar:'🇸🇦 عربي', fr:'🇫🇷 Français', it:'🇮🇹 Italiano', es:'🇪🇸 Español',
  pl:'🇵🇱 Polski', ru:'🇷🇺 Русский', uk:'🇺🇦 Українська' }

// ── SVG Logo ───────────────────────────────────────────────
function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#logoGrad)"/>
      {/* Mikrofon-Körper */}
      <rect x="15" y="8" width="10" height="14" rx="5" fill="white" opacity="0.95"/>
      {/* Mikrofon-Bogen */}
      <path d="M11 19c0 5 4 9 9 9s9-4 9-9" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.95"/>
      {/* Ständer */}
      <line x1="20" y1="28" x2="20" y2="33" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.95"/>
      <line x1="15" y1="33" x2="25" y2="33" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.95"/>
      {/* KI-Puls-Linie */}
      <path d="M7 22h3l2-4 2 7 2-10 2 7 2-4 3 4h3" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1f5b3c"/>
          <stop offset="100%" stopColor="#0d3d29"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

// ── Prio-Badge ─────────────────────────────────────────────
function PrioBadge({ p }) {
  const cfg = { hoch: ['#fef2f2','#dc2626','🔴'], mittel: ['#fffbeb','#d97706','🟡'], niedrig: ['#f0fdf4','#16a34a','🟢'] }
  const [bg, col, ic] = cfg[p] || cfg.niedrig
  return <span style={{ background:bg, color:col, border:`1px solid ${col}30`, borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{ic} {p}</span>
}

// ── Feld-Row ───────────────────────────────────────────────
function FieldRow({ label, warn, children }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <label style={{ fontSize:11, fontWeight:700, color:'#64748b', letterSpacing:0.5 }}>{label}</label>
        {warn && <span style={{ fontSize:10, color:'#f59e0b' }}>⚠ {warn}</span>}
      </div>
      {children}
    </div>
  )
}

export default function App() {
  const [stage, setStage]           = useState('idle')
  const [notes, setNotes]           = useState([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [residents, setResidents]   = useState([])
  const [error, setError]           = useState('')

  // Recording
  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const [recSeconds, setRecSeconds] = useState(0)
  const timerRef         = useRef(null)

  // Review state
  const [transcript,   setTranscript]   = useState('')
  const [detectedLang, setDetectedLang] = useState('')
  const [fields, setFields] = useState({ bewohner:'', kategorie:'', zusammenfassung:'', prioritaet:'mittel', aufgabe:'', termin:'', stimmung:'neutral', confidence:0 })
  const [questions, setQuestions]       = useState([])
  const [answers,   setAnswers]         = useState({})

  useEffect(() => {
    fetchNotes()
    fetchResidents()
  }, [])

  async function fetchNotes() {
    const { data } = await supabase.from('voice_notes').select('*').order('created_at', { ascending: false })
    setNotes(data || [])
    setLoadingNotes(false)
  }
  async function fetchResidents() {
    const { data } = await supabase.from('residents').select('id,name').order('name')
    setResidents(data || [])
  }

  // ── AUFNAHME ───────────────────────────────────────────────
  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')  ? 'audio/mp4' : ''
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = processRecording
      mr.start(100)
      mediaRecorderRef.current = mr
      setRecSeconds(0)
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
      setStage('recording')
    } catch {
      setError('Mikrofon-Zugriff verweigert. Bitte Berechtigung erteilen.')
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current)
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') {
      setStage('transcribing') // sofortiges visuelles Feedback
      mr.stop()
      mr.stream.getTracks().forEach(t => t.stop())
    }
  }

  // ── VERARBEITUNG ──────────────────────────────────────────
  const processRecording = useCallback(async () => {
    const chunks = chunksRef.current
    if (!chunks.length) {
      setError('Keine Audiodaten. Bitte nochmal versuchen.')
      setStage('idle')
      return
    }
    const mime = mediaRecorderRef.current?.mimeType || 'audio/webm'
    const ext  = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm'
    const blob = new Blob(chunks, { type: mime })
    if (blob.size < 500) {
      setError('Aufnahme zu kurz – bitte mindestens 1 Sekunde sprechen.')
      setStage('idle')
      return
    }

    // 1. Whisper
    setStage('transcribing')
    try {
      const fd = new FormData()
      fd.append('file', new File([blob], `rec.${ext}`, { type: mime }))
      const sttRes = await fetch(`${PROXY}/api/whisper`, { method:'POST', body:fd })
      if (!sttRes.ok) {
        const t = await sttRes.text()
        throw new Error(`Spracherkennung fehlgeschlagen: ${t}`)
      }
      const sttData   = await sttRes.json()
      const text      = sttData.text?.trim() || sttData.transcript?.trim()
      const lang      = sttData.language || ''
      if (!text) throw new Error('Kein Text erkannt – bitte deutlicher sprechen.')
      setTranscript(text)
      setDetectedLang(lang)

      // 2. GPT
      setStage('analyzing')
      const gptRes = await fetch(`${PROXY}/api/gpt`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: `Du bist ein KI-Assistent für ein deutsches Pflegeheim. Die Sprache der Notiz kann beliebig sein – antworte IMMER auf Deutsch.
Extrahiere strukturierte Pflegedaten. Antworte NUR mit validem JSON ohne Markdown:
{"kategorie":"Medikation|Vitalzeichen|Arzttermin|Sturz|Wunde|Körperpflege|Ernährung|Mobilisation|Angehörige|Task|Sonstiges","zusammenfassung":"max 100 Zeichen auf Deutsch","prioritaet":"hoch|mittel|niedrig","stimmung":"positiv|neutral|negativ|dringend","bewohner":"vollständiger Name oder null","aufgabe":"konkrete Aufgabe oder null","termin":"ISO-Datetime oder null","confidence":0.95}`,
          },{ role:'user', content:`Analysiere: "${text}"` }],
          temperature: 0.1,
        }),
      })
      if (!gptRes.ok) throw new Error('KI-Analyse fehlgeschlagen.')
      const gptData = await gptRes.json()
      let ai = {}
      try {
        const raw = gptData.choices[0].message.content
        ai = JSON.parse(raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim())
      } catch {
        ai = { kategorie:'Sonstiges', zusammenfassung:text.slice(0,100), prioritaet:'mittel', stimmung:'neutral', confidence:0.5 }
      }

      const f = {
        bewohner:        ai.bewohner        || '',
        kategorie:       ai.kategorie       || '',
        zusammenfassung: ai.zusammenfassung || text.slice(0,100),
        prioritaet:      ai.prioritaet      || 'mittel',
        aufgabe:         ai.aufgabe         || '',
        termin:          ai.termin ? new Date(ai.termin).toISOString().slice(0,16) : '',
        stimmung:        ai.stimmung        || 'neutral',
        confidence:      ai.confidence      || 0.7,
      }
      setFields(f)
      setAnswers({})
      const missing = REQUIRED.filter(r => !f[r.key])
      setQuestions(missing)
      setStage(missing.length ? 'clarifying' : 'reviewing')

    } catch (err) {
      console.error(err)
      setError(err.message)
      setStage('idle')
    }
  }, [])

  function submitAnswers() {
    const upd = { ...fields }
    questions.forEach(q => { if (answers[q.key]?.trim()) upd[q.key] = answers[q.key].trim() })
    setFields(upd)
    setStage('reviewing')
  }

  async function saveNote() {
    setStage('saving')
    try {
      const { data: note, error: e1 } = await supabase.from('voice_notes')
        .insert([{ transcript, status:'neu' }]).select().single()
      if (e1) throw new Error(e1.message)
      await supabase.from('ai_analysis').insert([{
        voice_note_id:   note.id,
        kategorie:       fields.kategorie      || 'Sonstiges',
        zusammenfassung: fields.zusammenfassung,
        prioritaet:      fields.prioritaet,
        stimmung:        fields.stimmung,
        confidence:      fields.confidence,
      }])
      const taskKats = ['Task','Medikation','Arzttermin','Sturz','Wunde']
      if (fields.aufgabe || taskKats.includes(fields.kategorie)) {
        await supabase.from('tasks').insert([{
          titel:       fields.aufgabe || fields.zusammenfassung,
          beschreibung:transcript, prioritaet:fields.prioritaet,
          status:'offen', kategorie:fields.kategorie,
          bewohner:fields.bewohner || null,
          due_date:fields.termin ? new Date(fields.termin).toISOString() : null,
        }])
      }
      setStage('done')
      await fetchNotes()
      setTimeout(() => {
        setStage('idle'); setTranscript(''); setDetectedLang(''); setError('')
        setFields({ bewohner:'', kategorie:'', zusammenfassung:'', prioritaet:'mittel', aufgabe:'', termin:'', stimmung:'neutral', confidence:0 })
      }, 2500)
    } catch (err) {
      setError(err.message)
      setStage('reviewing')
    }
  }

  function reset() {
    setStage('idle'); setTranscript(''); setDetectedLang(''); setError('')
    setFields({ bewohner:'', kategorie:'', zusammenfassung:'', prioritaet:'mittel', aufgabe:'', termin:'', stimmung:'neutral', confidence:0 })
  }

  // ── Helpers ─────────────────────────────────────────────────
  const isIdle       = stage === 'idle'
  const isRecording  = stage === 'recording'
  const isWorking    = ['transcribing','analyzing','saving'].includes(stage)
  const isClarifying = stage === 'clarifying'
  const isReviewing  = stage === 'reviewing'
  const isDone       = stage === 'done'

  const fmtSec = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  const inputStyle = (highlight) => ({
    width:'100%', background:'#f8fafc',
    border:`1.5px solid ${highlight ? '#f59e0b' : '#e2e8f0'}`,
    borderRadius:8, padding:'9px 12px', fontSize:13, color:'#1e293b',
    outline:'none', boxSizing:'border-box', transition:'border-color 0.2s',
  })
  const selectStyle = (color) => ({
    width:'100%', background:'#f8fafc',
    border:`1.5px solid ${color || '#e2e8f0'}`,
    borderRadius:8, padding:'9px 12px', fontSize:13, color:'#1e293b',
    outline:'none', boxSizing:'border-box',
  })

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4f8', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* ── HEADER ── */}
      <header style={{
        background:'white', borderBottom:'1px solid #e2e8f0',
        padding:'0 24px', height:56,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'sticky', top:0, zIndex:100,
        boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <a href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <Logo size={32} />
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:'#0f172a', letterSpacing:-0.3 }}>E-Voila Pflege</div>
            <div style={{ fontSize:10, color:'#94a3b8' }}>KI-Sprachdokumentation</div>
          </div>
        </a>
        <nav style={{ display:'flex', gap:8 }}>
          <a href="/handover" style={{
            background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0',
            padding:'6px 12px', borderRadius:7, textDecoration:'none', fontSize:12, fontWeight:600,
          }}>🔀 Übergabe</a>
          <a href="/dashboard" style={{
            background:'#1f5b3c', color:'white',
            padding:'6px 14px', borderRadius:7, textDecoration:'none', fontSize:12, fontWeight:700,
          }}>📊 Dashboard</a>
        </nav>
      </header>

      <main style={{ maxWidth:560, margin:'0 auto', padding:'32px 20px' }}>

        {/* ── AUFNAHME CARD ── */}
        <div style={{
          background:'white', borderRadius:20,
          boxShadow:'0 4px 24px rgba(0,0,0,0.08)', overflow:'hidden',
          marginBottom:20,
        }}>

          {/* Card-Header Stripe */}
          <div style={{
            background:'linear-gradient(135deg, #1f5b3c, #2d7a54)',
            padding:'20px 24px',
            display:'flex', alignItems:'center', gap:12,
          }}>
            <div style={{
              width:40, height:40, borderRadius:'50%',
              background:'rgba(255,255,255,0.15)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18,
            }}>🎙</div>
            <div>
              <div style={{ color:'white', fontWeight:800, fontSize:15 }}>Neue Sprachnotiz</div>
              <div style={{ color:'rgba(255,255,255,0.7)', fontSize:11 }}>
                Alle Sprachen · Alle Akzente · KI-gestützt
              </div>
            </div>
          </div>

          <div style={{ padding:'28px 24px' }}>

            {/* IDLE */}
            {isIdle && (
              <div style={{ textAlign:'center' }}>
                <button onClick={startRecording} style={{
                  width:96, height:96, borderRadius:'50%', border:'none',
                  background:'linear-gradient(135deg, #1f5b3c, #2d7a54)',
                  color:'white', fontSize:36, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px',
                  boxShadow:'0 8px 24px rgba(31,91,60,0.35)',
                  transition:'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(31,91,60,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(31,91,60,0.35)' }}
                >🎙</button>
                <p style={{ fontSize:13, color:'#64748b', margin:'0 0 4px' }}>Klicken zum Starten</p>
                <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>Deutsch · English · Türkçe · عربي · und mehr</p>
                {error && (
                  <div style={{
                    marginTop:16, background:'#fef2f2', border:'1px solid #fecaca',
                    borderRadius:10, padding:'10px 14px', fontSize:13, color:'#dc2626',
                  }}>⚠ {error}</div>
                )}
              </div>
            )}

            {/* RECORDING */}
            {isRecording && (
              <div style={{ textAlign:'center' }}>
                <div style={{ position:'relative', display:'inline-block', marginBottom:16 }}>
                  <button onClick={stopRecording} style={{
                    width:96, height:96, borderRadius:'50%', border:'none',
                    background:'linear-gradient(135deg, #ef4444, #dc2626)',
                    color:'white', fontSize:28, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto',
                    boxShadow:'0 0 0 0 rgba(239,68,68,0.4)',
                    animation:'recPulse 1.5s ease-in-out infinite',
                  }}>⏹</button>
                </div>
                <div style={{ fontWeight:700, fontSize:20, color:'#dc2626', fontVariantNumeric:'tabular-nums' }}>
                  {fmtSec(recSeconds)}
                </div>
                <p style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Aufnahme läuft · Klicken zum Stoppen</p>
              </div>
            )}

            {/* PROCESSING */}
            {isWorking && (
              <div style={{ textAlign:'center', padding:'8px 0' }}>
                <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:16 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width:10, height:10, borderRadius:'50%',
                      background:'#1f5b3c', opacity:0.3,
                      animation:`dotBounce 1.2s ${i*0.2}s ease-in-out infinite`,
                    }}/>
                  ))}
                </div>
                <div style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>
                  {stage === 'transcribing' && '🎙 Sprache wird erkannt…'}
                  {stage === 'analyzing'    && '🧠 KI analysiert Pflegedaten…'}
                  {stage === 'saving'       && '💾 Wird gespeichert…'}
                </div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:6 }}>
                  {stage === 'transcribing' && 'Whisper erkennt Sprache automatisch'}
                  {stage === 'analyzing'    && 'GPT-4 extrahiert Bewohner, Kategorie, Aufgaben'}
                  {stage === 'saving'       && 'Schreibe in Datenbank…'}
                </div>
              </div>
            )}

            {/* RÜCKFRAGEN */}
            {isClarifying && (
              <div>
                <div style={{
                  background:'#f0fdf4', border:'1px solid #bbf7d0',
                  borderRadius:10, padding:'12px 14px', marginBottom:20,
                  display:'flex', gap:10, alignItems:'flex-start',
                }}>
                  <span style={{ fontSize:18 }}>🤔</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:'#166534' }}>Fast fertig – kurze Rückfrage</div>
                    <div style={{ fontSize:12, color:'#166534', opacity:0.8, marginTop:2, fontStyle:'italic' }}>
                      „{transcript.slice(0,80)}{transcript.length>80?'…':''}"
                      {detectedLang && <span style={{ marginLeft:6 }}>{LANG_MAP[detectedLang] || detectedLang}</span>}
                    </div>
                  </div>
                </div>
                {questions.map(q => (
                  <div key={q.key} style={{ marginBottom:16 }}>
                    <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>{q.q}</label>
                    {q.key === 'bewohner' && residents.length > 0 && (
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                        {residents.slice(0,6).map(r => (
                          <button key={r.id} onClick={() => setAnswers(a => ({ ...a, [q.key]:r.name }))}
                            style={{
                              background: answers[q.key]===r.name ? '#1f5b3c' : '#f1f5f9',
                              color: answers[q.key]===r.name ? 'white' : '#374151',
                              border: `1.5px solid ${answers[q.key]===r.name ? '#1f5b3c' : '#e2e8f0'}`,
                              borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontWeight:500,
                            }}>{r.name}</button>
                        ))}
                      </div>
                    )}
                    {q.key === 'kategorie' ? (
                      <select value={answers[q.key]||''} onChange={e => setAnswers(a=>({...a,[q.key]:e.target.value}))} style={selectStyle()}>
                        <option value="">-- Kategorie wählen --</option>
                        {KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    ) : (
                      <input value={answers[q.key]||''} onChange={e => setAnswers(a=>({...a,[q.key]:e.target.value}))}
                        placeholder={q.ph} style={inputStyle()} />
                    )}
                  </div>
                ))}
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={submitAnswers} style={{
                    flex:1, background:'#1f5b3c', color:'white', border:'none',
                    borderRadius:10, padding:'12px', fontWeight:700, fontSize:14, cursor:'pointer',
                  }}>Weiter →</button>
                  <button onClick={() => setStage('reviewing')} style={{
                    background:'none', border:'1.5px solid #e2e8f0', color:'#64748b',
                    borderRadius:10, padding:'12px 14px', fontSize:12, cursor:'pointer',
                  }}>Überspringen</button>
                </div>
              </div>
            )}

            {/* REVIEW */}
            {isReviewing && (
              <div>
                {/* Transkript */}
                <div style={{
                  background:'#f8fafc', border:'1px solid #e2e8f0',
                  borderRadius:10, padding:'12px 14px', marginBottom:20,
                  display:'flex', gap:10, alignItems:'flex-start',
                }}>
                  <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>🎙</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:'#64748b', marginBottom:4, display:'flex', gap:8 }}>
                      <span>Erkannter Text</span>
                      {detectedLang && <span style={{ color:'#1f5b3c', fontWeight:600 }}>{LANG_MAP[detectedLang] || `🌍 ${detectedLang}`}</span>}
                      {fields.confidence > 0 && (
                        <span style={{ color: fields.confidence>=0.85?'#16a34a':'#d97706', fontWeight:600 }}>
                          {Math.round(fields.confidence*100)}% sicher
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:13, color:'#1e293b', fontStyle:'italic', lineHeight:1.5 }}>„{transcript}"</div>
                  </div>
                </div>

                {/* Felder */}
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <FieldRow label="BEWOHNER" warn={!fields.bewohner ? 'Nicht erkannt' : ''}>
                      <input value={fields.bewohner} onChange={e => setFields(f=>({...f,bewohner:e.target.value}))}
                        list="res-list" placeholder="Name…" style={inputStyle(!fields.bewohner)} />
                      <datalist id="res-list">{residents.map(r=><option key={r.id} value={r.name}/>)}</datalist>
                    </FieldRow>
                    <FieldRow label="KATEGORIE">
                      <select value={fields.kategorie} onChange={e=>setFields(f=>({...f,kategorie:e.target.value}))} style={selectStyle()}>
                        <option value="">wählen…</option>
                        {KATEGORIEN.map(k=><option key={k} value={k}>{k}</option>)}
                      </select>
                    </FieldRow>
                  </div>

                  <FieldRow label="ZUSAMMENFASSUNG">
                    <input value={fields.zusammenfassung} onChange={e=>setFields(f=>({...f,zusammenfassung:e.target.value}))}
                      style={inputStyle()} maxLength={120} />
                  </FieldRow>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <FieldRow label="PRIORITÄT">
                      <select value={fields.prioritaet} onChange={e=>setFields(f=>({...f,prioritaet:e.target.value}))}
                        style={selectStyle(fields.prioritaet==='hoch'?'#fca5a5':fields.prioritaet==='mittel'?'#fcd34d':'#86efac')}>
                        <option value="hoch">🔴 Hoch</option>
                        <option value="mittel">🟡 Mittel</option>
                        <option value="niedrig">🟢 Niedrig</option>
                      </select>
                    </FieldRow>
                    <FieldRow label="TERMIN (optional)">
                      <input type="datetime-local" value={fields.termin} onChange={e=>setFields(f=>({...f,termin:e.target.value}))}
                        style={inputStyle()} />
                    </FieldRow>
                  </div>

                  <FieldRow label="AUFGABE (optional)">
                    <input value={fields.aufgabe} onChange={e=>setFields(f=>({...f,aufgabe:e.target.value}))}
                      placeholder="Konkrete nächste Aktion…" style={inputStyle()} />
                  </FieldRow>
                </div>

                <div style={{ display:'flex', gap:8, marginTop:20 }}>
                  <button onClick={saveNote} style={{
                    flex:1, background:'#1f5b3c', color:'white', border:'none',
                    borderRadius:10, padding:'14px', fontWeight:700, fontSize:14, cursor:'pointer',
                    boxShadow:'0 4px 12px rgba(31,91,60,0.25)', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  }}>
                    <span>✓</span> Bestätigen & Speichern
                  </button>
                  <button onClick={reset} style={{
                    background:'none', border:'1.5px solid #e2e8f0', color:'#94a3b8',
                    borderRadius:10, padding:'14px 16px', fontSize:13, cursor:'pointer',
                  }}>✕</button>
                </div>
                {error && <div style={{ marginTop:10, fontSize:12, color:'#dc2626', textAlign:'center' }}>⚠ {error}</div>}
              </div>
            )}

            {/* DONE */}
            {isDone && (
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <div style={{ fontSize:52, marginBottom:10 }}>✅</div>
                <div style={{ fontWeight:800, fontSize:16, color:'#16a34a' }}>Notiz gespeichert!</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>
                  {fields.aufgabe ? 'Notiz + Task erstellt' : 'Notiz + KI-Analyse gespeichert'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── BEISPIELE ── */}
        {isIdle && (
          <div style={{
            background:'white', borderRadius:16, padding:'18px 20px',
            boxShadow:'0 2px 8px rgba(0,0,0,0.05)', marginBottom:20,
          }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:1, marginBottom:12 }}>
              💡 BEISPIELE
            </div>
            {[
              ['🇩🇪', '"Frau Müller hatte heute Knieschmerzen, bitte Arzt informieren"'],
              ['🇬🇧', '"Mr. Fischer\'s blood pressure was 160/90, pulse 88"'],
              ['🇹🇷', '"Bayan Schmidt sabah ilaçlarını almadı, lütfen kontrol edin"'],
              ['🇩🇪', '"Morgen 14 Uhr Physio für Zimmer 203 einplanen"'],
            ].map(([flag, text], i) => (
              <div key={i} style={{
                display:'flex', gap:10, padding:'7px 0', fontSize:12, color:'#475569',
                borderBottom: i<3 ? '1px solid #f1f5f9' : 'none',
              }}>
                <span style={{ flexShrink:0 }}>{flag}</span>
                <span style={{ fontStyle:'italic' }}>{text}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── NOTIZEN LISTE ── */}
        <div style={{ background:'white', borderRadius:16, boxShadow:'0 2px 8px rgba(0,0,0,0.05)', overflow:'hidden' }}>
          <div style={{
            padding:'14px 20px', borderBottom:'1px solid #f1f5f9',
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <span style={{ fontWeight:700, fontSize:12, color:'#374151' }}>🎙 LETZTE NOTIZEN ({notes.length})</span>
            <a href="/dashboard" style={{ fontSize:11, color:'#1f5b3c', fontWeight:600, textDecoration:'none' }}>
              Alle im Dashboard →
            </a>
          </div>
          {loadingNotes && <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Lädt…</div>}
          {!loadingNotes && notes.length === 0 && (
            <div style={{ padding:36, textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🎙</div>
              <div style={{ fontSize:13, color:'#94a3b8' }}>Noch keine Notizen – starte die erste Aufnahme!</div>
            </div>
          )}
          {notes.slice(0,6).map((n,i) => (
            <div key={n.id} style={{
              padding:'11px 20px', borderBottom: i<Math.min(notes.length,6)-1 ? '1px solid #f8fafc' : 'none',
              display:'flex', gap:10, alignItems:'flex-start',
            }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#1f5b3c', flexShrink:0, marginTop:5 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:'#374151', lineHeight:1.55 }}>{n.transcript}</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>
                  {new Date(n.created_at).toLocaleString('de-DE')}
                </div>
              </div>
            </div>
          ))}
          {notes.length > 6 && (
            <div style={{ padding:'10px 20px', fontSize:11, color:'#94a3b8', textAlign:'center' }}>
              +{notes.length-6} weitere im Dashboard
            </div>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:10, color:'#cbd5e1' }}>
          E-Voila Pflege · v2.1 · DSGVO-konform
        </div>
      </main>

      <style>{`
        @keyframes recPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4), 0 8px 24px rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 0 20px rgba(239,68,68,0), 0 8px 24px rgba(239,68,68,0.15); }
        }
        @keyframes dotBounce {
          0%,80%,100% { transform: scale(1); opacity: 0.3; }
          40% { transform: scale(1.4); opacity: 1; }
        }
        input:focus, select:focus { border-color: #1f5b3c !important; box-shadow: 0 0 0 3px rgba(31,91,60,0.1); }
      `}</style>
    </div>
  )
}
