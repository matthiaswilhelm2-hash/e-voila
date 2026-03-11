import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import CalendarView from './CalendarView'
import './Dashboard.css'

const supabase = createClient(
  'https://poiwjrkqtbfxhfqvabep.supabase.co',
  'sb_publishable_XOGsctULk60og40FT2zRfg_amrSIm5_'
)

const NAV = [
  { id: 'overview',  label: 'Übersicht',       icon: '⊞' },
  { id: 'bewohner',  label: 'Bewohner',         icon: '🏥' },
  { id: 'pipeline',  label: 'Pflege-Pipeline',  icon: '🔄' },
  { id: 'tasks',     label: 'Tasks',            icon: '✓' },
  { id: 'calendar',  label: 'Kalender',         icon: '📅' },
  { id: 'notes',     label: 'Notizen',          icon: '🎙' },
  { id: 'analysis',  label: 'KI-Analyse',       icon: '🤖' },
  { id: 'finanzen',  label: 'Finanzen',         icon: '💶' },
  { id: 'reports',   label: 'Berichte',         icon: '📊' },
  { id: 'settings',  label: 'Einstellungen',    icon: '⚙️' },
]

const SCHEDULE_COLORS = ['yellow', 'blue', 'red', 'green', 'purple']

const PFLEGE_STUFEN = [
  { id: 'anfrage',    label: 'Anfrage',      color: '#3b82f6' },
  { id: 'aufnahme',   label: 'Aufnahme',     color: '#f59e0b' },
  { id: 'eingewoehn', label: 'Eingewöhnung', color: '#8b5cf6' },
  { id: 'stabil',     label: 'Stabil',       color: '#22c55e' },
  { id: 'entlassung', label: 'Entlassung',   color: '#ef4444' },
]

const MOCK_BEWOHNER = [
  { id: 1, name: 'Hildegard Müller', zimmer: '101', pflegegrad: 3, status: 'stabil',     arzt: 'Dr. Weber', aufnahme: '12.01.2026', notizen: 2 },
  { id: 2, name: 'Ernst Hoffmann',   zimmer: '102', pflegegrad: 4, status: 'aufnahme',   arzt: 'Dr. Braun', aufnahme: '08.03.2026', notizen: 1 },
  { id: 3, name: 'Gertrude Schmidt', zimmer: '203', pflegegrad: 2, status: 'eingewoehn', arzt: 'Dr. Weber', aufnahme: '01.03.2026', notizen: 3 },
  { id: 4, name: 'Wilhelm Fischer',  zimmer: '205', pflegegrad: 5, status: 'stabil',     arzt: 'Dr. Klein', aufnahme: '15.11.2025', notizen: 5 },
  { id: 5, name: 'Irmgard Bauer',    zimmer: '301', pflegegrad: 3, status: 'anfrage',    arzt: 'Dr. Braun', aufnahme: '—',          notizen: 0 },
  { id: 6, name: 'Karl Zimmermann',  zimmer: '302', pflegegrad: 4, status: 'entlassung', arzt: 'Dr. Klein', aufnahme: '20.09.2025', notizen: 4 },
]

const MOCK_FINANZEN = [
  { id: 1, titel: 'Pflegekosten März – Hildegard Müller', betrag: 3200,   typ: 'einnahme', status: 'bezahlt', datum: '01.03.2026' },
  { id: 2, titel: 'Pflegekosten März – Ernst Hoffmann',   betrag: 4100,   typ: 'einnahme', status: 'offen',   datum: '01.03.2026' },
  { id: 3, titel: 'Medikamente – Apotheke Zentral',       betrag: -890,   typ: 'ausgabe',  status: 'bezahlt', datum: '05.03.2026' },
  { id: 4, titel: 'Personalkosten Pflegekräfte März',     betrag: -18500, typ: 'ausgabe',  status: 'bezahlt', datum: '28.02.2026' },
  { id: 5, titel: 'Pflegekosten März – Wilhelm Fischer',  betrag: 4800,   typ: 'einnahme', status: 'bezahlt', datum: '01.03.2026' },
  { id: 6, titel: 'Wartung Medizingeräte',                betrag: -1200,  typ: 'ausgabe',  status: 'offen',   datum: '10.03.2026' },
  { id: 7, titel: 'Pflegekosten März – Gertrude Schmidt', betrag: 2800,   typ: 'einnahme', status: 'offen',   datum: '01.03.2026' },
]

const TASK_KATEGORIEN = [
  'Medikation','Körperpflege','Arzttermin','Vitalzeichen',
  'Wundversorgung','Ernährung','Mobilisation','Angehörigengespräch',
  'Dokumentation','Sturzprotokoll','Dekubitusprophylaxe','Inkontinenzversorgung',
  'Physiotherapie','Ergotherapie','Palliativpflege','Notfall',
]

