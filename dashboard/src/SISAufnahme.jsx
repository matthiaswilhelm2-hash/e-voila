import { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)
const PROXY = 'http://localhost:3001'

// ── 5 SIS-Kernfelder für MVP ────────────────────────────────
const STEPS = [
  {
    id: 'grunddaten', nr: 1, title: 'Grunddaten', icon: '👤',
    accent: '#1f5b3c',
    frage: 'Wie heißen Sie? Wann wurden Sie geboren? Welchen Pflegegrad haben Sie?',
    hinweis: 'Name · Geburtsdatum · Pflegegrad · Zimmernummer',
    fields: [
      { key: 'name',         label: 'Vollständiger Name',  type: 'text',   required: true,  ph: 'Vor- und Nachname' },
      { key: 'geburtsdatum', label: 'Geburtsdatum',        type: 'date',   required: false, ph: '' },
      { key: 'pflegegrad',   label: 'Pflegegrad',          type: 'select', required: false, options: ['1','2','3','4','5'] },
      { key: 'zimmer',       label: 'Zimmer',              type: 'text',   required: false, ph: 'z. B. 101' },
    ],
  },
  {
    id: 'hauptanliegen', nr: 2, title: 'Was bewegt Sie?', icon: '💬',
    accent: '#1d4ed8',
    frage: 'Was bewegt Sie? Was ist Ihnen in Ihrer Pflege besonders wichtig?',
    hinweis: 'SIS-Schlüsselfrage · persönliche Wünsche · Erwartungen',
    fields: [
      { key: 'was_bewegt_sie', label: 'Hauptanliegen & Wünsche', type: 'textarea', required: true, ph: 'Was der Patient/die Patientin sagt…' },
    ],
  },
  {
    id: 'gesundheit', nr: 3, title: 'Gesundheit', icon: '🏥',
    accent: '#dc2626',
    frage: 'Welche Erkrankungen haben Sie? Nehmen Sie Medikamente? Haben Sie Allergien?',
    hinweis: 'Diagnosen · Allergien · aktuelle Medikamente',
    fields: [
      { key: 'diagnosen',   label: 'Diagnosen / Erkrankungen', type: 'textarea', required: false, ph: 'Hauptdiagnosen…' },
      { key: 'allergien',   label: 'Allergien',                type: 'text',     required: false, ph: 'z. B. Penicillin, Latex' },
      { key: 'medikamente', label: 'Medikamente',              type: 'textarea', required: false, ph: 'Aktuelle Medikation…' },
    ],
  },
  {
    id: 'mobilitaet', nr: 4, title: 'Mobilität', icon: '🚶',
    accent: '#d97706',
    frage: 'Wie ist Ihre Beweglichkeit? Können Sie sich selbst versorgen?',
    hinweis: 'Gehfähigkeit · Selbstversorgung · Kognition',
    fields: [
      { key: 'mobilitaet',       label: 'Mobilität',        type: 'select', required: false, options: ['gehfähig','eingeschränkt','rollstuhlpflichtig','bettlägerig'] },
      { key: 'selbstversorgung', label: 'Selbstversorgung', type: 'select', required: false, options: ['selbstständig','teilweise','vollständig abhängig'] },
      { key: 'kognition',        label: 'Kognition',        type: 'select', required: false, options: ['orientiert','leicht eingeschränkt','stark eingeschränkt','dement'] },
    ],
  },
  {
    id: 'kontakt', nr: 5, title: 'Kontakt & Versicherung', icon: '📋',
    accent: '#7c3aed',
    frage: 'Wer ist Ihr Notfallkontakt? Bei welcher Krankenkasse sind Sie versichert? Haben Sie einen Hausarzt?',
    hinweis: 'Notfallkontakt · Krankenkasse · Hausarzt',
    fields: [
      { key: 'notfallkontakt', label: 'Notfallkontakt',  type: 'text', required: false, ph: 'Name + Telefon' },
      { key: 'versicherung',   label: 'Krankenkasse',    type: 'text', required: false, ph: 'z. B. AOK Bayern' },
      { key: 'arzt',           label: 'Hausarzt',        type: 'text', required: false, ph: 'Dr. …' },
    ],
  },
]

