-- ============================================================
-- E-Voila Pflege – SIS Aufnahme Felder
-- Migration: sis_data JSONB + sis_completed Boolean
-- ============================================================

-- SIS-Daten als JSONB auf dem residents-Datensatz
-- Enthält: was_bewegt_sie, diagnosen, mobilitaet,
--          selbstversorgung, kognition
alter table public.residents
  add column if not exists sis_data      jsonb   default '{}'::jsonb,
  add column if not exists sis_completed boolean default false;

-- Index für schnelle Suche in SIS-Daten
create index if not exists idx_residents_sis_data
  on public.residents using gin (sis_data);
