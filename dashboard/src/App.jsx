import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

const PROXY = 'http://localhost:3001'

const KATEGORIEN = [
  'Medikation','Vitalzeichen','Arzttermin','Sturz','Wunde',
  'Körperpflege','Ernährung','Mobilisation','Angehörige','Task','Sonstiges',
]

// Felder die ZWINGEND befüllt sein sollten (sonst Rückfrage)
const REQUIRED_FIELDS = [
  { key: 'bewohner',  question: 'Für welchen Bewohner ist diese Notiz?',  placeholder: 'z. B. Frau Müller' },
  { key: 'kategorie', question: 'Was ist die Kategorie?',                 placeholder: 'z. B. Medikation' },
]

function FieldTag({ label, value, color = '#1f5b3c' }) {
  if (!value) return null
  return (
    <span style={{
      background: color + '22', color,
      border: `1px solid ${color}40`,
      borderRadius: 6, padding: '3px 10px',
      fontSize: 11, fontWeight: 700,
    }}>{label}: {value}</span>
  )
}

export default function App() {
  // ── State ───────────────────────────────────────────────
  const [stage, setStage]           = useState('idle')
  // idle | recording | transcribing | analyzing | reviewing | clarifying | saving | done
  const [darkMode, setDarkMode]     = useState(true)
  const [notes, setNotes]           = useState([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [residents, setResidents]   = useState([])
  const [statusMsg, setStatusMsg]   = useState('')

  // Während der Aufnahme
  const mediaRecorder = useRef(null)
  const chunks        = useRef([])

  // Nach Transkription: Review-State
  const [transcript,  setTranscript]  = useState('')
  const [detectedLang, setDetectedLang] = useState('')
  const [fields, setFields] = useState({
    bewohner:       '',
    kategorie:      '',
    zusammenfassung:'',
    prioritaet:     'mittel',
    aufgabe:        '',
    termin:         '',
    stimmung:       'neutral',
    confidence:     0.8,
  })

  // Rückfragen-State
  const [pendingQuestions, setPendingQuestions] = useState([]) // [{key, question, placeholder}]
  const [answers, setAnswers] = useState({})

  useEffect(() => {
    fetchNotes()
    fetchResidents()
  }, [])

  async function fetchNotes() {
    const { data } = await supabase
      .from('voice_notes').select('*').order('created_at', { ascending: false })
    setNotes(data || [])
    setLoadingNotes(false)
  }

  async function fetchResidents() {
    const { data } = await supabase.from('residents').select('id, name').order('name')
    setResidents(data || [])
  }

  // ── Aufnahme starten ────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunks.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')  ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')   ? 'audio/mp4'
        : ''
      mediaRecorder.current = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      mediaRecorder.current.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data) }
      mediaRecorder.current.onstop = handleStop
      mediaRecorder.current.start(100)
      setStage('recording')
    } catch (err) {
      alert('Mikrofon-Zugriff verweigert: ' + err.message)
    }
  }

  function stopRecording() {
    if (mediaRecorder.current?.state !== 'inactive') {
      mediaRecorder.current.stop()
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop())
    }
  }

  // ── Nach Aufnahme: Transkription + KI ──────────────────
  async function handleStop() {
    if (chunks.current.length === 0) {
      setStatusMsg('❌ Keine Audiodaten')
      setStage('idle')
      return
    }

    const mimeType  = mediaRecorder.current?.mimeType || 'audio/webm'
    const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
    const blob      = new Blob(chunks.current, { type: mimeType })

    if (blob.size < 1000) {
      setStatusMsg('❌ Aufnahme zu kurz – bitte länger sprechen')
      setStage('idle')
      return
    }

    // ── 1. Whisper STT ─────────────────────────────────
    setStage('transcribing')
    setStatusMsg('🎙 Erkenne Sprache und transkribiere…')

    const formData = new FormData()
    formData.append('file', new File([blob], `aufnahme.${extension}`, { type: mimeType }))

    try {
      const sttRes = await fetch(`${PROXY}/api/whisper`, { method: 'POST', body: formData })
      if (!sttRes.ok) throw new Error(await sttRes.text())
      const sttData   = await sttRes.json()
      const text      = sttData.text?.trim()
      const lang      = sttData.language || ''
      if (!text) throw new Error('Keine Transkription – bitte deutlicher sprechen')
      setTranscript(text)
      setDetectedLang(lang)

      // ── 2. KI-Analyse ──────────────────────────────
      setStage('analyzing')
      setStatusMsg('🧠 KI analysiert…')

      const aiRes = await fetch(`${PROXY}/api/gpt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: `Du bist ein KI-Assistent für ein deutsches Pflegeheim.
Die Sprachnotiz kann in jeder Sprache sein – antworte immer auf DEUTSCH.
Extrahiere strukturierte Informationen aus der Pflegenotiz.
Antworte NUR mit validem JSON ohne Markdown:
{
  "kategorie": "Medikation|Vitalzeichen|Arzttermin|Sturz|Wunde|Körperpflege|Ernährung|Mobilisation|Angehörige|Task|Sonstiges",
  "zusammenfassung": "kurze Zusammenfassung auf Deutsch, max 100 Zeichen",
  "prioritaet": "hoch|mittel|niedrig",
  "stimmung": "positiv|neutral|negativ|dringend",
  "bewohner": "vollständiger Name des Bewohners oder null",
  "aufgabe": "konkrete nächste Aufgabe oder null",
  "termin": "ISO-Datum/Uhrzeit oder null",
  "confidence": 0.95
}`,
          }, {
            role: 'user',
            content: `Analysiere diese Pflegenotiz: "${text}"`,
          }],
          temperature: 0.2,
        }),
      })

      if (!aiRes.ok) throw new Error('KI-Analyse fehlgeschlagen')
      const aiData = await aiRes.json()
      let analysis = {}
      try {
        const raw     = aiData.choices[0].message.content
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        analysis      = JSON.parse(cleaned)
      } catch {
        analysis = { kategorie: 'Sonstiges', zusammenfassung: text.slice(0, 100), prioritaet: 'mittel', stimmung: 'neutral', confidence: 0.5 }
      }

      // Felder vorausfüllen
      const f = {
        bewohner:       analysis.bewohner       || '',
        kategorie:      analysis.kategorie      || '',
        zusammenfassung:analysis.zusammenfassung|| text.slice(0, 100),
        prioritaet:     analysis.prioritaet     || 'mittel',
        aufgabe:        analysis.aufgabe        || '',
        termin:         analysis.termin         ? new Date(analysis.termin).toISOString().slice(0,16) : '',
        stimmung:       analysis.stimmung       || 'neutral',
        confidence:     analysis.confidence     || 0.8,
      }
      setFields(f)
      setAnswers({})

      // Rückfragen ermitteln: welche Pflichtfelder sind leer?
      const missing = REQUIRED_FIELDS.filter(rf => !f[rf.key])
      setPendingQuestions(missing)

      setStage(missing.length > 0 ? 'clarifying' : 'reviewing')
      setStatusMsg('')

    } catch (err) {
      setStatusMsg(`❌ ${err.message}`)
      setStage('idle')
    }
  }

  // Rückfrage beantwortet → weiter zur Review
  function submitAnswers() {
    const updatedFields = { ...fields }
    pendingQuestions.forEach(q => {
      if (answers[q.key]?.trim()) updatedFields[q.key] = answers[q.key].trim()
    })
    setFields(updatedFields)
    setStage('reviewing')
  }

  // ── Bestätigt: Speichern ────────────────────────────────
  async function saveNote() {
    setStage('saving')
    setStatusMsg('💾 Speichere…')
    try {
      // Notiz
      const { data: note, error: noteErr } = await supabase
        .from('voice_notes')
        .insert([{ transcript, status: 'neu' }])
        .select().single()
      if (noteErr) throw new Error(noteErr.message)

      // Analyse
      await supabase.from('ai_analysis').insert([{
        voice_note_id:   note.id,
        kategorie:       fields.kategorie      || 'Sonstiges',
        zusammenfassung: fields.zusammenfassung|| transcript.slice(0, 100),
        prioritaet:      fields.prioritaet     || 'mittel',
        stimmung:        fields.stimmung       || 'neutral',
        confidence:      fields.confidence     || 0.8,
      }])

      // Auto-Task wenn Aufgabe oder Task-Kategorie
      const taskKats = ['Task','Medikation','Arzttermin','Sturz','Wunde']
      if (fields.aufgabe || taskKats.includes(fields.kategorie)) {
        await supabase.from('tasks').insert([{
          titel:       fields.aufgabe        || fields.zusammenfassung,
          beschreibung:transcript,
          prioritaet:  fields.prioritaet     || 'mittel',
          status:      'offen',
          kategorie:   fields.kategorie,
          bewohner:    fields.bewohner       || null,
          due_date:    fields.termin         ? new Date(fields.termin).toISOString() : null,
        }])
      }

      setStage('done')
      setStatusMsg('✅ Notiz gespeichert!')
      await fetchNotes()
      setTimeout(() => {
        setStage('idle')
        setStatusMsg('')
        setTranscript('')
        setDetectedLang('')
        setFields({ bewohner:'', kategorie:'', zusammenfassung:'', prioritaet:'mittel', aufgabe:'', termin:'', stimmung:'neutral', confidence:0.8 })
      }, 3000)

    } catch (err) {
      setStatusMsg(`❌ ${err.message}`)
      setStage('reviewing')
    }
  }

  // ── Helpers ─────────────────────────────────────────────
  const bg    = darkMode ? '#0f172a' : '#f1f5f9'
  const card  = darkMode ? '#1e293b' : '#ffffff'
  const bord  = darkMode ? '#334155' : '#e2e8f0'
  const text  = darkMode ? '#f1f5f9' : '#1a1d23'

  const LANG_FLAGS = { de:'🇩🇪', en:'🇬🇧', tr:'🇹🇷', ar:'🇸🇦', fr:'🇫🇷', it:'🇮🇹', es:'🇪🇸', pl:'🇵🇱', ru:'🇷🇺', uk:'🇺🇦' }
  const langFlag = LANG_FLAGS[detectedLang] || (detectedLang ? '🌍' : '')

  const isIdle        = stage === 'idle'
  const isRecording   = stage === 'recording'
  const isProcessing  = ['transcribing','analyzing','saving'].includes(stage)
  const isReviewing   = stage === 'reviewing'
  const isClarifying  = stage === 'clarifying'
  const isDone        = stage === 'done'

  return (
    <div style={{ minHeight:'100vh', background:bg, color:text, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', transition:'all 0.3s' }}>

      {/* ── HEADER ── */}
      <div style={{
        background:card, borderBottom:`1px solid ${bord}`,
        padding:'0 20px', height:60,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'sticky', top:0, zIndex:100,
        boxShadow:'0 1px 8px rgba(0,0,0,0.12)',
      }}>
        <a href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', color:'inherit' }}>
          <div style={{
            width:36, height:36, borderRadius:9, background:'#1f5b3c',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'white', fontWeight:900, fontSize:12,
          }}>EV</div>
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>E-Voila Pflege</div>
            <div style={{ fontSize:10, opacity:0.5 }}>Sprachdokumentation</div>
          </div>
        </a>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <a href="/handover" style={{
            background:'none', border:`1px solid ${bord}`, color:'#4caf82',
            padding:'6px 12px', borderRadius:7, textDecoration:'none', fontSize:12, fontWeight:600,
          }}>🔀 Übergabe</a>
          <a href="/dashboard" style={{
            background:'#1f5b3c', color:'white',
            padding:'6px 12px', borderRadius:7, textDecoration:'none', fontSize:12, fontWeight:600,
          }}>📊 Dashboard</a>
          <button onClick={() => setDarkMode(d => !d)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18 }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth:640, margin:'0 auto', padding:'28px 20px' }}>

        {/* ── AUFNAHME CARD ── */}
        <div style={{
          background:card, borderRadius:20, padding:'36px 24px',
          textAlign:'center', marginBottom:20,
          border:`1px solid ${bord}`,
          boxShadow:'0 8px 32px rgba(0,0,0,0.15)',
        }}>

          {/* IDLE oder RECORDING */}
          {(isIdle || isRecording) && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color:'#4caf82', letterSpacing:1, marginBottom:12 }}>
                🤖 KI-PFLEGEDOKUMENTATION · ALLE SPRACHEN
              </div>
              <h2 style={{ fontSize:24, fontWeight:800, margin:'0 0 8px' }}>Neue Sprachnotiz</h2>
              <p style={{ fontSize:13, opacity:0.55, margin:'0 0 28px' }}>
                Einfach draufsprechen – Deutsch, Englisch, Türkisch, Arabisch und mehr.<br/>
                Die KI erkennt Sprache, Bewohner und Aufgaben automatisch.
              </p>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                style={{
                  width:88, height:88, borderRadius:'50%', border:'none',
                  cursor:'pointer',
                  background: isRecording
                    ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                    : 'linear-gradient(135deg,#1f5b3c,#2d7a54)',
                  color:'white', fontSize:30,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  margin:'0 auto 20px',
                  boxShadow: isRecording
                    ? '0 0 0 16px rgba(239,68,68,0.15),0 8px 24px rgba(239,68,68,0.4)'
                    : '0 8px 24px rgba(31,91,60,0.5)',
                  animation: isRecording ? 'pulse 1.5s infinite' : 'none',
                  transition:'all 0.3s',
                }}
              >
                {isRecording ? '⏹' : '🎙'}
              </button>
              <div style={{ fontSize:12, opacity:0.4 }}>
                {isRecording
                  ? '🔴 Aufnahme läuft – klicke zum Stoppen'
                  : '🎙 Klicke zum Starten'}
              </div>
            </>
          )}

          {/* PROCESSING */}
          {isProcessing && (
            <div style={{ padding:'20px 0' }}>
              <div style={{ fontSize:48, marginBottom:16, animation:'spin 2s linear infinite', display:'inline-block' }}>⚙️</div>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>{statusMsg}</div>
              <div style={{ fontSize:12, opacity:0.5 }}>
                {stage === 'transcribing' && 'Whisper erkennt Sprache und Text…'}
                {stage === 'analyzing'    && 'GPT-4 extrahiert Pflegedaten…'}
                {stage === 'saving'       && 'Wird in Supabase gespeichert…'}
              </div>
            </div>
          )}

          {/* RÜCKFRAGEN */}
          {isClarifying && (
            <div style={{ textAlign:'left' }}>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🤔</div>
                <div style={{ fontWeight:800, fontSize:17, marginBottom:4 }}>Kurze Rückfrage</div>
                <div style={{ fontSize:13, opacity:0.6 }}>
                  Ich habe nicht alle Informationen erkannt. Bitte ergänze:
                </div>
              </div>

              {/* Transkript anzeigen */}
              <div style={{
                background: darkMode ? '#0f172a' : '#f8fafc',
                border:`1px solid ${bord}`, borderRadius:10,
                padding:'10px 14px', marginBottom:16, fontSize:12, opacity:0.8,
                fontStyle:'italic',
              }}>
                {langFlag && <span style={{ marginRight:6 }}>{langFlag}</span>}
                „{transcript}"
              </div>

              {pendingQuestions.map(q => (
                <div key={q.key} style={{ marginBottom:16 }}>
                  <label style={{ fontSize:12, fontWeight:700, opacity:0.7, display:'block', marginBottom:6 }}>
                    {q.question}
                  </label>
                  {q.key === 'bewohner' && residents.length > 0 ? (
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                      {residents.slice(0, 6).map(r => (
                        <button key={r.id} onClick={() => setAnswers(a => ({ ...a, [q.key]: r.name }))}
                          style={{
                            background: answers[q.key] === r.name ? '#1f5b3c' : (darkMode ? '#0f172a' : '#f1f5f9'),
                            color: answers[q.key] === r.name ? '#fff' : 'inherit',
                            border:`1px solid ${answers[q.key] === r.name ? '#1f5b3c' : bord}`,
                            borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer',
                          }}>
                          {r.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {q.key === 'kategorie' ? (
                    <select
                      value={answers[q.key] || ''}
                      onChange={e => setAnswers(a => ({ ...a, [q.key]: e.target.value }))}
                      style={{
                        width:'100%', background: darkMode ? '#0f172a' : '#f8fafc',
                        border:`1px solid ${bord}`, color:text,
                        borderRadius:8, padding:'9px 12px', fontSize:13,
                      }}
                    >
                      <option value="">-- Bitte wählen --</option>
                      {KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  ) : (
                    <input
                      value={answers[q.key] || ''}
                      onChange={e => setAnswers(a => ({ ...a, [q.key]: e.target.value }))}
                      placeholder={q.placeholder}
                      style={{
                        width:'100%', background: darkMode ? '#0f172a' : '#f8fafc',
                        border:`1px solid ${bord}`, color:text,
                        borderRadius:8, padding:'9px 12px', fontSize:13,
                        boxSizing:'border-box',
                      }}
                    />
                  )}
                </div>
              ))}

              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button onClick={submitAnswers} style={{
                  flex:1, background:'linear-gradient(135deg,#1f5b3c,#2d7a54)',
                  border:'none', color:'white',
                  borderRadius:10, padding:'12px', fontWeight:700, fontSize:14, cursor:'pointer',
                }}>Weiter →</button>
                <button onClick={() => setStage('reviewing')} style={{
                  background:'none', border:`1px solid ${bord}`, color:text,
                  borderRadius:10, padding:'12px 16px', fontSize:13, cursor:'pointer',
                }}>Überspringen</button>
              </div>
            </div>
          )}

          {/* REVIEW & BESTÄTIGEN */}
          {isReviewing && (
            <div style={{ textAlign:'left' }}>
              <div style={{ textAlign:'center', marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#4caf82', letterSpacing:1, marginBottom:8 }}>
                  KI HAT ERKANNT – BITTE PRÜFEN
                </div>
                <div style={{ fontWeight:800, fontSize:17 }}>Stimmt das so?</div>
              </div>

              {/* Transkript */}
              <div style={{
                background: darkMode ? '#0f172a' : '#f8fafc',
                border:`1px solid ${bord}`, borderRadius:10,
                padding:'10px 14px', marginBottom:16, fontSize:12,
                display:'flex', alignItems:'flex-start', gap:8,
              }}>
                <span style={{ opacity:0.4 }}>🎙</span>
                <div>
                  {langFlag && (
                    <span style={{ fontSize:10, opacity:0.6, marginRight:6 }}>
                      {langFlag} {detectedLang.toUpperCase()}
                    </span>
                  )}
                  <span style={{ fontStyle:'italic', opacity:0.8 }}>„{transcript}"</span>
                </div>
              </div>

              {/* Felder editierbar */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, opacity:0.6, display:'block', marginBottom:5 }}>BEWOHNER</label>
                    <input
                      value={fields.bewohner}
                      onChange={e => setFields(f => ({ ...f, bewohner: e.target.value }))}
                      list="resident-list"
                      placeholder="Name eingeben…"
                      style={{
                        width:'100%', background: darkMode ? '#0f172a' : '#f8fafc',
                        border:`1px solid ${fields.bewohner ? '#1f5b3c' : '#f59e0b'}`,
                        color:text, borderRadius:8, padding:'8px 10px', fontSize:13,
                        boxSizing:'border-box',
                      }}
                    />
                    <datalist id="resident-list">
                      {residents.map(r => <option key={r.id} value={r.name} />)}
                    </datalist>
                    {!fields.bewohner && <div style={{ fontSize:10, color:'#f59e0b', marginTop:3 }}>⚠ Kein Bewohner erkannt</div>}
                  </div>

                  <div>
                    <label style={{ fontSize:11, fontWeight:700, opacity:0.6, display:'block', marginBottom:5 }}>KATEGORIE</label>
                    <select
                      value={fields.kategorie}
                      onChange={e => setFields(f => ({ ...f, kategorie: e.target.value }))}
                      style={{
                        width:'100%', background: darkMode ? '#0f172a' : '#f8fafc',
                        border:`1px solid ${fields.kategorie ? '#1f5b3c' : bord}`,
                        color:text, borderRadius:8, padding:'8px 10px', fontSize:13,
                      }}
                    >
                      <option value="">Bitte wählen…</option>
                      {KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize:11, fontWeight:700, opacity:0.6, display:'block', marginBottom:5 }}>ZUSAMMENFASSUNG</label>
                  <input
                    value={fields.zusammenfassung}
                    onChange={e => setFields(f => ({ ...f, zusammenfassung: e.target.value }))}
                    style={{
                      width:'100%', background: darkMode ? '#0f172a' : '#f8fafc',
                      border:`1px solid ${bord}`, color:text,
                      borderRadius:8, padding:'8px 10px', fontSize:13, boxSizing:'border-box',
                    }}
                  />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, opacity:0.6, display:'block', marginBottom:5 }}>PRIORITÄT</label>
                    <select
                      value={fields.prioritaet}
                      onChange={e => setFields(f => ({ ...f, prioritaet: e.target.value }))}
                      style={{
                        width:'100%', background: darkMode ? '#0f172a' : '#f8fafc',
                        border:`1px solid ${fields.prioritaet === 'hoch' ? '#ef4444' : fields.prioritaet === 'mittel' ? '#f59e0b' : '#22c55e'}`,
                        color:text, borderRadius:8, padding:'8px 10px', fontSize:13,
                      }}
                    >
                      <option value="hoch">🔴 Hoch</option>
                      <option value="mittel">🟡 Mittel</option>
                      <option value="niedrig">🟢 Niedrig</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, opacity:0.6, display:'block', marginBottom:5 }}>TERMIN</label>
                    <input
                      type="datetime-local"
                      value={fields.termin}
                      onChange={e => setFields(f => ({ ...f, termin: e.target.value }))}
                      style={{
                        width:'100%', background: darkMode ? '#0f172a' : '#f8fafc',
                        border:`1px solid ${bord}`, color:text,
                        borderRadius:8, padding:'8px 10px', fontSize:13, boxSizing:'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize:11, fontWeight:700, opacity:0.6, display:'block', marginBottom:5 }}>AUFGABE (optional)</label>
                  <input
                    value={fields.aufgabe}
                    onChange={e => setFields(f => ({ ...f, aufgabe: e.target.value }))}
                    placeholder="Konkrete nächste Aktion…"
                    style={{
                      width:'100%', background: darkMode ? '#0f172a' : '#f8fafc',
                      border:`1px solid ${bord}`, color:text,
                      borderRadius:8, padding:'8px 10px', fontSize:13, boxSizing:'border-box',
                    }}
                  />
                </div>

              </div>

              {/* Konfidenz */}
              <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
                <FieldTag label="KI-Konfidenz" value={`${Math.round(fields.confidence * 100)}%`} color={fields.confidence >= 0.8 ? '#16a34a' : '#d97706'} />
                {fields.stimmung && <FieldTag label="Stimmung" value={fields.stimmung} color="#7c3aed" />}
              </div>

              {/* Buttons */}
              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                <button onClick={saveNote} style={{
                  flex:1, background:'linear-gradient(135deg,#1f5b3c,#2d7a54)',
                  border:'none', color:'white',
                  borderRadius:12, padding:'14px', fontWeight:700, fontSize:15, cursor:'pointer',
                  boxShadow:'0 4px 16px rgba(31,91,60,0.4)',
                }}>
                  ✓ Bestätigen & Speichern
                </button>
                <button onClick={() => { setStage('idle'); setTranscript(''); setStatusMsg('') }} style={{
                  background:'none', border:`1px solid ${bord}`, color:text,
                  borderRadius:12, padding:'14px 16px', fontSize:13, cursor:'pointer',
                }}>
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* DONE */}
          {isDone && (
            <div style={{ padding:'20px 0' }}>
              <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
              <div style={{ fontWeight:800, fontSize:18, color:'#22c55e', marginBottom:6 }}>Notiz gespeichert!</div>
              <div style={{ fontSize:13, opacity:0.6 }}>
                {fields.aufgabe ? 'Notiz + Task wurden erstellt' : 'Notiz + KI-Analyse gespeichert'}
              </div>
            </div>
          )}

          {/* Error */}
          {statusMsg && isIdle && (
            <div style={{
              marginTop:16, background:'rgba(239,68,68,0.1)',
              border:'1px solid #ef4444', borderRadius:10,
              padding:'10px 16px', fontSize:13, color:'#ef4444',
            }}>{statusMsg}</div>
          )}
        </div>

        {/* ── BEISPIELE ── */}
        {isIdle && (
          <div style={{
            background:card, borderRadius:14, padding:'18px',
            marginBottom:20, border:`1px solid ${bord}`,
          }}>
            <div style={{ fontSize:10, fontWeight:700, opacity:0.4, marginBottom:10, letterSpacing:1 }}>
              💡 BEISPIELE (Deutsch, Englisch, Türkisch…)
            </div>
            {[
              { icon:'🇩🇪', text:'"Frau Müller hatte heute Knieschmerzen, bitte Arzt informieren"' },
              { icon:'🇬🇧', text:'"Mr. Fischer\'s blood pressure was 160/90, pulse 88"' },
              { icon:'🇹🇷', text:'"Bayan Schmidt sabah ilaçlarını almadı, lütfen kontrol edin"' },
              { icon:'🇩🇪', text:'"Morgen 14 Uhr Physiotherapie Zimmer 203 einplanen"' },
            ].map((tip, i) => (
              <div key={i} style={{
                display:'flex', gap:10, fontSize:12, opacity:0.7,
                padding:'5px 0', borderBottom: i < 3 ? `1px solid ${bord}44` : 'none',
              }}>
                <span>{tip.icon}</span>
                <span>{tip.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── NOTIZEN LISTE ── */}
        <div style={{ background:card, borderRadius:14, border:`1px solid ${bord}`, overflow:'hidden' }}>
          <div style={{
            padding:'14px 18px', borderBottom:`1px solid ${bord}`,
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <div style={{ fontWeight:700, fontSize:12 }}>🎙 SPRACHNOTIZEN ({notes.length})</div>
            <a href="/dashboard" style={{ fontSize:11, color:'#4caf82', fontWeight:600, textDecoration:'none' }}>
              Dashboard →
            </a>
          </div>
          {loadingNotes && <div style={{ padding:28, textAlign:'center', opacity:0.4, fontSize:13 }}>Lädt…</div>}
          {!loadingNotes && notes.length === 0 && (
            <div style={{ padding:36, textAlign:'center', opacity:0.4 }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🎙</div>
              Noch keine Notizen – starte die erste Aufnahme!
            </div>
          )}
          {notes.slice(0, 8).map((n, i) => (
            <div key={n.id} style={{
              padding:'12px 18px',
              borderBottom: i < Math.min(notes.length, 8) - 1 ? `1px solid ${bord}44` : 'none',
              display:'flex', gap:10, alignItems:'flex-start',
            }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#1f5b3c', flexShrink:0, marginTop:5 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, lineHeight:1.6, opacity:0.85 }}>{n.transcript}</div>
                <div style={{ fontSize:10, opacity:0.35, marginTop:3 }}>
                  {new Date(n.created_at).toLocaleString('de-DE')}
                </div>
              </div>
            </div>
          ))}
          {notes.length > 8 && (
            <div style={{ padding:'10px 18px', fontSize:11, opacity:0.4, textAlign:'center' }}>
              +{notes.length - 8} weitere im Dashboard
            </div>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:18, fontSize:10, opacity:0.25 }}>
          E-Voila Pflege · v2.1 · Alle Sprachen · DSGVO-konform
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4),0 8px 24px rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 24px rgba(239,68,68,0),0 8px 24px rgba(239,68,68,0.2); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        input, select { outline: none; }
        input:focus, select:focus { border-color: #1f5b3c !important; }
      `}</style>
    </div>
  )
}