function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="url(#sisGrad)"/>
      <rect x="15" y="8" width="10" height="14" rx="5" fill="white" opacity=".95"/>
      <path d="M11 19c0 5 4 9 9 9s9-4 9-9" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".95"/>
      <line x1="20" y1="28" x2="20" y2="33" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="15" y1="33" x2="25" y2="33" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 22h3l2-4 2 7 2-10 2 7 2-4 3 4h3" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <defs>
        <linearGradient id="sisGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1f5b3c"/><stop offset="100%" stopColor="#0d3d29"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function SISAufnahme() {
  const [stepIdx,    setStepIdx]    = useState(0)
  const [data,       setData]       = useState({})
  const [doneSteps,  setDoneSteps]  = useState({}) // welche Steps haben AI-Daten
  const [recStage,   setRecStage]   = useState('idle') // idle|recording|processing
  const [recSec,     setRecSec]     = useState(0)
  const [transcript, setTranscript] = useState('')
  const [error,      setError]      = useState('')
  const [savedId,    setSavedId]    = useState(null)
  const [saving,     setSaving]     = useState(false)

  const mrRef     = useRef(null)
  const chunksRef = useRef([])
  const timerRef  = useRef(null)

  const totalSteps = STEPS.length
  const isReview   = stepIdx === totalSteps
  const isDone     = !!savedId
  const step       = !isReview ? STEPS[stepIdx] : null

  // ── Felder ─────────────────────────────────────────────────
  function setField(key, val) {
    setData(d => ({ ...d, [key]: val }))
  }

  // ── Aufnahme ────────────────────────────────────────────────
  async function startRec() {
    setError(''); setTranscript('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')  ? 'audio/mp4' : ''
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => processVoice(STEPS[stepIdx].id)
      mr.start(100)
      mrRef.current = mr
      setRecSec(0)
      timerRef.current = setInterval(() => setRecSec(s => s + 1), 1000)
      setRecStage('recording')
    } catch {
      setError('Mikrofon-Zugriff verweigert. Bitte Berechtigung erteilen.')
    }
  }

  function stopRec() {
    clearInterval(timerRef.current)
    const mr = mrRef.current
    if (mr && mr.state !== 'inactive') {
      setRecStage('processing')
      mr.stop()
      mr.stream.getTracks().forEach(t => t.stop())
    }
  }

  // ── Verarbeitung ─────────────────────────────────────────────
  async function processVoice(stepId) {
    const chunks = chunksRef.current
    if (!chunks.length) { setRecStage('idle'); return }
    const mime = mrRef.current?.mimeType || 'audio/webm'
    const ext  = mime.includes('mp4') ? 'mp4' : 'webm'
    const blob = new Blob(chunks, { type: mime })
    if (blob.size < 500) {
      setError('Aufnahme zu kurz – bitte mindestens 1 Sekunde sprechen.')
      setRecStage('idle'); return
    }
    try {
      // 1. Whisper STT
      const fd = new FormData()
      fd.append('file', new File([blob], `rec.${ext}`, { type: mime }))
      const sttRes  = await fetch(`${PROXY}/api/whisper`, { method: 'POST', body: fd })
      if (!sttRes.ok) throw new Error('Spracherkennung fehlgeschlagen')
      const sttData = await sttRes.json()
      const text    = sttData.text?.trim() || sttData.transcript?.trim()
      if (!text) throw new Error('Kein Text erkannt – bitte deutlicher sprechen.')
      setTranscript(text)

      // 2. KI-Extraktion
      const extRes  = await fetch(`${PROXY}/api/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, step: stepId, context: data }),
      })
      if (!extRes.ok) throw new Error('KI-Extraktion fehlgeschlagen')
      const { extracted } = await extRes.json()

      setData(d => {
        const merged = { ...d }
        Object.entries(extracted).forEach(([k, v]) => {
          if (v !== null && v !== undefined && v !== '') merged[k] = v
        })
        return merged
      })
      setDoneSteps(d => ({ ...d, [stepId]: true }))
      setRecStage('idle')
    } catch (err) {
      setError(err.message)
      setRecStage('idle')
    }
  }

  // ── Speichern ────────────────────────────────────────────────
  async function savePatient() {
    setSaving(true); setError('')
    const resident = {
      name:              data.name             || 'Unbekannt',
      birth_date:        data.geburtsdatum     || null,
      care_level:        data.pflegegrad       ? parseInt(data.pflegegrad) : null,
      room:              data.zimmer           || null,
      doctor:            data.arzt             || null,
      emergency_contact: data.notfallkontakt   || null,
      insurance:         data.versicherung     || null,
      allergies:         data.allergien        || null,
      medications_info:  data.medikamente      || null,
      status:            'aufnahme',
      sis_data: {
        was_bewegt_sie:    data.was_bewegt_sie    || null,
        diagnosen:         data.diagnosen         || null,
        mobilitaet:        data.mobilitaet        || null,
        selbstversorgung:  data.selbstversorgung  || null,
        kognition:         data.kognition         || null,
      },
    }
    const { data: res, error: e } = await supabase
      .from('residents').insert([resident]).select().single()
    setSaving(false)
    if (e) { setError(`Fehler beim Speichern: ${e.message}`); return }
    setSavedId(res.id)
  }

  // ── Render-Hilfen ─────────────────────────────────────────────
  const fmtSec = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  const inp = { width: '100%', boxSizing: 'border-box', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1e293b', outline: 'none' }
  const sel = { ...inp, cursor: 'pointer' }

  // ── FERTIG ───────────────────────────────────────────────────
  if (isDone) return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 480, width: '100%', margin: 20, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#16a34a', marginBottom: 8 }}>Aufnahme gespeichert!</div>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 6 }}>
          <strong>{data.name}</strong> wurde erfolgreich erfasst.
        </div>
        {data.pflegegrad && <div style={{ fontSize: 13, color: '#94a3b8' }}>Pflegegrad {data.pflegegrad} · {data.zimmer ? `Zimmer ${data.zimmer}` : 'Zimmer noch nicht zugewiesen'}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'center' }}>
          <button onClick={() => window.print()} style={{ background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🖨️ Drucken / PDF
          </button>
          <a href="/dashboard" style={{ background: '#1f5b3c', color: 'white', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            📊 Zum Dashboard
          </a>
          <button onClick={() => { setSavedId(null); setStepIdx(0); setData({}); setDoneSteps({}) }} style={{ background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ＋ Neue Aufnahme
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* ── HEADER ── */}
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logo size={32} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', letterSpacing: -0.3 }}>E-Voila Pflege</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>SIS Patientenaufnahme</div>
          </div>
        </a>
        <nav style={{ display: 'flex', gap: 8 }}>
          <a href="/notiz" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: 7, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>🎙 Notiz</a>
          <a href="/dashboard" style={{ background: '#1f5b3c', color: 'white', padding: '6px 14px', borderRadius: 7, textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>📊 Dashboard</a>
        </nav>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>

        {/* ── FORTSCHRITTSBALKEN ── */}
        <div style={{ background: 'white', borderRadius: 14, padding: '16px 20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5 }}>SIS AUFNAHME</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {isReview ? 'Überprüfung' : `Schritt ${stepIdx + 1} von ${totalSteps}`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                onClick={() => { if (recStage === 'idle') setStepIdx(i) }}>
                <div style={{
                  width: '100%', height: 5, borderRadius: 3,
                  background: i < stepIdx || isReview ? '#1f5b3c'
                    : i === stepIdx ? '#86efac'
                    : '#e2e8f0',
                  transition: 'background 0.3s',
                }}/>
                <div style={{ fontSize: 9, color: i === stepIdx && !isReview ? '#1f5b3c' : '#94a3b8', fontWeight: i === stepIdx ? 700 : 400 }}>
                  {doneSteps[s.id] ? '✓' : s.nr}
                </div>
              </div>
            ))}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', height: 5, borderRadius: 3, background: isReview ? '#1f5b3c' : '#e2e8f0', transition: 'background 0.3s' }}/>
              <div style={{ fontSize: 9, color: isReview ? '#1f5b3c' : '#94a3b8', fontWeight: isReview ? 700 : 400 }}>✓</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {STEPS.map(s => (
              <div key={s.id} style={{ flex: 1, fontSize: 8, color: '#94a3b8', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {s.icon} {s.title}
              </div>
            ))}
            <div style={{ flex: 1, fontSize: 8, color: '#94a3b8', textAlign: 'center' }}>Speichern</div>
          </div>
        </div>

        {/* ── SCHRITT-CARD ── */}
        {!isReview && step && (
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 16 }}>

            {/* Farbiger Header */}
            <div style={{ background: `linear-gradient(135deg, ${step.accent}, ${step.accent}dd)`, padding: '18px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{step.icon}</div>
                <div>
                  <div style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>Schritt {step.nr}: {step.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>{step.hinweis}</div>
                </div>
              </div>

              {/* Frage an den Patienten */}
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontWeight: 600, letterSpacing: 0.5 }}>FRAGE AN DEN PATIENTEN / DIE PATIENTIN</div>
                <div style={{ fontSize: 14, color: 'white', fontStyle: 'italic', lineHeight: 1.5, fontWeight: 500 }}>
                  „{step.frage}"
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>

              {/* ── SPRACH-BUTTON ── */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                {recStage === 'idle' && (
                  <div>
                    <button onClick={startRec} style={{
                      background: `linear-gradient(135deg, ${step.accent}, ${step.accent}cc)`,
                      color: 'white', border: 'none', borderRadius: 40,
                      padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      boxShadow: `0 4px 16px ${step.accent}44`,
                    }}>
                      🎙 Antwort aufnehmen
                    </button>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>
                      Alle Sprachen · Alle Akzente · KI extrahiert automatisch
                    </div>
                  </div>
                )}
                {recStage === 'recording' && (
                  <div>
                    <button onClick={stopRec} style={{
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      color: 'white', border: 'none', borderRadius: 40,
                      padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      animation: 'recPulse 1.5s ease-in-out infinite',
                    }}>
                      ⏹ Stoppen · {fmtSec(recSec)}
                    </button>
                    <div style={{ fontSize: 10, color: '#ef4444', marginTop: 6 }}>Aufnahme läuft…</div>
                  </div>
                )}
                {recStage === 'processing' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: step.accent, opacity: 0.3, animation: `dotBounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>KI extrahiert Daten…</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>Whisper · GPT-4o-mini</div>
                  </div>
                )}
              </div>

              {/* Transkript (wenn vorhanden) */}
              {transcript && doneSteps[step.id] && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                  🎙 <span style={{ color: '#1e293b' }}>„{transcript}"</span>
                </div>
              )}

              {/* Felder */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {step.fields.map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>
                      {f.label.toUpperCase()}{f.required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
                      {data[f.key] && doneSteps[step.id] && <span style={{ color: '#16a34a', marginLeft: 6, fontWeight: 400 }}>✓ erkannt</span>}
                    </label>
                    {f.type === 'select' ? (
                      <select value={data[f.key] || ''} onChange={e => setField(f.key, e.target.value)} style={sel}>
                        <option value="">— bitte wählen —</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea value={data[f.key] || ''} onChange={e => setField(f.key, e.target.value)}
                        placeholder={f.ph} rows={3}
                        style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
                    ) : (
                      <input type={f.type} value={data[f.key] || ''} onChange={e => setField(f.key, e.target.value)}
                        placeholder={f.ph} style={inp} />
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ marginTop: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626' }}>
                  ⚠ {error}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div style={{ padding: '14px 24px 20px', display: 'flex', gap: 10 }}>
              {stepIdx > 0 && (
                <button onClick={() => { setStepIdx(s => s - 1); setError(''); setTranscript('') }}
                  style={{ background: 'none', border: '1.5px solid #e2e8f0', color: '#64748b', borderRadius: 10, padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                  ← Zurück
                </button>
              )}
              <button onClick={() => { setStepIdx(s => s + 1); setError(''); setTranscript('') }}
                style={{ flex: 1, background: step.accent, color: 'white', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {stepIdx < totalSteps - 1 ? 'Weiter →' : 'Zur Überprüfung →'}
              </button>
            </div>
          </div>
        )}

        {/* ── ÜBERPRÜFUNG + SPEICHERN ── */}
        {isReview && (
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 16 }}>

            <div style={{ background: 'linear-gradient(135deg, #1f5b3c, #0d3d29)', padding: '18px 24px' }}>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 16, marginBottom: 4 }}>✅ Überprüfung & Speichern</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Bitte alle Felder prüfen und ggf. korrigieren</div>
            </div>

            <div style={{ padding: '20px 24px' }}>

              {/* Zusammenfassung */}
              {data.name && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#15803d' }}>{data.name}</div>
                  <div style={{ fontSize: 12, color: '#166534', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                    {data.geburtsdatum && <span>📅 {new Date(data.geburtsdatum).toLocaleDateString('de-DE')}</span>}
                    {data.pflegegrad   && <span>🏥 Pflegegrad {data.pflegegrad}</span>}
                    {data.zimmer       && <span>🚪 Zimmer {data.zimmer}</span>}
                    {data.mobilitaet   && <span>🚶 {data.mobilitaet}</span>}
                  </div>
                </div>
              )}

              {/* Alle Felder gruppiert */}
              {STEPS.map(s => (
                <div key={s.id} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{s.icon}</span> {s.title.toUpperCase()}
                    {doneSteps[s.id] && <span style={{ color: '#16a34a', fontWeight: 400 }}>· via Sprache erfasst</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: s.fields.length === 1 ? '1fr' : '1fr 1fr', gap: 10 }}>
                    {s.fields.map(f => (
                      <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? '1 / -1' : 'auto' }}>
                        <label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>{f.label}</label>
                        {f.type === 'textarea' ? (
                          <textarea value={data[f.key] || ''} onChange={e => setField(f.key, e.target.value)}
                            rows={2} style={{ ...inp, resize: 'none' }} placeholder={f.ph} />
                        ) : f.type === 'select' ? (
                          <select value={data[f.key] || ''} onChange={e => setField(f.key, e.target.value)} style={sel}>
                            <option value="">—</option>
                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input type={f.type} value={data[f.key] || ''} onChange={e => setField(f.key, e.target.value)}
                            placeholder={f.ph} style={inp} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {!data.name && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#dc2626', marginBottom: 16 }}>
                  ⚠ Bitte mindestens den Namen des Patienten / der Patientin angeben.
                </div>
              )}

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#dc2626', marginBottom: 16 }}>
                  ⚠ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setStepIdx(totalSteps - 1); setError('') }}
                  style={{ background: 'none', border: '1.5px solid #e2e8f0', color: '#64748b', borderRadius: 10, padding: '12px 16px', fontSize: 13, cursor: 'pointer' }}>
                  ← Zurück
                </button>
                <button onClick={savePatient} disabled={saving || !data.name}
                  style={{ flex: 1, background: data.name ? '#1f5b3c' : '#94a3b8', color: 'white', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 700, fontSize: 14, cursor: data.name ? 'pointer' : 'not-allowed', boxShadow: data.name ? '0 4px 12px rgba(31,91,60,0.25)' : 'none' }}>
                  {saving ? '💾 Wird gespeichert…' : '✓ Aufnahme abschließen & speichern'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Datenschutz-Hinweis */}
        <div style={{ textAlign: 'center', fontSize: 10, color: '#cbd5e1', marginTop: 8 }}>
          🔒 DSGVO-konform · Daten verschlüsselt in Supabase (EU) gespeichert
        </div>

      </main>

      {/* Print-Ansicht (für SIS-Ausdruck) */}
      <div className="print-only" style={{ display: 'none' }}>
        <h1>SIS Aufnahme – {data.name}</h1>
        <p>Datum: {new Date().toLocaleDateString('de-DE')}</p>
        {STEPS.map(s => (
          <div key={s.id} style={{ marginBottom: 16 }}>
            <h3>{s.icon} {s.title}</h3>
            {s.fields.map(f => (
              <p key={f.key}><strong>{f.label}:</strong> {data[f.key] || '—'}</p>
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes recPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4), 0 4px 16px rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 0 14px rgba(239,68,68,0), 0 4px 16px rgba(239,68,68,0.1); }
        }
        @keyframes dotBounce {
          0%,80%,100% { transform: scale(1); opacity: 0.3; }
          40% { transform: scale(1.5); opacity: 1; }
        }
        input:focus, select:focus, textarea:focus {
          border-color: #1f5b3c !important;
          box-shadow: 0 0 0 3px rgba(31,91,60,0.1);
        }
        @media print {
          header, main > *:not(.print-only) { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>
    </div>
  )
}
