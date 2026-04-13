import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

const PROXY = 'http://localhost:3001'

const SHIFTS = [
  { id: 'frueh',  label: 'Frühdienst',  hours: '6:00 – 14:00 Uhr',  icon: '🌅', hoursBack: 8 },
  { id: 'spaet',  label: 'Spätdienst',  hours: '14:00 – 22:00 Uhr', icon: '🌆', hoursBack: 8 },
  { id: 'nacht',  label: 'Nachtdienst', hours: '22:00 – 6:00 Uhr',  icon: '🌙', hoursBack: 8 },
]

function currentShift() {
  const h = new Date().getHours()
  if (h >= 6  && h < 14) return 'frueh'
  if (h >= 14 && h < 22) return 'spaet'
  return 'nacht'
}

function priorityColor(p) {
  if (p === 'hoch')   return '#ef4444'
  if (p === 'mittel') return '#f59e0b'
  return '#22c55e'
}

function MoodIcon({ mood }) {
  const map = { gut: '😊', neutral: '😐', unruhig: '😟', krank: '🤒' }
  return <span title={mood}>{map[mood] || '😐'}</span>
}

function PrioTag({ prio }) {
  const bg = prio === 'hoch' ? '#1a0a0a' : prio === 'mittel' ? '#1a140a' : '#0a150a'
  const color = priorityColor(prio)
  return (
    <span style={{
      background: bg, color,
      border: `1px solid ${color}40`,
      borderRadius: 6, padding: '2px 8px',
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
    }}>{(prio || 'niedrig').toUpperCase()}</span>
  )
}

