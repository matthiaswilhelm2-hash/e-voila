import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

const PROXY = 'http://localhost:3001'

function App() {
  const [notes, setNotes]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [recording, setRecording]   = useState(false)
  const [processing, setProcessing] = useState(false)
  const [darkMode, setDarkMode]     = useState(true)
  const [status, setStatus]         = useState('')
  const mediaRecorder               = useRef(null)
  const chunks                      = useRef([])

  useEffect(() => { fetchNotes() }, [])

  async function fetchNotes() {
    const { data } = await supabase
      .from('voice_notes')
      .select('*')
      .order('created_at', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunks.current = []

      // ✅ FIX: Bestes Format für Whisper wählen
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''

      mediaRecorder.current = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorder.current.ondataavailable = e => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }
      mediaRecorder.current.onstop = handleStop
      mediaRecorder.current.start(100) // alle 100ms ein chunk
      setRecording(true)
      setStatus('🎙 Aufnahme läuft... (zum Stoppen nochmal klicken)')
    } catch (err) {
      alert('Mikrofon-Zugriff verweigert: ' + err.message)
    }
  }

  function stopRecording() {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop())
      setRecording(false)
      setStatus('⏳ Verarbeite Aufnahme...')
    }
  }

  async function handleStop() {
    if (chunks.current.length === 0) {
      setStatus('❌ Keine Audiodaten – bitte nochmal versuchen')
      setProcessing(false)
      return
    }

    setProcessing(true)
    try {
      // ✅ FIX: Richtiges Format erkennen
      const mimeType = mediaRecorder.current?.mimeType || 'audio/webm'
      const extension = mimeType.includes('mp4') ? 'mp4'
        : mimeType.includes('ogg') ? 'ogg'
        : 'webm'

      const blob = new Blob(chunks.current, { type: mimeType })

      if (blob.size < 1000) {
        throw new Error('Aufnahme zu kurz – bitte länger sprechen')
      }

      const file = new File([blob], `aufnahme.${extension}`, { type: mimeType })

      // 1. Whisper STT → über Proxy
      setStatus('🤖 Spracherkennung läuft...')
      const formData = new FormData()
      formData.append('file', file, `aufnahme.${extension}`)
      formData.append('model', 'whisper-1')
      formData.append('language', 'de')

      const sttRes = await fetch(`${PROXY}/api/whisper`, {
        method: 'POST',
        body: formData,
      })

      if (!sttRes.ok) {
        const errText = await sttRes.text()
        throw new Error(`Whisper Fehler: ${errText}`)
      }

      const sttData = await sttRes.json()
      const transcript = sttData.text?.trim()

      if (!transcript) {
        throw new Error('Keine Transkription – bitte deutlicher sprechen')
      }

      // 2. Notiz in Supabase speichern
      setStatus('💾 Speichere Notiz...')
      const { data: note, error: noteErr } = await supabase
        .from('voice_notes')
        .insert([{ transcript, status: 'neu' }])
        .select()
        .single()

      if (noteErr) throw new Error(noteErr.message)

      // 3. KI Analyse → über Proxy
      setStatus('🧠 KI analysiert Pflegenotiz...')
      const aiRes = await fetch(`${PROXY}/api/gpt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: `Du bist ein KI-Assistent für ein Pflegeheim.
Analysiere die Sprachnotiz und extrahiere strukturierte Informationen.
Antworte NUR mit validem JSON ohne Markdown:
{
  "kategorie": "Task|Medikation|Vitalzeichen|Sturz|Wunde|Angehörige|Arzttermin|Sonstiges",
  "zusammenfassung": "kurze Zusammenfassung auf Deutsch max 100 Zeichen",
  "prioritaet": "hoch|mittel|niedrig",
  "stimmung": "positiv|neutral|negativ|dringend",
  "bewohner": "Name des Bewohners oder null",
  "aufgabe": "konkrete Aufgabe oder null",
  "termin": "ISO Datum/Uhrzeit oder null",
  "confidence": 0.95
}`
          }, {
            role: 'user',
            content: `Analysiere diese Pflegenotiz: "${transcript}"`
          }],
          temperature: 0.2,
        }),
      })

      if (!aiRes.ok) throw new Error('KI-Analyse fehlgeschlagen')

      const aiData = await aiRes.json()
      let analysis = {}
      try {
        const raw = aiData.choices[0].message.content
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        analysis = JSON.parse(cleaned)
      } catch {
        analysis = {
          kategorie: 'Sonstiges',
          zusammenfassung: transcript.slice(0, 100),
          prioritaet: 'mittel',
          stimmung: 'neutral',
          confidence: 0.5
        }
      }

      // 4. Analyse in Supabase speichern
      await supabase.from('ai_analysis').insert([{
        voice_note_id:   note.id,
        kategorie:       analysis.kategorie      || 'Sonstiges',
        zusammenfassung: analysis.zusammenfassung || transcript.slice(0, 100),
        prioritaet:      analysis.prioritaet     || 'mittel',
        stimmung:        analysis.stimmung       || 'neutral',
        confidence:      analysis.confidence     || 0.8,
      }])

      // 5. Auto-Task wenn Aufgabe erkannt
      const taskKategorien = ['Task', 'Medikation', 'Arzttermin', 'Sturz', 'Wunde']
      if (analysis.aufgabe || taskKategorien.includes(analysis.kategorie)) {
        await supabase.from('tasks').insert([{
          titel:        analysis.aufgabe || analysis.zusammenfassung,
          beschreibung: transcript,
          prioritaet:   analysis.prioritaet || 'mittel',
          status:       'offen',
          kategorie:    analysis.kategorie,
          bewohner:     analysis.bewohner || null,
          due_date:     analysis.termin
            ? new Date(analysis.termin).toISOString()
            : null,
        }])
        setStatus('✅ Notiz gespeichert + KI-Analyse + Task automatisch erstellt!')
      } else {
        setStatus('✅ Notiz gespeichert + KI-Analyse abgeschlossen!')
      }

      await fetchNotes()
      setTimeout(() => setStatus(''), 5000)

    } catch (err) {
      console.error('Fehler:', err)
      setStatus(`❌ ${err.message}`)
      setTimeout(() => setStatus(''), 7000)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: darkMode ? '#0f172a' : '#f1f5f9',
      color: darkMode ? '#f1f5f9' : '#1a1d23',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      transition: 'all 0.3s',
    }}>

      {/* HEADER */}
      <div style={{
        background: darkMode ? '#1e293b' : '#fff',
        borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
        padding: '0 20px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 8px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#1f5b3c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 14,
          }}>EV.</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>E-Voila Pflege</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>KI-gestützte Sprachdokumentation</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="/dashboard" style={{
            background: '#1f5b3c', color: 'white',
            padding: '7px 14px', borderRadius: 8,
            textDecoration: 'none', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>📊 Dashboard</a>
          <button onClick={() => setDarkMode(!darkMode)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, padding: 4,
          }}>{darkMode ? '☀️' : '🌙'}</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '30px 20px' }}>

        {/* AUFNAHME CARD */}
        <div style={{
          background: darkMode ? '#1e293b' : '#fff',
          borderRadius: 20, padding: '40px 24px', textAlign: 'center',
          marginBottom: 24,
          border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          <div style={{
            display: 'inline-block',
            background: '#1f5b3c22', color: '#4caf82',
            padding: '4px 12px', borderRadius: 999,
            fontSize: 11, fontWeight: 700, marginBottom: 16, letterSpacing: 1,
          }}>
            🤖 KI-GESTÜTZTE PFLEGEDOKUMENTATION
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>
            Neue Sprachnotiz
          </h2>
          <p style={{ fontSize: 14, opacity: 0.6, margin: '0 0 32px' }}>
            Drücke den Button und sprich einfach drauflos.<br/>
            Die KI erkennt automatisch Tasks, Vitalwerte & mehr.
          </p>

          {/* RECORD BUTTON */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={processing}
              style={{
                width: 90, height: 90, borderRadius: '50%', border: 'none',
                cursor: processing ? 'not-allowed' : 'pointer',
                background: recording
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : processing
                  ? '#64748b'
                  : 'linear-gradient(135deg, #1f5b3c, #2d7a54)',
                color: 'white', fontSize: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto',
                boxShadow: recording
                  ? '0 0 0 16px rgba(239,68,68,0.15), 0 8px 24px rgba(239,68,68,0.4)'
                  : processing
                  ? 'none'
                  : '0 8px 24px rgba(31,91,60,0.5)',
                transition: 'all 0.3s',
                animation: recording ? 'pulse 1.5s infinite' : 'none',
              }}
            >
              {processing ? '⏳' : recording ? '⏹' : '🎙'}
            </button>
          </div>

          {/* STATUS */}
          {status ? (
            <div style={{
              background: status.includes('✅')
                ? 'rgba(34,197,94,0.1)'
                : status.includes('❌')
                ? 'rgba(239,68,68,0.1)'
                : darkMode ? '#0f172a' : '#f8fafc',
              border: `1px solid ${
                status.includes('✅') ? '#22c55e'
                : status.includes('❌') ? '#ef4444'
                : darkMode ? '#334155' : '#e2e8f0'
              }`,
              borderRadius: 10, padding: '12px 20px',
              fontSize: 13, fontWeight: 600,
              color: status.includes('✅') ? '#22c55e'
                : status.includes('❌') ? '#ef4444'
                : 'inherit',
            }}>
              {status}
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.4 }}>
              {recording ? '🔴 Aufnahme läuft – klicke zum Stoppen'
                : '🎙 Klicke zum Starten der Aufnahme'}
            </div>
          )}
        </div>

        {/* TIPPS */}
        <div style={{
          background: darkMode ? '#1e293b' : '#fff',
          borderRadius: 14, padding: '20px',
          marginBottom: 24,
          border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, opacity: 0.5,
            marginBottom: 12, letterSpacing: 1,
          }}>
            💡 BEISPIELE – WAS DU SAGEN KANNST
          </div>
          {[
            { icon: '🏥', text: '„Frau Müller hatte heute Schmerzen im Knie, bitte Arzt informieren"' },
            { icon: '💊', text: '„Herr Fischer Blutdruck 160/90, Puls 88, Temperatur 37,2"' },
            { icon: '📅', text: '„Morgen um 14 Uhr Physiotherapie für Zimmer 203 einplanen"' },
            { icon: '⚠️', text: '„Medikament Metformin für Frau Schmidt vergessen – nachgeben"' },
          ].map((tip, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              fontSize: 12, opacity: 0.75, padding: '6px 0',
              borderBottom: i < 3 ? `1px solid ${darkMode ? '#1e293b55' : '#f1f5f9'}` : 'none',
            }}>
              <span>{tip.icon}</span>
              <span>{tip.text}</span>
            </div>
          ))}
        </div>

        {/* NOTIZEN LISTE */}
        <div style={{
          background: darkMode ? '#1e293b' : '#fff',
          borderRadius: 14,
          border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              🎙 SPRACHNOTIZEN ({notes.length})
            </div>
            <a href="/dashboard" style={{
              fontSize: 11, color: '#4caf82', fontWeight: 600, textDecoration: 'none',
            }}>Im Dashboard anzeigen →</a>
          </div>

          {loading && (
            <div style={{ padding: 32, textAlign: 'center', opacity: 0.5 }}>
              Lädt...
            </div>
          )}
          {!loading && notes.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎙</div>
              Noch keine Notizen – nimm deine erste auf!
            </div>
          )}

          {notes.map((n, i) => (
            <div key={n.id} style={{
              padding: '14px 20px',
              borderBottom: i < notes.length - 1
                ? `1px solid ${darkMode ? '#1e293b' : '#f8fafc'}`
                : 'none',
              display: 'flex', gap: 12, alignItems: 'flex-start',
              transition: 'background 0.15s',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#1f5b3c', flexShrink: 0, marginTop: 6,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.9 }}>
                  {n.transcript}
                </div>
                <div style={{
                  fontSize: 10, opacity: 0.4, marginTop: 4,
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <span>{new Date(n.created_at).toLocaleString('de-DE')}</span>
                  {n.status && (
                    <span style={{
                      background: '#1f5b3c22', color: '#4caf82',
                      padding: '1px 8px', borderRadius: 4, fontWeight: 700,
                      fontSize: 9, letterSpacing: 0.5,
                    }}>{n.status.toUpperCase()}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          textAlign: 'center', marginTop: 20,
          fontSize: 11, opacity: 0.3,
        }}>
          E-Voila Pflege CRM · KI-gestützte Dokumentation · v2.0
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4), 0 8px 24px rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 24px rgba(239,68,68,0), 0 8px 24px rgba(239,68,68,0.2); }
        }
      `}</style>
    </div>
  )
}

export default App
