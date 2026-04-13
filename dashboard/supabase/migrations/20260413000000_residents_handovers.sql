-- ============================================================
-- E-Voila Pflege – Datenbankschema
-- Migration: Bewohner + Schichtübergaben
-- ============================================================

-- ── BEWOHNER ──────────────────────────────────────────────
create table if not exists public.residents (
  id            uuid        default gen_random_uuid() primary key,
  name          text        not null,
  room          text,
  care_level    int         check (care_level between 1 and 5),
  status        text        default 'stabil'
                            check (status in ('anfrage','aufnahme','eingewoehn','stabil','entlassung')),
  doctor        text,
  admission_date date,
  birth_date    date,
  notes         text,
  emergency_contact text,
  insurance     text,
  allergies     text,
  medications_info text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- RLS aktivieren
alter table public.residents enable row level security;
create policy "Allow all for authenticated" on public.residents
  for all using (auth.role() = 'authenticated');
-- Für lokale Entwicklung ohne Auth auch anon erlauben:
create policy "Allow anon read" on public.residents
  for select using (true);
create policy "Allow anon write" on public.residents
  for all using (true);

-- Beispiel-Bewohner
insert into public.residents (name, room, care_level, status, doctor, admission_date, birth_date, emergency_contact, insurance, allergies) values
  ('Hildegard Müller',  '101', 3, 'stabil',     'Dr. Weber', '2026-01-12', '1942-03-15', 'Tochter: 0176-1234567',  'AOK Bayern',         'Penicillin'),
  ('Ernst Hoffmann',    '102', 4, 'aufnahme',   'Dr. Braun', '2026-03-08', '1938-07-22', 'Sohn: 0151-9876543',     'Barmer',             NULL),
  ('Gertrude Schmidt',  '203', 2, 'eingewoehn', 'Dr. Weber', '2026-03-01', '1945-11-03', 'Ehemann: 089-123456',    'TK',                 'Aspirin'),
  ('Wilhelm Fischer',   '205', 5, 'stabil',     'Dr. Klein', '2025-11-15', '1935-05-08', 'Tochter: 0170-5551234',  'DAK',                NULL),
  ('Irmgard Bauer',     '301', 3, 'anfrage',    'Dr. Braun', NULL,         '1948-09-27', 'Sohn: 0162-7778899',     'AOK Rheinland',      NULL),
  ('Karl Zimmermann',   '302', 4, 'entlassung', 'Dr. Klein', '2025-09-20', '1940-12-01', 'Ehefrau: 089-654321',    'Knappschaft',        'Latex')
on conflict do nothing;

-- ── SCHICHTÜBERGABEN ──────────────────────────────────────
create table if not exists public.handovers (
  id                uuid        default gen_random_uuid() primary key,
  shift             text        not null
                                check (shift in ('frueh','spaet','nacht')),
  shift_date        date        not null default current_date,
  created_by        text,
  zusammenfassung   text,
  resident_summaries jsonb      default '[]'::jsonb,
  offene_aufgaben   jsonb       default '[]'::jsonb,
  dringend          jsonb       default '[]'::jsonb,
  medikamente       jsonb       default '[]'::jsonb,
  note_ids          uuid[]      default '{}',
  status            text        default 'draft'
                                check (status in ('draft','completed')),
  created_at        timestamptz default now()
);

alter table public.handovers enable row level security;
create policy "Allow all handovers" on public.handovers
  for all using (true);

-- ── VOICE NOTES erweitern (resident_id) ───────────────────
alter table public.voice_notes
  add column if not exists resident_id uuid references public.residents(id),
  add column if not exists shift       text check (shift in ('frueh','spaet','nacht'));

-- ── TASKS erweitern (resident_id) ─────────────────────────
alter table public.tasks
  add column if not exists resident_id uuid references public.residents(id);

-- ── UPDATED_AT TRIGGER für residents ──────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists residents_updated_at on public.residents;
create trigger residents_updated_at
  before update on public.residents
  for each row execute function public.handle_updated_at();
