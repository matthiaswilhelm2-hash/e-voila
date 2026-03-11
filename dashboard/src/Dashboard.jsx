import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import CalendarView from './CalendarView'
import './Dashboard.css'

const supabase = createClient(
  'https://poiwjrkqtbfxhfqvabep.supabase.co',
  'sb_publishable_XOGsctULk60og40FT2zRfg_amrSIm5_'
)

const NAV = [
  { id: 'overview',  label: 'Übersicht', icon: '⊞' },
  { id: 'tasks',     label: 'Tasks',     icon: '✓' },
  { id: 'calendar',  label: 'Kalender',  icon: '📅' },
  { id: 'notes',     label: 'Notizen',   icon: '🎙' },
  { id: 'analysis',  label: 'Analyse',   icon: '◈' },
  { id: 'deals',     label: 'Deals',     icon: '◎' },
]

const SCHEDULE_COLORS = ['yellow', 'blue', 'red', 'green', 'purple']

function priorityColor(p) {
  if (p === 'hoch')   return '#e74c3c'
  if (p === 'mittel') return '#f39c12'
  return '#1f5b3c'
}

function priorityClass(p) {
  if (p === 'hoch')   return 'tag tag-hoch'
  if (p === 'mittel') return 'tag tag-mittel'
  return 'tag tag-niedrig'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export default function Dashboard() {
  const [nav, setNav]           = useState('overview')
  const [notes, setNotes]       = useState([])
  const [tasks, setTasks]       = useState([])
  const [analysis, setAnalysis] = useState([])
  const [loading, setLoading]   = useState(true)
  const [today]                 = useState(new Date())

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [nRes, tRes, aRes] = await Promise.all([
      supabase.from('voice_notes').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('ai_analysis').select('*').order('created_at', { ascending: false }),
    ])
    setNotes(nRes.data    || [])
    setTasks(tRes.data    || [])
    setAnalysis(aRes.data || [])
    setLoading(false)
  }

  // ── NEU: Logout ──
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function toggleTask(id, current) {
    const next = current === 'erledigt' ? 'offen' : 'erledigt'
    await supabase.from('tasks').update({ status: next }).eq('id', id)
    fetchAll()
  }

  async function assignTask(id, currentAssignee) {
    const name = prompt('Zuweisen an:', currentAssignee || '')
    if (name === null) return
    await supabase.from('tasks').update({ assignee: name }).eq('id', id)
    fetchAll()
  }

  const openTasks = tasks.filter(t => t.status !== 'erledigt').length
  const doneTasks = tasks.filter(t => t.status === 'erledigt').length
  const highPrio  = tasks.filter(t => t.prioritaet === 'hoch' && t.status !== 'erledigt').length

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dayTasks = tasks.filter(t =>
      t.due_date && new Date(t.due_date).toDateString() === d.toDateString()
    )
    return { date: d, tasks: dayTasks }
  })

  const scheduleTasks = tasks
    .filter(t => t.due_date && t.status !== 'erledigt')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 6)

  function TaskRow({ t }) {
    const done = t.status === 'erledigt'
    return (
      <div className={`task-row ${done ? 'task-done' : ''}`}>
        <button
          className={`task-check ${done ? 'checked' : ''}`}
          onClick={() => toggleTask(t.id, t.status)}
        >
          {done ? '✓' : ''}
        </button>
        <div className="task-info">
          <div className="task-title">{t.titel || '—'}</div>
          {t.beschreibung && <div className="task-sub">{t.beschreibung}</div>}
          <div className="task-meta">
            <span>👤 {t.assignee || 'Niemand'}</span>
            <span>📅 {formatDate(t.due_date)}</span>
            <span className={priorityClass(t.prioritaet)}>{t.prioritaet || 'niedrig'}</span>
          </div>
        </div>
        <button className="btn-assign" onClick={() => assignTask(t.id, t.assignee)}>
          Zuweisen
        </button>
      </div>
    )
  }

  return (
    <div className="db-root">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="db-side">
        <div className="db-brand">
          <div className="db-badge">EV.</div>
          <div className="db-brand-text">
            <div className="db-brand-name">E‑Voila</div>
            <div className="db-brand-sub">Voice CRM</div>
          </div>
        </div>

        <nav className="db-menu">
          <div className="db-menu-label">MENÜ</div>
          {NAV.map(i => (
            <button
              key={i.id}
              className={`db-menu-item ${nav === i.id ? 'active' : ''}`}
              onClick={() => setNav(i.id)}
            >
              <span className="nav-icon">{i.icon}</span>
              <span className="nav-label">{i.label}</span>
              {i.id === 'tasks' && openTasks > 0 && (
                <span className="nav-badge">{openTasks}</span>
              )}
            </button>
          ))}
        </nav>

        {/* ── NEU: Footer mit Logout ── */}
        <div className="db-side-footer">
          <a className="small-link" href="/">
            🎙 Neue Aufnahme
          </a>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Abmelden
          </button>
        </div>
      </aside>

      {/* ── CENTER MAIN ── */}
      <main className="db-main">
        <header className="db-header">
          <div>
            <h1 className="db-header-title">
              {NAV.find(n => n.id === nav)?.label}
            </h1>
            <p className="db-header-sub">
              {today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="db-header-actions">
            <button className="btn-refresh" onClick={fetchAll}>↻ Aktualisieren</button>
          </div>
        </header>

        <div className="db-scroll">
          {loading ? (
            <div className="center-msg">
              <div className="spinner" />
              <p>Lädt Daten…</p>
            </div>
          ) : (
            <>
              {nav === 'overview' && (
                <>
                  <div className="kpi-row">
                    {[
                      { icon: '🎙', value: notes.length, label: 'Notizen',        color: '#1f5b3c' },
                      { icon: '📋', value: openTasks,    label: 'Offene Tasks',   color: '#3b82f6' },
                      { icon: '🔥', value: highPrio,     label: 'Hohe Priorität', color: '#ef4444' },
                      { icon: '✅', value: doneTasks,    label: 'Erledigt',       color: '#10b981' },
                    ].map((k, i) => (
                      <div className="kpi" key={i}>
                        <div className="kpi-icon">{k.icon}</div>
                        <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                        <div className="kpi-label">{k.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="card">
                    <div className="card-header"><h3>Diese Woche</h3></div>
                    <div className="week-strip">
                      {weekDays.map((d, i) => {
                        const isToday = d.date.toDateString() === today.toDateString()
                        return (
                          <div key={i} className={`week-day ${isToday ? 'today' : ''} ${d.tasks.length ? 'has-tasks' : ''}`}>
                            <div className="wd-abbr">{d.date.toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                            <div className="wd-num">{d.date.getDate()}</div>
                            <div className="wd-dot">{d.tasks.length > 0 && <span>{d.tasks.length}</span>}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3>Offene Tasks</h3>
                      <span className="card-count">{openTasks}</span>
                    </div>
                    {tasks.filter(t => t.status !== 'erledigt').slice(0, 8).map(t => (
                      <TaskRow key={t.id} t={t} />
                    ))}
                    {openTasks === 0 && <div className="empty">Keine offenen Tasks 🎉</div>}
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3>Letzte Notizen</h3>
                      <span className="card-count">{notes.length}</span>
                    </div>
                    {notes.slice(0, 4).map(n => (
                      <div key={n.id} className="note-row">
                        <div className="note-dot" />
                        <div className="note-text">{n.transcript}</div>
                        <div className="note-date">{formatDate(n.created_at)}</div>
                      </div>
                    ))}
                    {notes.length === 0 && <div className="empty">Noch keine Notizen</div>}
                  </div>
                </>
              )}

              {nav === 'tasks' && (
                <div className="card">
                  <div className="card-header">
                    <h3>Alle Tasks</h3>
                    <span className="card-count">{tasks.length}</span>
                  </div>
                  {['hoch', 'mittel', 'niedrig'].map(pr => {
                    const filtered = tasks.filter(t => t.prioritaet === pr)
                    if (!filtered.length) return null
                    return (
                      <div key={pr}>
                        <div className="group-title" style={{ color: priorityColor(pr) }}>
                          ● Priorität: {pr}
                        </div>
                        {filtered.map(t => <TaskRow key={t.id} t={t} />)}
                      </div>
                    )
                  })}
                  {tasks.length === 0 && <div className="empty">Noch keine Tasks</div>}
                </div>
              )}

              {nav === 'calendar' && (
                <div className="card" style={{ height: 'calc(100vh - 160px)', overflow: 'hidden' }}>
                  <div className="card-header">
                    <h3>Kalender</h3>
                    <span className="card-count">{tasks.filter(t => t.due_date).length} Termine</span>
                  </div>
                  <CalendarView tasks={tasks} />
                </div>
              )}

              {nav === 'notes' && (
                <div className="card">
                  <div className="card-header">
                    <h3>Alle Notizen</h3>
                    <span className="card-count">{notes.length}</span>
                  </div>
                  {notes.map(n => {
                    const a = analysis.find(x => x.voice_note_id === n.id)
                    return (
                      <div key={n.id} className="note-row note-row-full">
                        <div className="note-dot" />
                        <div style={{ flex: 1 }}>
                          <div className="note-text">{n.transcript}</div>
                          {a && (
                            <div className="note-ai">
                              🤖 {a.zusammenfassung}
                              <span className={priorityClass(a.prioritaet)} style={{ marginLeft: 8 }}>
                                {a.prioritaet}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="note-date">{formatDate(n.created_at)}</div>
                      </div>
                    )
                  })}
                  {notes.length === 0 && <div className="empty">Noch keine Notizen</div>}
                </div>
              )}

              {nav === 'analysis' && (
                <div className="card">
                  <div className="card-header">
                    <h3>KI-Auswertungen</h3>
                    <span className="card-count">{analysis.length}</span>
                  </div>
                  {analysis.map(a => (
                    <div key={a.id} className="analyse-row">
                      <div className="analyse-kat">{a.kategorie}</div>
                      <div className="analyse-summary">{a.zusammenfassung}</div>
                      <div className="analyse-meta">
                        <span style={{ color: priorityColor(a.prioritaet) }}>● {a.prioritaet}</span>
                        <span>😊 {a.stimmung}</span>
                      </div>
                    </div>
                  ))}
                  {analysis.length === 0 && <div className="empty">Noch keine Auswertungen</div>}
                </div>
              )}

              {nav === 'deals' && (
                <div className="card">
                  <div className="card-header"><h3>Pipeline / Deals</h3></div>
                  <div className="empty">
                    Deals-Ansicht kommt bald 🚀<br />
                    <small>GPT→CRM Parser wird gerade aufgebaut</small>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── RIGHT SCHEDULE PANEL ── */}
      <aside className="db-right">
        <div className="db-right-header">
          <h3>Termine & Deadlines</h3>
          <p>{today.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="today-box">
          <div className="today-label">HEUTE</div>
          <div className="today-date">
            {today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="today-count">
            {weekDays[0]?.tasks.length > 0
              ? `${weekDays[0].tasks.length} Task${weekDays[0].tasks.length > 1 ? 's' : ''} fällig`
              : 'Keine Deadlines heute ✓'}
          </div>
        </div>

        <div className="schedule-list">
          <div className="schedule-section-title">ANSTEHEND</div>
          {scheduleTasks.length === 0 && (
            <div className="empty">Keine anstehenden Termine</div>
          )}
          {scheduleTasks.map((t, i) => (
            <div key={t.id} className={`schedule-box color-${SCHEDULE_COLORS[i % SCHEDULE_COLORS.length]}`}>
              <div className="schedule-time">
                📅 {formatDate(t.due_date)}
                {t.due_date?.includes('T') && ` · ${formatTime(t.due_date)}`}
              </div>
              <div className="schedule-name">{t.titel || '—'}</div>
              {t.assignee && <div className="schedule-who">👤 {t.assignee}</div>}
              <span className={priorityClass(t.prioritaet)}>{t.prioritaet || 'niedrig'}</span>
            </div>
          ))}
        </div>

        <div className="right-stats">
          <div className="right-stat">
            <div className="right-stat-val">{openTasks}</div>
            <div className="right-stat-label">Offen</div>
          </div>
          <div className="right-stat">
            <div className="right-stat-val">{doneTasks}</div>
            <div className="right-stat-label">Erledigt</div>
          </div>
          <div className="right-stat">
            <div className="right-stat-val">{notes.length}</div>
            <div className="right-stat-label">Notizen</div>
          </div>
        </div>
      </aside>

    </div>
  )
}
