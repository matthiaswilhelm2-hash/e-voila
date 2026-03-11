import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import './CalendarView.css'

function priorityColor(p) {
  if (p === 'hoch')   return '#ef4444'
  if (p === 'mittel') return '#f59e0b'
  return '#1f5b3c'
}

export default function CalendarView({ tasks = [], onEventClick }) {
  const events = tasks
    .filter(t => t.due_date)
    .map(t => ({
      id:              String(t.id),
      title:           t.titel || 'Task',
      date:            t.due_date.split('T')[0],
      backgroundColor: priorityColor(t.prioritaet),
      borderColor:     'transparent',
      textColor:       '#ffffff',
      extendedProps:   { task: t },
    }))

  return (
    <div className="cal-wrapper">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="de"
        headerToolbar={{
          left:   'prev,next today',
          center: 'title',
          right:  'dayGridMonth,timeGridWeek',
        }}
        buttonText={{
          today:        'Heute',
          month:        'Monat',
          week:         'Woche',
        }}
        events={events}
        height="100%"
        editable={false}
        selectable={true}
        eventClick={(info) => {
          const t = info.event.extendedProps.task
          alert(
            `📋 ${t.titel}\n` +
            `👤 ${t.assignee || 'Niemand'}\n` +
            `📅 ${new Date(t.due_date).toLocaleDateString('de-DE')}\n` +
            `⚡ Priorität: ${t.prioritaet || '—'}\n\n` +
            `${t.beschreibung || ''}`
          )
        }}
        dayCellClassNames={(arg) => {
          const today = new Date()
          if (arg.date.toDateString() === today.toDateString()) return ['fc-today-custom']
          return []
        }}
      />
    </div>
  )
}