function ResidentCard({ resident }) {
  const [open, setOpen] = useState(resident.prioritaet === 'hoch')
  return (
    <div style={{
      background: '#111827',
      border: `1px solid ${resident.prioritaet === 'hoch' ? '#3f1515' : '#1e293b'}`,
      borderLeft: `3px solid ${priorityColor(resident.prioritaet)}`,
      borderRadius: 12, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '14px 18px',
          display: 'flex', gap: 12, alignItems: 'center',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#1e293b', color: '#94a3b8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14, flexShrink: 0,
        }}>
          {resident.name.charAt(0)}
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{resident.name}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            {resident.ereignisse?.length || 0} Ereignis{resident.ereignisse?.length !== 1 ? 'se' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <MoodIcon mood={resident.stimmung} />
          <PrioTag prio={resident.prioritaet} />
          <span style={{ color: '#64748b', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid #1e293b' }}>
          {resident.ereignisse?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 8 }}>
                EREIGNISSE
              </div>
              {resident.ereignisse.map((e, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '6px 0', fontSize: 13, color: '#cbd5e1',
                  borderBottom: i < resident.ereignisse.length - 1 ? '1px solid #1e293b22' : 'none',
                }}>
                  <span style={{ color: '#4caf82', marginTop: 2 }}>•</span>
                  {e}
                </div>
              ))}
            </div>
          )}
          {resident.aufgaben_naechste_schicht?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 8 }}>
                FÜR NÄCHSTE SCHICHT
              </div>
              {resident.aufgaben_naechste_schicht.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '6px 0', fontSize: 13, color: '#fbbf24',
                }}>
                  <span>→</span>
                  {a}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Handover() {
  const [selectedShift, setSelectedShift] = useState(currentShift())
  const [notes, setNotes]           = useState([])
  const [tasks, setTasks]           = useState([])
  const [handover, setHandover]     = useState(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [status, setStatus]         = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [pastHandovers, setPastHandovers] = useState([])
  const [viewPast, setViewPast]     = useState(false)

  useEffect(() => { fetchData() }, [selectedShift])

  async function fetchData() {
    setLoadingData(true)
    setHandover(null)
    setSaved(false)

    const shift = SHIFTS.find(s => s.id === selectedShift)
    const since = new Date(Date.now() - shift.hoursBack * 60 * 60 * 1000).toISOString()

    const [nRes, tRes, hRes] = await Promise.all([
      supabase.from('voice_notes').select('*').gte('created_at', since).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('status', 'offen').order('created_at', { ascending: false }),
      supabase.from('handovers').select('*').order('created_at', { ascending: false }).limit(10),
    ])

    setNotes(nRes.data    || [])
    setTasks(tRes.data    || [])
    setPastHandovers(hRes.data || [])
    setLoadingData(false)
  }

  async function generateHandover() {
    setGenerating(true)
    setHandover(null)
    setStatus('🤖 KI analysiert alle Notizen…')

    try {
      const res = await fetch(`${PROXY}/api/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, tasks, shift: selectedShift }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }

      const data = await res.json()
      setHandover(data)
      setStatus('✅ Übergabe erstellt!')
      setTimeout(() => setStatus(''), 3000)
    } catch (err) {
      setStatus(`❌ Fehler: ${err.message}`)
      setTimeout(() => setStatus(''), 5000)
    } finally {
      setGenerating(false)
    }
  }

  async function saveHandover() {
    if (!handover) return
    setSaving(true)
    try {
      const { error } = await supabase.from('handovers').insert([{
        shift:              selectedShift,
        shift_date:         new Date().toISOString().split('T')[0],
        zusammenfassung:    handover.zusammenfassung,
        resident_summaries: handover.bewohner || [],
        offene_aufgaben:    handover.offene_aufgaben || [],
        dringend:           handover.dringend || [],
        medikamente:        handover.medikamente || [],
        note_ids:           notes.map(n => n.id),
        status:             'completed',
      }])
      if (error) throw new Error(error.message)
      setSaved(true)
      await fetchData()
    } catch (err) {
      setStatus(`❌ Speichern fehlgeschlagen: ${err.message}`)
      setTimeout(() => setStatus(''), 5000)
    } finally {
      setSaving(false)
    }
  }

  function printHandover() {
    window.print()
  }

  const shiftInfo = SHIFTS.find(s => s.id === selectedShift)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f1e',
      color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* HEADER */}
      <div style={{
        background: '#111827',
        borderBottom: '1px solid #1e293b',
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/dashboard" style={{
            color: '#64748b', textDecoration: 'none', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>← Dashboard</a>
          <span style={{ color: '#1e293b' }}>|</span>
          <div style={{ fontWeight: 700, fontSize: 15 }}>🔄 Schichtübergabe</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => setViewPast(v => !v)}
            style={{
              background: viewPast ? '#1e293b' : 'none',
              border: '1px solid #1e293b', color: '#94a3b8',
              borderRadius: 8, padding: '7px 14px',
              fontSize: 12, cursor: 'pointer',
            }}>
            📂 Archiv ({pastHandovers.length})
          </button>
          <a href="/" style={{
            background: '#1f5b3c', color: 'white',
            padding: '7px 14px', borderRadius: 8,
            textDecoration: 'none', fontSize: 12, fontWeight: 600,
          }}>+ Neue Notiz</a>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* VERGANGENHEIT */}
        {viewPast && (
          <div style={{
            background: '#111827', border: '1px solid #1e293b',
            borderRadius: 16, padding: 24, marginBottom: 28,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>📂 Gespeicherte Übergaben</div>
            {pastHandovers.length === 0 && (
              <div style={{ color: '#64748b', fontSize: 13 }}>Noch keine Übergaben gespeichert.</div>
            )}
            {pastHandovers.map(h => {
              const shiftLabel = SHIFTS.find(s => s.id === h.shift)?.label || h.shift
              return (
                <div key={h.id} style={{
                  padding: '12px 0', borderBottom: '1px solid #1e293b',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {shiftLabel} – {new Date(h.shift_date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })}
                    </div>
                    {h.zusammenfassung && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, maxWidth: 500 }}>
                        {h.zusammenfassung.slice(0, 120)}{h.zusammenfassung.length > 120 ? '…' : ''}
                      </div>
                    )}
                  </div>
                  <span style={{
                    background: '#0a150a', color: '#4caf82',
                    border: '1px solid #1f5b3c40',
                    borderRadius: 6, padding: '3px 10px',
                    fontSize: 10, fontWeight: 700,
                  }}>ABGESCHLOSSEN</span>
                </div>
              )
            })}
          </div>
        )}

        {/* SCHICHT AUSWÄHLEN */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 14 }}>
            DIENST AUSWÄHLEN
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {SHIFTS.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedShift(s.id)}
                style={{
                  flex: 1, background: selectedShift === s.id ? '#0a1e12' : '#111827',
                  border: `2px solid ${selectedShift === s.id ? '#1f5b3c' : '#1e293b'}`,
                  borderRadius: 12, padding: '16px 12px',
                  cursor: 'pointer', color: '#f1f5f9',
                  transition: 'all 0.2s', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>{s.hours}</div>
                {s.id === currentShift() && (
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: '#4caf82',
                    marginTop: 6, letterSpacing: 0.5,
                  }}>● AKTUELL</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {loadingData ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            Lade Daten…
          </div>
        ) : (
          <>
            {/* ZUSAMMENFASSUNG VOR GENERIERUNG */}
            {!handover && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28,
              }}>
                <div style={{
                  background: '#111827', border: '1px solid #1e293b',
                  borderRadius: 14, padding: '20px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 14 }}>
                    🎙 NOTIZEN DIESER SCHICHT ({notes.length})
                  </div>
                  {notes.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                      Noch keine Notizen<br />
                      <span style={{ fontSize: 11 }}>In den letzten 8 Stunden</span>
                    </div>
                  ) : (
                    notes.map((n, i) => (
                      <div key={n.id} style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        padding: '8px 0', fontSize: 12, color: '#94a3b8',
                        borderBottom: i < notes.length - 1 ? '1px solid #1e293b' : 'none',
                      }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4caf82', flexShrink: 0, marginTop: 6 }} />
                        <div>
                          <div style={{ color: '#cbd5e1' }}>{n.transcript}</div>
                          <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
                            {new Date(n.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{
                  background: '#111827', border: '1px solid #1e293b',
                  borderRadius: 14, padding: '20px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 14 }}>
                    ✓ OFFENE TASKS ({tasks.length})
                  </div>
                  {tasks.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                      Keine offenen Tasks 🎉
                    </div>
                  ) : (
                    tasks.slice(0, 8).map((t, i) => (
                      <div key={t.id} style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        padding: '8px 0', fontSize: 12,
                        borderBottom: i < Math.min(tasks.length, 8) - 1 ? '1px solid #1e293b' : 'none',
                      }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                          background: priorityColor(t.prioritaet),
                        }} />
                        <div>
                          <div style={{ color: '#cbd5e1' }}>{t.titel}</div>
                          {t.bewohner && <div style={{ fontSize: 10, color: '#475569' }}>🏥 {t.bewohner}</div>}
                        </div>
                        <PrioTag prio={t.prioritaet} />
                      </div>
                    ))
                  )}
                  {tasks.length > 8 && (
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>
                      +{tasks.length - 8} weitere Tasks
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* GENERIER-BUTTON */}
            {!handover && (
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <button
                  onClick={generateHandover}
                  disabled={generating}
                  style={{
                    background: generating
                      ? '#1e293b'
                      : 'linear-gradient(135deg, #1f5b3c, #2d7a54)',
                    border: 'none', color: '#fff',
                    borderRadius: 14, padding: '18px 48px',
                    fontSize: 16, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer',
                    boxShadow: generating ? 'none' : '0 8px 32px rgba(31,91,60,0.4)',
                    transition: 'all 0.3s',
                  }}>
                  {generating ? '⏳ KI erstellt Übergabe…' : `🤖 ${shiftInfo.label} Übergabe generieren`}
                </button>
                {notes.length === 0 && !generating && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 12 }}>
                    Keine Notizen dieser Schicht – die Übergabe basiert auf offenen Tasks
                  </div>
                )}
                {status && (
                  <div style={{
                    marginTop: 16,
                    background: status.includes('✅') ? 'rgba(34,197,94,0.1)' : status.includes('❌') ? 'rgba(239,68,68,0.1)' : '#1e293b',
                    border: `1px solid ${status.includes('✅') ? '#22c55e' : status.includes('❌') ? '#ef4444' : '#334155'}`,
                    borderRadius: 10, padding: '10px 20px',
                    display: 'inline-block', fontSize: 13,
                  }}>
                    {status}
                  </div>
                )}
              </div>
            )}

            {/* ÜBERGABE ERGEBNIS */}
            {handover && (
              <div className="handover-report" style={{ animation: 'fadeIn 0.4s ease' }}>

                {/* Kopfzeile */}
                <div style={{
                  background: 'linear-gradient(135deg, #0a1e12, #111827)',
                  border: '1px solid #1f5b3c40',
                  borderRadius: 16, padding: '24px',
                  marginBottom: 20,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                  <div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: '#1f5b3c22', border: '1px solid #1f5b3c60',
                      borderRadius: 99, padding: '4px 12px', marginBottom: 12,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf82' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#4caf82', letterSpacing: 1 }}>
                        KI-ÜBERGABE ERSTELLT
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
                      {shiftInfo.icon} {shiftInfo.label} – {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
                      {handover.zusammenfassung}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginLeft: 24 }}>
                    <button
                      onClick={printHandover}
                      style={{
                        background: 'none', border: '1px solid #1e293b', color: '#94a3b8',
                        borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer',
                      }}>
                      🖨 Drucken
                    </button>
                    <button
                      onClick={saveHandover}
                      disabled={saving || saved}
                      style={{
                        background: saved ? '#0a1e12' : '#1f5b3c',
                        border: `1px solid ${saved ? '#1f5b3c' : 'transparent'}`,
                        color: '#fff', borderRadius: 8, padding: '8px 16px',
                        fontSize: 12, fontWeight: 700, cursor: saving || saved ? 'not-allowed' : 'pointer',
                      }}>
                      {saving ? '⏳…' : saved ? '✓ Gespeichert' : '💾 Übergabe speichern'}
                    </button>
                  </div>
                </div>

                {/* Dringend */}
                {handover.dringend?.length > 0 && (
                  <div style={{
                    background: '#1a0a0a', border: '1px solid #3f1515',
                    borderRadius: 12, padding: '16px 20px', marginBottom: 20,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: 1, marginBottom: 10 }}>
                      🚨 DRINGENDE HINWEISE
                    </div>
                    {handover.dringend.map((d, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 10, fontSize: 13, color: '#fca5a5',
                        padding: '5px 0',
                      }}>
                        <span>⚠️</span>
                        {d}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

                  {/* Offene Tasks */}
                  {handover.offene_aufgaben?.length > 0 && (
                    <div style={{
                      background: '#111827', border: '1px solid #1e293b',
                      borderRadius: 12, padding: '16px 20px',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 12 }}>
                        ✓ OFFENE AUFGABEN FÜR NÄCHSTE SCHICHT
                      </div>
                      {handover.offene_aufgaben.map((a, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: 8, fontSize: 13, color: '#cbd5e1',
                          padding: '6px 0', borderBottom: i < handover.offene_aufgaben.length - 1 ? '1px solid #1e293b' : 'none',
                        }}>
                          <span style={{ color: '#f59e0b' }}>→</span>
                          {a}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Medikamente */}
                  {handover.medikamente?.length > 0 && (
                    <div style={{
                      background: '#111827', border: '1px solid #1e293b',
                      borderRadius: 12, padding: '16px 20px',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 12 }}>
                        💊 MEDIKAMENTEN-HINWEISE
                      </div>
                      {handover.medikamente.map((m, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: 8, fontSize: 13, color: '#cbd5e1',
                          padding: '6px 0', borderBottom: i < handover.medikamente.length - 1 ? '1px solid #1e293b' : 'none',
                        }}>
                          <span>💊</span>
                          {m}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bewohner */}
                {handover.bewohner?.length > 0 && (
                  <div style={{
                    background: '#111827', border: '1px solid #1e293b',
                    borderRadius: 14, padding: '20px', marginBottom: 20,
                  }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: '#64748b',
                      letterSpacing: 1, marginBottom: 16,
                      display: 'flex', justifyContent: 'space-between',
                    }}>
                      <span>🏥 BEWOHNER ({handover.bewohner.length})</span>
                      <span>Nach Priorität sortiert</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[...handover.bewohner]
                        .sort((a, b) => {
                          const order = { hoch: 0, mittel: 1, niedrig: 2 }
                          return (order[a.prioritaet] ?? 1) - (order[b.prioritaet] ?? 1)
                        })
                        .map((r, i) => <ResidentCard key={i} resident={r} />)
                      }
                    </div>
                  </div>
                )}

                {/* Besonderheiten */}
                {handover.besonderheiten && (
                  <div style={{
                    background: '#111827', border: '1px solid #1e293b',
                    borderRadius: 12, padding: '16px 20px', marginBottom: 20,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 10 }}>
                      📝 BESONDERE VORKOMMNISSE
                    </div>
                    <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
                      {handover.besonderheiten}
                    </div>
                  </div>
                )}

                {/* Neue generieren */}
                <div style={{ textAlign: 'center', paddingTop: 8 }}>
                  <button
                    onClick={() => { setHandover(null); setSaved(false) }}
                    style={{
                      background: 'none', border: '1px solid #1e293b',
                      color: '#64748b', borderRadius: 10, padding: '10px 24px',
                      fontSize: 13, cursor: 'pointer',
                    }}>
                    ↺ Neu generieren
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: '#1e293b' }}>
          E-Voila Pflege · KI-Schichtübergabe · Alle Daten DSGVO-konform in Deutschland gespeichert
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media print {
          nav, button, a[href], .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  )
}
