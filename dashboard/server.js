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

app.listen(3001, () => {
  console.log('✅ E-Voila Proxy läuft auf http://localhost:3001')
  console.log('🔑 OpenAI Key:', OPENAI_KEY ? '✓ Gefunden' : '✗ FEHLT!')
})