function priorityColor(p) {
  if (p === 'hoch')   return '#ef4444'
  if (p === 'mittel') return '#f59e0b'
  return '#22c55e'
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

function stufenColor(status) {
  const s = PFLEGE_STUFEN.find(s => s.id === status)
  return s ? s.color : '#64748b'
}

function stufenLabel(status) {
  const s = PFLEGE_STUFEN.find(s => s.id === status)
  return s ? s.label : status
}

function TaskRow({ t, onToggle, onAssign }) {
  const done = t.status === 'erledigt'
  return (
    <div className={`task-row ${done ? 'task-done' : ''}`}>
      <button className={`task-check ${done ? 'checked' : ''}`} onClick={() => onToggle(t.id, t.status)}>
        {done ? '✓' : ''}
      </button>
      <div className="task-info">
        <div className="task-title">{t.titel || '—'}</div>
        {t.beschreibung && <div className="task-sub">{t.beschreibung}</div>}
        <div className="task-meta">
          {t.bewohner   && <span className="meta-chip">🏥 {t.bewohner}</span>}
          <span className="meta-chip">👤 {t.assignee || 'Niemand'}</span>
          <span className="meta-chip">📅 {formatDate(t.due_date)}</span>
          {t.kategorie  && <span className="meta-chip">🏷 {t.kategorie}</span>}
          <span className={priorityClass(t.prioritaet)}>{t.prioritaet || 'niedrig'}</span>
        </div>
      </div>
      <button className="btn-assign" onClick={() => onAssign(t.id, t.assignee)}>Zuweisen</button>
    </div>
  )
}

function FilterBar({ filterAssignee, setFilterAssignee, filterDay, setFilterDay,
                     filterKat, setFilterKat, allAssignees, weekDays, filteredTasks }) {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>👤 Mitarbeiter</label>
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
          {allAssignees.map(a => (
            <option key={a} value={a}>{a === 'alle' ? 'Alle Mitarbeiter' : a}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>🏷 Kategorie</label>
        <select value={filterKat} onChange={e => setFilterKat(e.target.value)}>
          <option value="alle">Alle Kategorien</option>
          {TASK_KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <div className="filter-group">
        <label>📅 Tag</label>
        <select value={filterDay} onChange={e => setFilterDay(e.target.value)}>
          <option value="alle">Alle Tage</option>
          {weekDays.map(d => (
            <option key={d.label} value={d.label}>{d.label} {d.num}.</option>
          ))}
        </select>
      </div>
      {(filterAssignee !== 'alle' || filterDay !== 'alle' || filterKat !== 'alle') && (
        <button className="btn-clear-filter" onClick={() => {
          setFilterAssignee('alle'); setFilterDay('alle'); setFilterKat('alle')
        }}>✕ Zurücksetzen</button>
      )}
      <div className="filter-result">{filteredTasks.length} Task{filteredTasks.length !== 1 ? 's' : ''}</div>
    </div>
  )
}

export default function Dashboard() {
  const [nav, setNav]               = useState('overview')
  const [notes, setNotes]           = useState([])
  const [tasks, setTasks]           = useState([])
  const [analysis, setAnalysis]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [user, setUser]             = useState(null)
  const [search, setSearch]         = useState('')
  const [filterAssignee, setFilterAssignee] = useState('alle')
  const [filterDay, setFilterDay]   = useState('alle')
  const [filterKat, setFilterKat]   = useState('alle')
  const [today]                     = useState(new Date())
  const [notification, setNotification] = useState(null)
  const [toggles, setToggles]       = useState([true, true, false, true])

  useEffect(() => {
    fetchAll()
    supabase.auth.getUser().then(({ data }) => setUser(data?.user))
  }, [])

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

  function showNotification(msg, type = 'success') {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3500)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function toggleTask(id, current) {
    const next = current === 'erledigt' ? 'offen' : 'erledigt'
    await supabase.from('tasks').update({ status: next }).eq('id', id)
    showNotification(next === 'erledigt' ? '✓ Task erledigt' : 'Task wieder geöffnet')
    fetchAll()
  }

  async function assignTask(id, currentAssignee) {
    const name = prompt('Zuweisen an:', currentAssignee || '')
    if (name === null) return
    await supabase.from('tasks').update({ assignee: name }).eq('id', id)
    showNotification(`Task zugewiesen an ${name}`)
    fetchAll()
  }

  async function createTaskFromAnalysis(a) {
    const taskData = {
      titel: `KI: ${a.kategorie || 'Aufgabe'}`,
      beschreibung: a.zusammenfassung || '',
      prioritaet: a.prioritaet || 'mittel',
      status: 'offen',
      kategorie: a.kategorie || 'Dokumentation',
      created_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('tasks').insert([taskData])
    if (error) {
      showNotification('Fehler beim Erstellen des Tasks', 'error')
    } else {
      showNotification('🤖 KI-Task erfolgreich erstellt!', 'success')
      fetchAll()
    }
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dayTasks = tasks.filter(t =>
      t.due_date && new Date(t.due_date).toDateString() === d.toDateString()
    )
    return { date: d, tasks: dayTasks, label: d.toLocaleDateString('de-DE', { weekday: 'short' }), num: d.getDate() }
  })

  const allAssignees = useMemo(() => {
    const names = tasks.map(t => t.assignee).filter(Boolean)
    return ['alle', ...new Set(names)]
  }, [tasks])

  const filteredTasks = useMemo(() => {
    let result = tasks
    if (filterAssignee !== 'alle') result = result.filter(t => t.assignee === filterAssignee)
    if (filterKat !== 'alle')      result = result.filter(t => t.kategorie === filterKat)
    if (filterDay !== 'alle') {
      const targetDate = weekDays.find(d => d.label === filterDay)?.date
      if (targetDate) result = result.filter(t =>
        t.due_date && new Date(t.due_date).toDateString() === targetDate.toDateString()
      )
    }
    if (search) result = result.filter(t =>
      t.titel?.toLowerCase().includes(search.toLowerCase()) ||
      t.beschreibung?.toLowerCase().includes(search.toLowerCase()) ||
      t.bewohner?.toLowerCase().includes(search.toLowerCase())
    )
    return result
  }, [tasks, filterAssignee, filterDay, filterKat, search, weekDays])

  const openTasks = tasks.filter(t => t.status !== 'erledigt').length
  const doneTasks = tasks.filter(t => t.status === 'erledigt').length
  const highPrio  = tasks.filter(t => t.prioritaet === 'hoch' && t.status !== 'erledigt').length

  const scheduleTasks = tasks
    .filter(t => t.due_date && t.status !== 'erledigt')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 6)

  const userName    = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Nutzer'
  const userInitial = userName.charAt(0).toUpperCase()

  const einnahmen = MOCK_FINANZEN.filter(f => f.typ === 'einnahme').reduce((s, f) => s + f.betrag, 0)
  const ausgaben  = Math.abs(MOCK_FINANZEN.filter(f => f.typ === 'ausgabe').reduce((s, f) => s + f.betrag, 0))
  const offeneRechnungen = MOCK_FINANZEN.filter(f => f.status === 'offen').length
  const belegung  = Math.round((MOCK_BEWOHNER.filter(b => b.status !== 'anfrage').length / 30) * 100)

  return (
    <div className="db-root">

      {notification && (
        <div className={`toast toast-${notification.type}`}>
          <span>{notification.msg}</span>
          <button className="toast-close" onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      <aside className="db-side">
        <div className="db-brand"><div className="db-badge">EV</div></div>
        <nav className="db-menu">
          {NAV.map(i => (
            <button key={i.id} className={`db-menu-item ${nav === i.id ? 'active' : ''}`}
              onClick={() => setNav(i.id)} title={i.label}>
              <span>{i.icon}</span>
              {i.id === 'tasks' && openTasks > 0 && <span className="nav-badge">{openTasks}</span>}
            </button>
          ))}
        </nav>
        <div className="db-side-footer">
          <a className="side-btn" href="/" title="Neue Aufnahme">🎙</a>
          <button className="side-btn side-btn-logout" onClick={handleLogout} title="Abmelden">🚪</button>
        </div>
      </aside>

      <main className="db-main">
        <header className="db-header">
          <div className="db-header-left">
            <h1 className="db-header-title">{NAV.find(n => n.id === nav)?.icon} {NAV.find(n => n.id === nav)?.label}</h1>
            <p className="db-header-sub">{today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="db-search">
            <span className="db-search-icon">🔍</span>
            <input type="text" placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="db-header-actions">
            <button className="btn-icon" title="Benachrichtigungen">🔔<span className="badge-dot" /></button>
            <button className="btn-refresh" onClick={fetchAll}>↻ Aktualisieren</button>
            <button className="db-user" onClick={() => setNav('settings')}>
              <div className="db-user-info">
                <span className="db-user-name">{userName}</span>
                <span className="db-user-role">Stationsleitung</span>
              </div>
              <div className="db-avatar">{userInitial}</div>
            </button>
          </div>
        </header>

        <div className="db-scroll">
          {loading ? (
            <div className="center-msg"><div className="spinner" /><p>Lädt Pflegedaten…</p></div>
          ) : (
            <>

              {nav === 'overview' && (
                <>
                  <div className="kpi-row">
                    {[
                      { icon: '🏥', value: MOCK_BEWOHNER.filter(b => b.status !== 'anfrage').length, label: 'Bewohner aktiv', bg: '#f0fdf4', color: '#16a34a' },
                      { icon: '📋', value: openTasks,    label: 'Offene Tasks',   bg: '#eff6ff', color: '#2563eb' },
                      { icon: '🔥', value: highPrio,     label: 'Dringend',       bg: '#fef2f2', color: '#dc2626' },
                      { icon: '🛏', value: `${belegung}%`, label: 'Belegung',     bg: '#f5f3ff', color: '#7c3aed' },
                    ].map((k, i) => (
                      <div className="kpi" key={i}>
                        <div className="kpi-icon-wrap" style={{ background: k.bg }}>{k.icon}</div>
                        <div>
                          <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                          <div className="kpi-label">{k.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid-2">
                    <div className="card">
                      <div className="card-header"><h3>📅 Diese Woche</h3></div>
                      <div className="week-strip">
                        {weekDays.map((d, i) => {
                          const isToday = d.date.toDateString() === today.toDateString()
                          return (
                            <div key={i} className={`week-day ${isToday ? 'today' : ''} ${d.tasks.length ? 'has-tasks' : ''}`}
                              onClick={() => { setFilterDay(d.label); setNav('tasks') }}>
                              <div className="wd-abbr">{d.label}</div>
                              <div className="wd-num">{d.num}</div>
                              <div className="wd-dot">{d.tasks.length > 0 ? d.tasks.length : ''}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-header"><h3>🤖 KI-System Status</h3></div>
                      <div className="ai-status-list">
                        {[
                          { dot: 'green',  label: 'Spracherkennung (Whisper)', badge: 'Online',                         cls: 'green'  },
                          { dot: 'green',  label: 'Pflege-KI Extraktor',       badge: 'Online',                         cls: 'green'  },
                          { dot: 'yellow', label: 'KI-Auswertungen',           badge: `${analysis.length} gespeichert`, cls: 'yellow' },
                          { dot: 'blue',   label: 'Sprachnotizen',             badge: `${notes.length} total`,          cls: 'blue'   },
                        ].map((item, i) => (
                          <div key={i} className="ai-status-item">
                            <span className={`ai-dot ${item.dot}`} />
                            <span>{item.label}</span>
                            <span className={`ai-badge ${item.cls}`}>{item.badge}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="card">
                      <div className="card-header">
                        <h3>📋 Dringende Tasks</h3>
                        <span className="card-count">{openTasks}</span>
                      </div>
                      {tasks.filter(t => t.status !== 'erledigt').slice(0, 5).map(t => (
                        <TaskRow key={t.id} t={t} onToggle={toggleTask} onAssign={assignTask} />
                      ))}
                      {openTasks === 0 && <div className="empty">Keine offenen Tasks 🎉</div>}
                      {openTasks > 5 && <button className="btn-more" onClick={() => setNav('tasks')}>Alle {openTasks} Tasks →</button>}
                    </div>
                    <div className="card">
                      <div className="card-header">
                        <h3>🏥 Bewohner Übersicht</h3>
                        <button className="btn-link" onClick={() => setNav('bewohner')}>Alle →</button>
                      </div>
                      {MOCK_BEWOHNER.slice(0, 5).map(b => (
                        <div key={b.id} className="finance-row">
                          <div className="finance-info">
                            <div className="finance-title">{b.name}</div>
                            <div className="finance-sub">Zimmer {b.zimmer} · PG {b.pflegegrad}</div>
                          </div>
                          <span className="tag" style={{ background: stufenColor(b.status) + '20', color: stufenColor(b.status) }}>
                            {stufenLabel(b.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3>🎙 Letzte KI-Notizen</h3>
                      <span className="card-count">{notes.length}</span>
                    </div>
                    {notes.slice(0, 3).map(n => (
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

              {nav === 'bewohner' && (
                <>
                  <div className="kpi-row">
                    {[
                      { icon: '🏥', value: MOCK_BEWOHNER.length,                                        label: 'Gesamt',       bg: '#f0fdf4', color: '#16a34a' },
                      { icon: '✅', value: MOCK_BEWOHNER.filter(b => b.status === 'stabil').length,     label: 'Stabil',       bg: '#eff6ff', color: '#2563eb' },
                      { icon: '🔄', value: MOCK_BEWOHNER.filter(b => b.status === 'eingewoehn').length, label: 'Eingewöhnung', bg: '#f5f3ff', color: '#7c3aed' },
                      { icon: '📋', value: MOCK_BEWOHNER.filter(b => b.status === 'anfrage').length,    label: 'Anfragen',     bg: '#fffbeb', color: '#d97706' },
                    ].map((k, i) => (
                      <div className="kpi" key={i}>
                        <div className="kpi-icon-wrap" style={{ background: k.bg }}>{k.icon}</div>
                        <div>
                          <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                          <div className="kpi-label">{k.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <div className="card-header">
                      <h3>🏥 Alle Bewohner</h3>
                      <button className="btn-primary">+ Neuer Bewohner</button>
                    </div>
                    <div className="patient-table">
                      <div className="patient-table-head">
                        <span>Name</span><span>Zimmer</span><span>Pflegegrad</span>
                        <span>Status</span><span>Arzt</span><span>Aktionen</span>
                      </div>
                      {MOCK_BEWOHNER.map(b => (
                        <div key={b.id} className="patient-table-row">
                          <div className="patient-contact">
                            <div className="patient-avatar">{b.name.charAt(0)}</div>
                            <div>
                              <div className="patient-name">{b.name}</div>
                              <div className="patient-sub">Aufnahme: {b.aufnahme}</div>
                            </div>
                          </div>
                          <span className="meta-chip">🛏 {b.zimmer}</span>
                          <span className="meta-chip">PG {b.pflegegrad}</span>
                          <span className="tag" style={{ background: stufenColor(b.status) + '20', color: stufenColor(b.status) }}>
                            {stufenLabel(b.status)}
                          </span>
                          <span className="patient-sub">{b.arzt}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-icon-sm" title="Akte">📋</button>
                            <button className="btn-icon-sm" title="Notiz">🎙</button>
                            <button className="btn-icon-sm" onClick={() => showNotification(`Task für ${b.name} erstellt`)}>✓</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {nav === 'pipeline' && (
                <>
                  <div className="kpi-row">
                    {PFLEGE_STUFEN.map(s => {
                      const count = MOCK_BEWOHNER.filter(b => b.status === s.id).length
                      return (
                        <div className="kpi" key={s.id}>
                          <div className="kpi-icon-wrap" style={{ background: s.color + '20' }}>🏥</div>
                          <div>
                            <div className="kpi-value" style={{ color: s.color }}>{count}</div>
                            <div className="kpi-label">{s.label}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="card">
                    <div className="card-header">
                      <h3>🔄 Pflege-Pipeline</h3>
                      <button className="btn-primary" onClick={() => showNotification('Anfrage erfasst')}>+ Anfrage erfassen</button>
                    </div>
                    <div className="pipeline">
                      {PFLEGE_STUFEN.map(stufe => {
                        const bewohner = MOCK_BEWOHNER.filter(b => b.status === stufe.id)
                        return (
                          <div key={stufe.id} className="pipeline-col">
                            <div className="pipeline-header" style={{ borderColor: stufe.color }}>
                              <span style={{ color: stufe.color }}>{stufe.label}</span>
                              <span className="pipeline-count">{bewohner.length}</span>
                            </div>
                            {bewohner.map(b => (
                              <div key={b.id} className="pipeline-card"
                                onClick={() => showNotification(`${b.name} – Zimmer ${b.zimmer}`, 'info')}>
                                <div className="pipeline-title">{b.name}</div>
                                <div className="pipeline-contact">🛏 Zimmer {b.zimmer}</div>
                                <div className="pipeline-value">PG {b.pflegegrad} · {b.arzt}</div>
                              </div>
                            ))}
                            {bewohner.length === 0 && <div className="pipeline-empty">Keine Bewohner</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {nav === 'tasks' && (
                <div className="card">
                  <div className="card-header">
                    <h3>✓ Pflege-Tasks</h3>
                    <span className="card-count">{filteredTasks.length} / {tasks.length}</span>
                  </div>
                  <FilterBar
                    filterAssignee={filterAssignee} setFilterAssignee={setFilterAssignee}
                    filterDay={filterDay}           setFilterDay={setFilterDay}
                    filterKat={filterKat}           setFilterKat={setFilterKat}
                    allAssignees={allAssignees}     weekDays={weekDays}
                    filteredTasks={filteredTasks}
                  />
                  {['hoch', 'mittel', 'niedrig'].map(pr => {
                    const filtered = filteredTasks.filter(t => t.prioritaet === pr)
                    if (!filtered.length) return null
                    return (
                      <div key={pr}>
                        <div className="group-title" style={{ color: priorityColor(pr) }}>● {pr.toUpperCase()}</div>
                        {filtered.map(t => <TaskRow key={t.id} t={t} onToggle={toggleTask} onAssign={assignTask} />)}
                      </div>
                    )
                  })}
                  {filteredTasks.length === 0 && (
                    <div className="empty">Keine Tasks gefunden<br /><small>Filter anpassen oder zurücksetzen</small></div>
                  )}
                </div>
              )}

              {nav === 'calendar' && (
                <div className="card" style={{ minHeight: 'calc(100vh - 200px)' }}>
                  <div className="card-header">
                    <h3>📅 Kalender</h3>
                    <span className="card-count">{tasks.filter(t => t.due_date).length} Termine</span>
                  </div>
                  <CalendarView tasks={tasks} />
                </div>
              )}

              {nav === 'notes' && (
                <div className="card">
                  <div className="card-header">
                    <h3>🎙 Sprachnotizen</h3>
                    <span className="card-count">{notes.length}</span>
                  </div>
                  {notes.map(n => {
                    const a = analysis.find(x => x.voice_note_id === n.id)
                    return (
                      <div key={n.id} className="note-row">
                        <div className="note-dot" />
                        <div style={{ flex: 1 }}>
                          <div className="note-text">{n.transcript}</div>
                          {a && (
                            <div className="note-ai">
                              🤖 {a.zusammenfassung}
                              <span className={priorityClass(a.prioritaet)} style={{ marginLeft: 8 }}>{a.prioritaet}</span>
                            </div>
                          )}
                        </div>
                        <div className="note-date">{formatDate(n.created_at)}</div>
                      </div>
                    )
                  })}
                  {notes.length === 0 && <div className="empty">Noch keine Sprachnotizen</div>}
                </div>
              )}

              {nav === 'analysis' && (
                <div className="card">
                  <div className="card-header">
                    <h3>🤖 KI-Auswertungen</h3>
                    <span className="card-count">{analysis.length}</span>
                  </div>
                  {analysis.map(a => {
                    const conf      = a.confidence || 0.8
                    const confColor = conf >= 0.85 ? '#16a34a' : conf >= 0.65 ? '#d97706' : '#dc2626'
                    const confBg    = conf >= 0.85 ? '#f0fdf4' : conf >= 0.65 ? '#fffbeb' : '#fef2f2'
                    return (
                      <div key={a.id} className="analyse-row">
                        <div className="analyse-header">
                          <div className="analyse-kat">{a.kategorie}</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div className="confidence-badge" style={{ background: confBg, color: confColor }}>
                              {conf >= 0.85 ? '🟢' : conf >= 0.65 ? '🟡' : '🔴'} {Math.round(conf * 100)}%
                            </div>
                            <button className="btn-outline" style={{ padding: '3px 8px', fontSize: 10 }}
                              onClick={() => createTaskFromAnalysis(a)}>
                              🤖 → Task
                            </button>
                          </div>
                        </div>
                        <div className="analyse-summary">{a.zusammenfassung}</div>
                        <div className="analyse-meta">
                          <span style={{ color: priorityColor(a.prioritaet) }}>● {a.prioritaet}</span>
                          <span>😊 {a.stimmung}</span>
                        </div>
                      </div>
                    )
                  })}
                  {analysis.length === 0 && (
                    <div className="empty">
                      Noch keine KI-Auswertungen<br />
                      <small>Nimm eine Sprachnotiz auf – die KI analysiert sie automatisch</small>
                    </div>
                  )}
                </div>
              )}

              {nav === 'finanzen' && (
                <>
                  <div className="kpi-row">
                    {[
                      { icon: '💶', value: `${einnahmen.toLocaleString('de-DE')} €`,              label: 'Einnahmen März',    bg: '#f0fdf4', color: '#16a34a' },
                      { icon: '📤', value: `${ausgaben.toLocaleString('de-DE')} €`,               label: 'Ausgaben März',     bg: '#fef2f2', color: '#dc2626' },
                      { icon: '📊', value: `${(einnahmen - ausgaben).toLocaleString('de-DE')} €`, label: 'Saldo',             bg: '#eff6ff', color: '#2563eb' },
                      { icon: '⚠️', value: offeneRechnungen,                                       label: 'Offene Rechnungen', bg: '#fffbeb', color: '#d97706' },
                    ].map((k, i) => (
                      <div className="kpi" key={i}>
                        <div className="kpi-icon-wrap" style={{ background: k.bg }}>{k.icon}</div>
                        <div>
                          <div className="kpi-value" style={{ color: k.color, fontSize: k.value.toString().length > 8 ? 18 : 26 }}>{k.value}</div>
                          <div className="kpi-label">{k.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid-2">
                    <div className="card">
                      <div className="card-header">
                        <h3>💶 Transaktionen März</h3>
                        <button className="btn-primary" onClick={() => showNotification('Export gestartet', 'info')}>📥 Export</button>
                      </div>
                      {MOCK_FINANZEN.map(f => (
                        <div key={f.id} className="finance-row">
                          <div className="finance-info">
                            <div className="finance-title">{f.titel}</div>
                            <div className="finance-sub">{f.datum}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <div className={`finance-amount ${f.betrag > 0 ? 'finance-pos' : 'finance-neg'}`}>
                              {f.betrag > 0 ? '+' : ''}{f.betrag.toLocaleString('de-DE')} €
                            </div>
                            <span className={`tag ${f.status === 'bezahlt' ? 'tag-niedrig' : 'tag-mittel'}`}>{f.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="card">
                      <div className="card-header"><h3>🛏 Zimmer & Kapazität</h3></div>
                      {[
                        { label: 'Gesamtkapazität',   value: '30 Zimmer' },
                        { label: 'Belegt',             value: `${MOCK_BEWOHNER.filter(b => b.status !== 'anfrage').length} Zimmer` },
                        { label: 'Frei',               value: `${30 - MOCK_BEWOHNER.filter(b => b.status !== 'anfrage').length} Zimmer` },
                        { label: 'Auslastung',         value: `${belegung}%` },
                        { label: 'Ø Kosten/Bewohner',  value: '3.580 €/Monat' },
                        { label: 'Offene Rechnungen',  value: `${offeneRechnungen} Stück` },
                      ].map((item, i) => (
                        <div key={i} className="finance-row">
                          <div className="finance-title">{item.label}</div>
                          <div className="finance-amount finance-pos">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {nav === 'reports' && (
                <>
                  <div className="card">
                    <div className="card-header"><h3>📊 Berichte & Auswertungen</h3></div>
                    <div className="reports-grid">
                      {[
                        { icon: '📈', title: 'Monatsübersicht',      sub: 'Notizen, Tasks, KI-Auswertungen',   bg: '#eff6ff', action: () => showNotification('📈 Monatsbericht wird generiert…', 'info') },
                        { icon: '📋', title: 'Task-Report',          sub: 'Erledigte & offene Pflegeaufgaben', bg: '#f0fdf4', action: () => showNotification('📋 Task-Report wird erstellt…', 'info') },
                        { icon: '🏥', title: 'Bewohner-Report',      sub: 'Pflegegrade, Status, Verläufe',     bg: '#f5f3ff', action: () => showNotification('🏥 Bewohner-Report wird erstellt…', 'info') },
                        { icon: '💶', title: 'Finanzbericht',        sub: 'Einnahmen, Ausgaben, Saldo',        bg: '#fffbeb', action: () => showNotification('💶 Finanzbericht wird erstellt…', 'info') },
                        { icon: '🤖', title: 'KI-Qualitätsbericht', sub: 'Confidence-Scores, Genauigkeit',    bg: '#fef2f2', action: () => showNotification('🤖 KI-Bericht wird analysiert…', 'info') },
                        { icon: '📄', title: 'PDF Export',           sub: 'Alle Berichte als PDF exportieren', bg: '#f1f5f9', action: () => showNotification('📄 PDF wird generiert…', 'info') },
                      ].map((r, i) => (
                        <div key={i} className="report-card">
                          <div className="report-icon" style={{ background: r.bg }}>{r.icon}</div>
                          <div className="report-title">{r.title}</div>
                          <div className="report-sub">{r.sub}</div>
                          <button className="btn-outline" onClick={r.action}>Erstellen</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="card">
                      <div className="card-header"><h3>📊 Task-Statistik</h3></div>
                      {[
                        { label: 'Gesamt Tasks',    value: tasks.length,  color: '#2563eb' },
                        { label: 'Erledigt',        value: doneTasks,     color: '#16a34a' },
                        { label: 'Offen',           value: openTasks,     color: '#f59e0b' },
                        { label: 'Dringend (Hoch)', value: highPrio,      color: '#ef4444' },
                        { label: 'Erledigungsrate', value: tasks.length > 0 ? `${Math.round((doneTasks/tasks.length)*100)}%` : '0%', color: '#16a34a' },
                      ].map((s, i) => (
                        <div key={i} className="finance-row">
                          <div className="finance-title">{s.label}</div>
                          <div className="finance-amount" style={{ color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="card">
                      <div className="card-header"><h3>🏥 Bewohner-Statistik</h3></div>
                      {PFLEGE_STUFEN.map(s => {
                        const count = MOCK_BEWOHNER.filter(b => b.status === s.id).length
                        return (
                          <div key={s.id} className="finance-row">
                            <div className="finance-title">{s.label}</div>
                            <div className="finance-amount" style={{ color: s.color }}>{count} Bewohner</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {nav === 'settings' && (
                <div className="settings-grid">
                  <div className="card">
                    <div className="card-header"><h3>👤 Mein Profil</h3></div>
                    <div className="settings-profile">
                      <div className="settings-avatar">{userInitial}</div>
                      <div>
                        <div className="settings-name">{userName}</div>
                        <div className="settings-email">{user?.email}</div>
                        <span className="settings-role-badge">Stationsleitung</span>
                      </div>
                    </div>
                    <div className="settings-fields">
                      <div className="settings-field"><label>Name</label><input type="text" defaultValue={userName} /></div>
                      <div className="settings-field"><label>E-Mail</label><input type="email" defaultValue={user?.email} /></div>
                      <div className="settings-field"><label>Rolle</label><input type="text" defaultValue="Stationsleitung" disabled /></div>
                    </div>
                    <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => showNotification('✓ Profil gespeichert')}>Speichern</button>
                  </div>

                  <div className="card">
                    <div className="card-header"><h3>🎨 Darstellung</h3></div>
                    <div className="settings-fields">
                      {[
                        { label: 'Sprache',      opts: ['Deutsch', 'English'] },
                        { label: 'Zeitzone',     opts: ['Europe/Berlin', 'UTC'] },
                        { label: 'Datumsformat', opts: ['DD.MM.YYYY', 'MM/DD/YYYY'] },
                      ].map((f, i) => (
                        <div key={i} className="settings-field">
                          <label>{f.label}</label>
                          <select>{f.opts.map(o => <option key={o}>{o}</option>)}</select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header"><h3>🔔 Benachrichtigungen</h3></div>
                    <div className="settings-toggles">
                      {['Push-Benachrichtigungen','E-Mail bei kritischen Ereignissen','Tägliche Zusammenfassung','KI-Rückfragen'].map((label, i) => (
                        <div key={i} className="settings-toggle-row">
                          <span>{label}</span>
                          <div className={`toggle ${toggles[i] ? 'on' : ''}`} onClick={() => {
                            const next = [...toggles]; next[i] = !next[i]; setToggles(next)
                            showNotification(`${label} ${next[i] ? 'aktiviert' : 'deaktiviert'}`)
                          }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header"><h3>🔒 Sicherheit</h3></div>
                    <div className="settings-fields">
                      <div className="settings-field"><label>Neues Passwort</label><input type="password" placeholder="••••••••" /></div>
                      <button className="btn-outline" style={{ marginTop: 8 }} onClick={() => showNotification('✓ Passwort gespeichert')}>Passwort speichern</button>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <button className="btn-danger" onClick={handleLogout}>🚪 Abmelden</button>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      </main>

      <aside className="db-right">
        <div className="db-right-header">
          <h3>Termine & Deadlines</h3>
          <p>{today.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="today-box">
          <div className="today-label">HEUTE</div>
          <div className="today-date">{today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div className="today-count">
            {weekDays[0]?.tasks.length > 0
              ? `${weekDays[0].tasks.length} Task${weekDays[0].tasks.length > 1 ? 's' : ''} fällig`
              : 'Keine Deadlines heute ✓'}
          </div>
        </div>
        <div className="schedule-list">
          <div className="schedule-section-title">ANSTEHEND</div>
          {scheduleTasks.length === 0 && <div className="empty">Keine Termine</div>}
          {scheduleTasks.map((t, i) => (
            <div key={t.id} className={`schedule-box color-${SCHEDULE_COLORS[i % SCHEDULE_COLORS.length]}`}>
              <div className="schedule-time">📅 {formatDate(t.due_date)}{t.due_date?.includes('T') && ` · ${formatTime(t.due_date)}`}</div>
              <div className="schedule-name">{t.titel || '—'}</div>
              {t.bewohner  && <div className="schedule-who">🏥 {t.bewohner}</div>}
              {t.assignee  && <div className="schedule-who">👤 {t.assignee}</div>}
              <span className={priorityClass(t.prioritaet)}>{t.prioritaet || 'niedrig'}</span>
            </div>
          ))}
        </div>
        <div className="right-stats">
          <div className="right-stat"><div className="right-stat-val">{openTasks}</div><div className="right-stat-label">Offen</div></div>
          <div className="right-stat"><div className="right-stat-val">{doneTasks}</div><div className="right-stat-label">Erledigt</div></div>
          <div className="right-stat"><div className="right-stat-val">{notes.length}</div><div className="right-stat-label">Notizen</div></div>
        </div>
      </aside>

    </div>
  )
}
