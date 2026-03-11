import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import './App.css'

const supabase = createClient(
  'https://poiwjrkqtbfxhfqvabep.supabase.co',
  'sb_publishable_XOGsctULk60og40FT2zRfg_amrSIm5_'
)

function App() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const mediaRecorder = useRef(null)
  const chunks = useRef([])

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
      mediaRecorder.current = new MediaRecorder(stream)
      chunks.current = []
      mediaRecorder.current.ondataavailable = e => chunks.current.push(e.data)
      mediaRecorder.current.onstop = async () => {
        setProcessing(true)
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('file', blob, 'recording.webm')
        try {
          await axios.post('http://127.0.0.1:8000/voice/transcribe', formData)
          await fetchNotes()
        } catch (e) {
          alert('Fehler: ' + (e.response?.data?.detail || e.message))
        }
        setProcessing(false)
      }
      mediaRecorder.current.start()
      setRecording(true)
    } catch (err) {
      alert('Mikrofonzugriff verweigert: ' + err.message)
    }
  }

  function stopRecording() {
    if (mediaRecorder.current) mediaRecorder.current.stop()
    setRecording(false)
  }

  return (
    <div className={`page ${darkMode ? 'dark' : 'light'}`}>

      <header className="header">
        <div className="brand-badge">EV.</div>
        <div>
          <div className="header-title">E‑Voila</div>
          <div className="header-sub">Gesprochen = notiert – Voilà!</div>
        </div>
        <button className="toggle-btn" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </header>

      <section className="hero">
        <div className="anim-wrapper">
          <div className="scale-0">
            <div className="circle circle-1"></div>
            <div className="circle circle-2"></div>
            <div className="circle circle-3"></div>
          </div>
        </div>
        <div className="hero-content">
          <h2>Neue Sprachnotiz</h2>
          <p>Drücke den Button und sprich einfach drauflos</p>
          {!recording ? (
            <button className={`btn-record ${processing ? 'loading' : ''}`} onClick={startRecording} disabled={processing}>
              {processing ? '⏳' : '🎙️'}
              <span>{processing ? 'Wird verarbeitet...' : 'Aufnahme starten'}</span>
            </button>
          ) : (
            <button className="btn-record btn-stop" onClick={stopRecording}>
              ⏹️ <span>Aufnahme stoppen</span>
            </button>
          )}
        </div>
      </section>

      <h3 className="section-title">Sprachnotizen ({notes.length})</h3>

      {loading ? (
        <p className="empty">Laden...</p>
      ) : notes.length === 0 ? (
        <p className="empty">Noch keine Sprachnotizen vorhanden</p>
      ) : (
        notes.map(note => (
          <article key={note.id} className="note">
            <p>{note.transcript}</p>
            <div className="note-meta">
              <span className="badge">{note.status}</span>
              <span>{new Date(note.created_at).toLocaleString('de-DE')}</span>
            </div>
          </article>
        ))
      )}

    </div>
  )
}

export default App
