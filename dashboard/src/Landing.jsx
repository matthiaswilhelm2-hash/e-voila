import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const C = {
  bg:       '#0a0f1e',
  card:     '#111827',
  border:   '#1e293b',
  green:    '#1f5b3c',
  greenLight:'#4caf82',
  greenBg:  'rgba(31,91,60,0.15)',
  text:     '#f1f5f9',
  sub:      '#94a3b8',
  white:    '#ffffff',
}

function NavLink({ children, href }) {
  return (
    <a href={href} style={{
      color: C.sub, textDecoration: 'none', fontSize: 14, fontWeight: 500,
      transition: 'color 0.2s',
    }}
    onMouseEnter={e => e.target.style.color = C.greenLight}
    onMouseLeave={e => e.target.style.color = C.sub}>
      {children}
    </a>
  )
}

function FeatureCard({ icon, title, desc, highlight }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#162032' : C.card,
        border: `1px solid ${hov ? C.greenLight + '60' : C.border}`,
        borderRadius: 16, padding: '28px 24px',
        transition: 'all 0.25s', cursor: 'default',
        position: 'relative', overflow: 'hidden',
      }}>
      {highlight && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: C.greenLight, color: '#fff',
          fontSize: 9, fontWeight: 800, padding: '3px 8px',
          borderRadius: 99, letterSpacing: 1,
        }}>NEU</div>
      )}
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: C.greenBg, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 22, marginBottom: 16,
        border: `1px solid ${C.green}40`,
      }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: C.text }}>{title}</div>
      <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.65 }}>{desc}</div>
    </div>
  )
}

function PainCard({ before, after, icon }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: '28px 24px',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ fontSize: 32, textAlign: 'center' }}>{icon}</div>
      <div style={{
        background: '#1e0a0a', border: '1px solid #3f1515',
        borderRadius: 10, padding: '12px 16px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', letterSpacing: 1, marginBottom: 6 }}>VORHER</div>
        <div style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.6 }}>{before}</div>
      </div>
      <div style={{ textAlign: 'center', color: C.greenLight, fontSize: 18 }}>↓</div>
      <div style={{
        background: '#0a1e12', border: '1px solid #1f5b3c',
        borderRadius: 10, padding: '12px 16px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.greenLight, letterSpacing: 1, marginBottom: 6 }}>MIT E-VOILA</div>
        <div style={{ fontSize: 13, color: '#86efac', lineHeight: 1.6 }}>{after}</div>
      </div>
    </div>
  )
}

function PricingCard({ name, price, desc, features, highlight, ctaText, onCta }) {
  return (
    <div style={{
      background: highlight ? 'linear-gradient(135deg, #1f5b3c22, #0f172a)' : C.card,
      border: `2px solid ${highlight ? C.greenLight : C.border}`,
      borderRadius: 20, padding: '32px 28px',
      position: 'relative', flex: 1,
      display: 'flex', flexDirection: 'column',
    }}>
      {highlight && (
        <div style={{
          position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(90deg, #1f5b3c, #4caf82)',
          color: '#fff', fontSize: 10, fontWeight: 800,
          padding: '4px 16px', borderRadius: 99, letterSpacing: 1, whiteSpace: 'nowrap',
        }}>BELIEBTESTE WAHL</div>
      )}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: C.text }}>{name}</div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>{desc}</div>
      </div>
      <div style={{ margin: '20px 0' }}>
        <span style={{ fontSize: 38, fontWeight: 900, color: highlight ? C.greenLight : C.text }}>{price}</span>
        {price !== 'Individuell' && <span style={{ fontSize: 13, color: C.sub }}> / Monat</span>}
      </div>
      <div style={{ flex: 1, marginBottom: 24 }}>
        {features.map((f, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            fontSize: 13, color: f.disabled ? C.sub : C.text,
            padding: '7px 0',
            borderBottom: i < features.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <span style={{ color: f.disabled ? '#374151' : C.greenLight, flexShrink: 0 }}>
              {f.disabled ? '✕' : '✓'}
            </span>
            {f.label}
          </div>
        ))}
      </div>
      <button onClick={onCta} style={{
        background: highlight
          ? 'linear-gradient(135deg, #1f5b3c, #2d7a54)'
          : 'transparent',
        border: `2px solid ${highlight ? 'transparent' : C.border}`,
        color: highlight ? '#fff' : C.text,
        borderRadius: 10, padding: '13px 0', width: '100%',
        fontWeight: 700, fontSize: 14, cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        if (!highlight) { e.target.style.borderColor = C.greenLight; e.target.style.color = C.greenLight }
      }}
      onMouseLeave={e => {
        if (!highlight) { e.target.style.borderColor = C.border; e.target.style.color = C.text }
      }}>
        {ctaText}
      </button>
    </div>
  )
}

