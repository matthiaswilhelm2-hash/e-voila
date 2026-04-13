import express from 'express'
import cors from 'cors'
import multer from 'multer'
import FormData from 'form-data'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.use(cors())
app.use(express.json())

const OPENAI_KEY = process.env.OPENAI_KEY

// ── WHISPER STT PROXY ──
app.post('/api/whisper', upload.single('file'), async (req, res) => {
  try {
    const form = new FormData()
    form.append('file', req.file.buffer, {
      filename: 'audio.webm',
      contentType: req.file.mimetype,
    })
    form.append('model', 'whisper-1')
    form.append('language', 'de')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        ...form.getHeaders(),
      },
      body: form,
    })

    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error('Whisper Fehler:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── GPT ANALYSE PROXY ──
app.post('/api/gpt', async (req, res) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error('GPT Fehler:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── KI-SCHICHTÜBERGABE ──
app.post('/api/handover', async (req, res) => {
  try {
    const { notes = [], tasks = [], shift = 'spaet' } = req.body

    const shiftNames = { frueh: 'Frühdienst (6–14 Uhr)', spaet: 'Spätdienst (14–22 Uhr)', nacht: 'Nachtdienst (22–6 Uhr)' }

    const notesText = notes.length > 0
      ? notes.map(n => `- ${n.transcript}${n.bewohner ? ` [Bewohner: ${n.bewohner}]` : ''}`).join('\n')
      : 'Keine Sprachnotizen in diesem Dienst.'

    const tasksText = tasks.length > 0
      ? tasks.map(t => `- ${t.titel} (Priorität: ${t.prioritaet || 'mittel'}${t.bewohner ? `, Bewohner: ${t.bewohner}` : ''})`).join('\n')
      : 'Keine offenen Tasks.'

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: `Du bist ein KI-Assistent für die Pflege-Schichtübergabe in einem deutschen Pflegeheim.
Erstelle eine strukturierte, professionelle Übergabe für den ${shiftNames[shift]}.
Analysiere alle Pflegenotizen und Tasks. Fasse je Bewohner die relevanten Ereignisse zusammen.
Antworte NUR mit validem JSON ohne Markdown:
{
  "zusammenfassung": "Gesamtüberblick des Dienstes in 2-3 Sätzen",
  "bewohner": [
    {
      "name": "Name des Bewohners",
      "ereignisse": ["Ereignis 1", "Ereignis 2"],
      "aufgaben_naechste_schicht": ["Was die nächste Schicht tun muss"],
      "prioritaet": "hoch|mittel|niedrig",
      "stimmung": "gut|neutral|unruhig|krank"
    }
  ],
  "offene_aufgaben": ["Offene Task 1", "Offene Task 2"],
  "dringend": ["Dringendes Info 1"],
  "medikamente": ["Medikations-Hinweis 1"],
  "besonderheiten": "Besondere Vorkommnisse oder leere Zeichenkette"
}`
        }, {
          role: 'user',
          content: `Erstelle die Schichtübergabe für den ${shiftNames[shift]}.\n\nSprachnotizen aus diesem Dienst:\n${notesText}\n\nOffene Tasks:\n${tasksText}`
        }],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    })

    const data = await response.json()
    let handover = {}
    try {
      const raw = data.choices[0].message.content
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      handover = JSON.parse(cleaned)
    } catch {
      handover = {
        zusammenfassung: 'Übergabe konnte nicht automatisch erstellt werden.',
        bewohner: [],
        offene_aufgaben: tasks.map(t => t.titel).filter(Boolean),
        dringend: [],
        medikamente: [],
        besonderheiten: '',
      }
    }

    res.json(handover)
  } catch (err) {
    console.error('Handover Fehler:', err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(3001, () => {
  console.log('✅ E-Voila Proxy läuft auf http://localhost:3001')
  console.log('🔑 OpenAI Key:', OPENAI_KEY ? '✓ Gefunden' : '✗ FEHLT!')
})