function StatBox({ value, label }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 40, fontWeight: 900, color: C.greenLight, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: C.sub, marginTop: 6, maxWidth: 120, margin: '6px auto 0' }}>{label}</div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function goToApp() { navigate('/login') }

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── NAVIGATION ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: `${C.bg}ee`, backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        padding: '0 5vw', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: C.green, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 13,
          }}>EV</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>E-Voila Pflege</div>
            <div style={{ fontSize: 10, color: C.sub, marginTop: -2 }}>KI-Pflegedokumentation</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#how">So funktionierts</NavLink>
            <NavLink href="#pricing">Preise</NavLink>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/login')} style={{
              background: 'none', border: `1px solid ${C.border}`,
              color: C.text, borderRadius: 8, padding: '8px 16px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Anmelden</button>
            <button onClick={goToApp} style={{
              background: 'linear-gradient(135deg, #1f5b3c, #2d7a54)',
              border: 'none', color: '#fff', borderRadius: 8,
              padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>Kostenlos testen →</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        padding: 'clamp(60px, 10vw, 120px) 5vw',
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: C.greenBg, border: `1px solid ${C.green}60`,
          borderRadius: 99, padding: '6px 16px', marginBottom: 28,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.greenLight, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.greenLight, fontWeight: 600 }}>
            KI-gestützte Pflege · Jetzt live
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 68px)',
          fontWeight: 900, lineHeight: 1.1,
          letterSpacing: -1, margin: '0 0 20px',
          maxWidth: 800,
        }}>
          Pflege dokumentieren –{' '}
          <span style={{
            background: 'linear-gradient(90deg, #4caf82, #1f9e6a)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            so schnell wie sprechen
          </span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2vw, 20px)', color: C.sub,
          maxWidth: 600, lineHeight: 1.7, margin: '0 0 40px',
        }}>
          E-Voila wandelt Sprachnotizen automatisch in strukturierte Pflegedokumentation um.
          Schichtübergaben in 5 Minuten statt 45. Mehr Zeit für Ihre Bewohner.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 60 }}>
          <button onClick={goToApp} style={{
            background: 'linear-gradient(135deg, #1f5b3c, #2d7a54)',
            border: 'none', color: '#fff', borderRadius: 12,
            padding: '15px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(31,91,60,0.4)',
          }}>
            🎙 Jetzt kostenlos starten
          </button>
          <a href="#how" style={{
            background: 'none', border: `1px solid ${C.border}`,
            color: C.text, borderRadius: 12, padding: '15px 24px',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            ▶ Demo ansehen
          </a>
        </div>

        {/* Mockup-Vorschau */}
        <div style={{
          width: '100%', maxWidth: 900,
          background: C.card, borderRadius: 20,
          border: `1px solid ${C.border}`,
          overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}>
          {/* Browser-Bar */}
          <div style={{
            background: '#0d1520', padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: `1px solid ${C.border}`,
          }}>
            {['#ef4444','#f59e0b','#22c55e'].map((c, i) => (
              <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
            ))}
            <div style={{
              flex: 1, background: '#1e293b', borderRadius: 6,
              padding: '4px 12px', fontSize: 11, color: C.sub, marginLeft: 8,
            }}>
              pflege.evoila.de/dashboard
            </div>
          </div>
          {/* App-Screenshot simuliert */}
          <div style={{ padding: 24, display: 'flex', gap: 16 }}>
            <div style={{ flex: '0 0 48px' }}>
              {['⊞','🏥','✓','📅','🎙','🤖','🔄'].map((icon, i) => (
                <div key={i} style={{
                  width: 38, height: 38, borderRadius: 10, marginBottom: 6,
                  background: i === 0 ? C.greenBg : 'transparent',
                  border: `1px solid ${i === 0 ? C.green : 'transparent'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: i === 0 ? C.greenLight : C.sub,
                }}>{icon}</div>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { icon: '🏥', val: '24', label: 'Bewohner', color: '#16a34a' },
                  { icon: '✓', val: '7', label: 'Offene Tasks', color: '#2563eb' },
                  { icon: '🔥', val: '2', label: 'Dringend', color: '#dc2626' },
                  { icon: '🛏', val: '80%', label: 'Belegung', color: '#7c3aed' },
                ].map((k, i) => (
                  <div key={i} style={{
                    background: '#0f172a', borderRadius: 10,
                    padding: '12px', border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ fontSize: 10, color: C.sub }}>{k.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#0f172a', borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 10 }}>LETZTE NOTIZEN</div>
                  {['Frau Müller hatte heute Schmerzen im Knie','Vitalzeichen Zimmer 203 kontrolliert','Medikament Metformin verabreicht'].map((n, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, fontSize: 11, color: C.sub }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.greenLight, flexShrink: 0, marginTop: 4 }} />
                      {n}
                    </div>
                  ))}
                </div>
                <div style={{ background: '#0f172a', borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 10 }}>KI-ANALYSE</div>
                  {[
                    { kat: 'Arzttermin', prio: 'hoch', conf: 96 },
                    { kat: 'Vitalzeichen', prio: 'mittel', conf: 94 },
                    { kat: 'Medikation', prio: 'hoch', conf: 98 },
                  ].map((a, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11 }}>
                      <span style={{ color: C.sub }}>{a.kat}</span>
                      <span style={{ color: C.greenLight, fontWeight: 700 }}>{a.conf}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATISTIKEN ── */}
      <section style={{
        borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
        padding: '48px 5vw',
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'flex', justifyContent: 'space-around',
          flexWrap: 'wrap', gap: 32,
        }}>
          <StatBox value="30%" label="weniger Dokumentationszeit" />
          <div style={{ width: 1, background: C.border }} />
          <StatBox value="5 Min" label="statt 45 Min Schichtübergabe" />
          <div style={{ width: 1, background: C.border }} />
          <StatBox value="98%" label="KI-Erkennungsgenauigkeit" />
          <div style={{ width: 1, background: C.border }} />
          <StatBox value="24/7" label="verfügbar, cloud-basiert" />
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section style={{ padding: 'clamp(60px, 8vw, 100px) 5vw', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.greenLight, letterSpacing: 2, marginBottom: 12 }}>
            DAS PROBLEM
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: 0 }}>
            Kennen Sie diese Situation?
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <PainCard
            icon="📝"
            before="3–4 Stunden täglich mit handschriftlicher Dokumentation verbringen. Abends nach der Schicht Berge von Formularen ausfüllen."
            after="Einfach während der Pflege draufsprechen. Die KI erstellt automatisch strukturierte Einträge – in Sekunden."
          />
          <PainCard
            icon="🔄"
            before="45-minütige Schichtübergaben mit unvollständigen Informationen. Wichtige Details gehen verloren."
            after="KI generiert in 30 Sekunden eine vollständige Übergabe aus allen Sprachnotizen des Dienstes."
          />
          <PainCard
            icon="⚠️"
            before="Medikamentenfehler durch unleserliche Notizen. Kein zentrales System für alle Pflegekräfte."
            after="Sprachbasiertes Medikamenten-Tracking mit automatischer Kategorisierung und Erinnerungen."
          />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{
        padding: 'clamp(60px, 8vw, 100px) 5vw',
        background: '#0d1520', maxWidth: '100%',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.greenLight, letterSpacing: 2, marginBottom: 12 }}>
              FEATURES
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: 0 }}>
              Alles was Ihr Pflegeteam braucht
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <FeatureCard
              icon="🎙"
              title="Sprachnotizen in Echtzeit"
              desc="Einfach draufsprechen während der Pflege. Whisper KI erkennt Deutsch mit 98% Genauigkeit – auch Fachbegriffe."
            />
            <FeatureCard
              icon="🤖"
              title="Intelligente KI-Analyse"
              desc="GPT-4 extrahiert automatisch Kategorie, Priorität, Bewohnername, Aufgaben und Termine aus jeder Sprachnotiz."
            />
            <FeatureCard
              icon="🔄"
              title="KI-Schichtübergabe"
              desc="Die Killer-Funktion: Alle Notizen des Dienstes werden zu einer strukturierten Übergabe zusammengefasst. 45 Min → 5 Min."
              highlight
            />
            <FeatureCard
              icon="✓"
              title="Automatische Task-Erstellung"
              desc="Erkennt die KI eine Aufgabe in der Notiz, erstellt sie sofort einen Task mit Priorität, Bewohner und Fälligkeit."
            />
            <FeatureCard
              icon="🏥"
              title="Bewohnerverwaltung"
              desc="Zentrale Akte je Bewohner mit Pflegegrad, Arzt, Medikamenten, Angehörigen und gesamter Pflegehistorie."
            />
            <FeatureCard
              icon="📊"
              title="MDK-konforme Berichte"
              desc="Exportiert Pflegeberichte im Format der MDK-Prüfungen. Dokumentationsnachweis auf Knopfdruck."
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ padding: 'clamp(60px, 8vw, 100px) 5vw', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.greenLight, letterSpacing: 2, marginBottom: 12 }}>
            SO FUNKTIONIERTS
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: 0 }}>
            In 3 Schritten zur vollständigen Dokumentation
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
          {[
            {
              step: '01', icon: '🎙',
              title: 'Sprechen',
              desc: 'Pflegekraft spricht einfach drauflos – während der Pflege, beim Händewaschen, nach der Medikamentengabe. Kein Tippen nötig.',
              detail: '"Frau Müller hatte heute Knieschmerzen, bitte Arzt informieren"',
            },
            {
              step: '02', icon: '🤖',
              title: 'KI analysiert',
              desc: 'Whisper transkribiert die Sprache. GPT-4 erkennt automatisch: Bewohner, Kategorie, Priorität, nächste Schritte.',
              detail: 'Kategorie: Arzttermin · Priorität: hoch · Bewohner: Fr. Müller',
            },
            {
              step: '03', icon: '✅',
              title: 'Dokumentiert',
              desc: 'Notiz, KI-Analyse und Task landen automatisch in der richtigen Bewohnerakte. Kein weiteres Zutun nötig.',
              detail: 'Task erstellt · Akte aktualisiert · Übergabe vorbereitet',
            },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: C.greenBg, border: `2px solid ${C.green}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, margin: '0 auto',
                }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32,
                }}>{s.icon}</div>
                <div style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 26, height: 26, borderRadius: '50%',
                  background: C.greenLight, color: '#fff',
                  fontSize: 10, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{s.step}</div>
              </div>
              <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>{s.title}</h3>
              <p style={{ color: C.sub, fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>{s.desc}</p>
              <div style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '10px 14px',
                fontSize: 11, color: C.greenLight,
                fontFamily: 'monospace',
              }}>{s.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ÜBERGABE HIGHLIGHT ── */}
      <section style={{
        background: 'linear-gradient(135deg, #0a1e12, #0a0f1e)',
        border: `1px solid ${C.green}40`,
        margin: '0 5vw', borderRadius: 24, padding: 'clamp(40px, 6vw, 80px)',
        marginBottom: 80,
        maxWidth: 1020, marginLeft: 'auto', marginRight: 'auto',
      }}>
        <div style={{ display: 'flex', gap: 60, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{
              display: 'inline-block', fontSize: 10, fontWeight: 800,
              color: C.greenLight, letterSpacing: 2, marginBottom: 16,
              background: C.greenBg, padding: '4px 12px', borderRadius: 99,
            }}>KILLER-FEATURE</div>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 900, lineHeight: 1.2, marginBottom: 16 }}>
              KI-Schichtübergabe<br />in 30 Sekunden
            </h2>
            <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              Am Ende jedes Dienstes fasst die KI alle Sprachnotizen automatisch zusammen:
              je Bewohner, nach Priorität sortiert, mit offenen Tasks für die nächste Schicht.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                '✓ Automatische Zusammenfassung aller Notizen',
                '✓ Bewohnerbezogene Ereignisübersicht',
                '✓ Offene Tasks für nächste Schicht',
                '✓ Dringende Hinweise hervorgehoben',
                '✓ Druckbar und archivierbar',
              ].map((f, i) => (
                <div key={i} style={{ fontSize: 13, color: C.text }}>{f}</div>
              ))}
            </div>
          </div>
          <div style={{ flex: '0 0 320px', minWidth: 260 }}>
            <div style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: 20, fontSize: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: C.greenLight }}>🔄 Schichtübergabe – Spätdienst</div>
                <span style={{ fontSize: 10, color: C.sub }}>13.04.2026</span>
              </div>
              <div style={{ color: C.sub, fontSize: 11, lineHeight: 1.7, marginBottom: 14, background: '#0f172a', borderRadius: 8, padding: 12 }}>
                Ruhiger Dienst. Frau Müller klagte über Knieschmerzen – Arzt wurde informiert. Alle Medikamente regulär verabreicht.
              </div>
              {[
                { name: 'Hildegard Müller', status: 'hoch', event: 'Knieschmerzen – Arzt informiert' },
                { name: 'Ernst Hoffmann', status: 'mittel', event: 'Blutdruck 160/90 – beobachten' },
                { name: 'Wilhelm Fischer', status: 'niedrig', event: 'Ruhige Nacht, gut geschlafen' },
              ].map((b, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, padding: '8px 0',
                  borderBottom: i < 2 ? `1px solid ${C.border}` : 'none',
                }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                    background: b.status === 'hoch' ? '#ef4444' : b.status === 'mittel' ? '#f59e0b' : '#22c55e',
                  }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                    <div style={{ color: C.sub, fontSize: 10 }}>{b.event}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: 'clamp(60px, 8vw, 100px) 5vw' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.greenLight, letterSpacing: 2, marginBottom: 12 }}>
              PREISE
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: '0 0 12px' }}>
              Transparent. Skalierbar. Fair.
            </h2>
            <p style={{ color: C.sub, fontSize: 14 }}>Alle Pläne inkl. 30 Tage kostenloser Test. Keine Kreditkarte erforderlich.</p>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            <PricingCard
              name="Starter"
              price="149€"
              desc="Für kleine Pflegedienste"
              highlight={false}
              ctaText="Kostenlos testen"
              onCta={goToApp}
              features={[
                { label: 'Bis 20 Bewohner' },
                { label: '5 Mitarbeiter-Zugänge' },
                { label: 'Sprachnotizen & KI-Analyse' },
                { label: 'Task-Management' },
                { label: 'Kalender' },
                { label: 'KI-Schichtübergabe', disabled: true },
                { label: 'MDK-Export', disabled: true },
              ]}
            />
            <PricingCard
              name="Professional"
              price="299€"
              desc="Für Pflegeheime bis 60 Bewohner"
              highlight
              ctaText="Jetzt starten →"
              onCta={goToApp}
              features={[
                { label: 'Bis 60 Bewohner' },
                { label: '15 Mitarbeiter-Zugänge' },
                { label: 'Sprachnotizen & KI-Analyse' },
                { label: 'Task-Management & Kalender' },
                { label: 'KI-Schichtübergabe (Killer-Feature)' },
                { label: 'Medikamenten-Tracking' },
                { label: 'MDK-konforme Berichte' },
              ]}
            />
            <PricingCard
              name="Enterprise"
              price="Individuell"
              desc="Für große Träger & Ketten"
              highlight={false}
              ctaText="Kontakt aufnehmen"
              onCta={() => window.location.href = 'mailto:hallo@evoila-pflege.de'}
              features={[
                { label: 'Unbegrenzte Bewohner' },
                { label: 'Unbegrenzte Zugänge' },
                { label: 'Alle Professional-Features' },
                { label: 'API-Anbindung (PVS/KIS)' },
                { label: 'Datev-Export' },
                { label: 'Dedicated Support & SLA' },
                { label: 'On-Premise Option' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{
        background: 'linear-gradient(135deg, #1f5b3c, #0a3322)',
        margin: '0 5vw 80px', borderRadius: 24,
        padding: 'clamp(40px, 6vw, 72px)',
        maxWidth: 1020, marginLeft: 'auto', marginRight: 'auto',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, margin: '0 0 16px', color: '#fff' }}>
          Bereit, Ihre Pflege zu digitalisieren?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, marginBottom: 36 }}>
          Jetzt kostenlos 30 Tage testen. Keine Kreditkarte, kein Risiko.
        </p>
        <button onClick={goToApp} style={{
          background: '#fff', color: C.green,
          border: 'none', borderRadius: 12,
          padding: '16px 40px', fontSize: 15, fontWeight: 800,
          cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          🎙 Kostenlos starten – in 2 Minuten eingerichtet
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: `1px solid ${C.border}`,
        padding: '32px 5vw',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, background: C.green,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 10,
          }}>EV</div>
          <span style={{ fontSize: 13, fontWeight: 700 }}>E-Voila Pflege</span>
          <span style={{ fontSize: 12, color: C.sub }}>· KI-Pflegedokumentation</span>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 12, color: C.sub }}>
          <a href="#" style={{ color: C.sub, textDecoration: 'none' }}>Datenschutz</a>
          <a href="#" style={{ color: C.sub, textDecoration: 'none' }}>Impressum</a>
          <a href="#" style={{ color: C.sub, textDecoration: 'none' }}>AGB</a>
          <a href="mailto:hallo@evoila-pflege.de" style={{ color: C.sub, textDecoration: 'none' }}>Kontakt</a>
        </div>
        <div style={{ fontSize: 11, color: C.sub }}>
          © 2026 E-Voila Pflege · DSGVO-konform · Hosting in Deutschland
        </div>
      </footer>

    </div>
  )
}
