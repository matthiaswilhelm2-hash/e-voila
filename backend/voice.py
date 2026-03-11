from fastapi import APIRouter, UploadFile, File, HTTPException
from openai import OpenAI
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import tempfile
import traceback
import json
import re
from datetime import datetime, timedelta
from dateutil import parser as dateparser

load_dotenv()

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_ANON_KEY")
)


def analyse_mit_gpt(transcript: str) -> dict:
    heute = datetime.now()
    heute_str = heute.strftime("%d.%m.%Y")
    wochentag = heute.strftime("%A")

    prompt = f"""
Du bist ein intelligenter CRM-Assistent. Analysiere folgende Sprachnotiz und antworte NUR mit einem JSON-Objekt.

Heute ist {wochentag}, der {heute_str}.

Sprachnotiz: "{transcript}"

Antworte mit diesem exakten JSON Format:
{{
  "kategorie": "Meeting|Idee|Task|Notiz|Erinnerung",
  "zusammenfassung": "Kurze Zusammenfassung in 1-2 Sätzen",
  "prioritaet": "hoch|mittel|niedrig",
  "stimmung": "positiv|neutral|negativ",
  "personen": ["Name1", "Name2"],
  "tasks": [
    {{
      "titel": "Task Titel",
      "beschreibung": "Was genau zu tun ist",
      "prioritaet": "hoch|mittel|niedrig",
      "due_date": "YYYY-MM-DD oder YYYY-MM-DDTHH:MM:SS oder null",
      "assignee": "Name der Person oder null",
      "uhrzeit": "HH:MM oder null"
    }}
  ]
}}

WICHTIGE REGELN für due_date:
- "heute" → {heute_str} als YYYY-MM-DD
- "morgen" → {(heute + timedelta(days=1)).strftime("%Y-%m-%d")}
- "übermorgen" → {(heute + timedelta(days=2)).strftime("%Y-%m-%d")}
- "nächste Woche" → {(heute + timedelta(days=7)).strftime("%Y-%m-%d")}
- "nächsten Montag/Dienstag/..." → berechne das korrekte Datum
- Konkrete Daten wie "19. März" oder "19.03." → als YYYY-MM-DD
- Wenn Uhrzeit genannt → kombiniere zu YYYY-MM-DDTHH:MM:SS
- Wenn kein Datum erkennbar → null

Erkenne auch Personen die genannt werden (Vor- und Nachname).
Antworte NUR mit dem JSON, kein Text davor oder danach.
"""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1
    )
    raw = response.choices[0].message.content.strip()

    # JSON säubern falls GPT Markdown-Blöcke zurückgibt
    if raw.startswith("```"):
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()

    return json.loads(raw)

def format_due_date(due_date_str: str) -> str | None:
    """Konvertiert verschiedene Datumsformate in ISO-Format für Supabase"""
    if not due_date_str or due_date_str == "null":
        return None
    try:
        # Bereits im richtigen Format
        if re.match(r"\d{4}-\d{2}-\d{2}", due_date_str):
            return due_date_str
        # Deutsches Format
        parsed = dateparser.parse(due_date_str, dayfirst=True)
        if parsed:
            return parsed.isoformat()
    except Exception:
        pass
    return None

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        suffix = ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # 1) Transkription mit Whisper
        with open(tmp_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=("recording.webm", audio_file, "audio/webm"),
                language="de"
            )

        # 2) Sprachnotiz in Supabase speichern
        result = supabase.table("voice_notes").insert({
            "transcript": transcript.text,
            "status": "neu"
        }).execute()

        note_id = result.data[0]["id"]

        # 3) GPT-4 Auswertung
        analyse = analyse_mit_gpt(transcript.text)

        # 4) Auswertung speichern
        supabase.table("ai_analysis").insert({
            "voice_note_id": note_id,
            "kategorie":     analyse.get("kategorie", "Notiz"),
            "zusammenfassung": analyse.get("zusammenfassung", ""),
            "prioritaet":    analyse.get("prioritaet", "mittel"),
            "stimmung":      analyse.get("stimmung", "neutral")
        }).execute()

        # 5) Tasks MIT due_date & assignee speichern
        tasks = analyse.get("tasks", [])
        saved_tasks = []
        for task in tasks:
            due_date = format_due_date(task.get("due_date"))
            assignee = task.get("assignee") or None

            # Personen aus tasks assignee befüllen
            personen = analyse.get("personen", [])
            if not assignee and personen:
                assignee = personen[0]

            task_data = {
                "voice_note_id": note_id,
                "titel":         task.get("titel", ""),
                "beschreibung":  task.get("beschreibung", ""),
                "prioritaet":    task.get("prioritaet", "mittel"),
                "status":        "offen",
            }

            if due_date:
                task_data["due_date"] = due_date
            if assignee:
                task_data["assignee"] = assignee

            res = supabase.table("tasks").insert(task_data).execute()
            saved_tasks.append(res.data[0] if res.data else task_data)

        os.unlink(tmp_path)

        return {
            "success":    True,
            "transcript": transcript.text,
            "id":         note_id,
            "analyse":    analyse,
            "tasks_saved": len(saved_tasks),
            "dates_found": [t.get("due_date") for t in tasks if t.get("due_date")]
        }

    except Exception as e:
        error_detail = traceback.format_exc()
        print("FEHLER:", error_detail)
        raise HTTPException(status_code=500, detail=error_detail)

@router.get("/notes")
async def get_notes():
    try:
        notes = supabase.table("voice_notes") \
            .select("*, ai_analysis(*), tasks(*)") \
            .order("created_at", desc=True) \
            .execute()
        return {"success": True, "data": notes.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks")
async def get_tasks():
    try:
        tasks = supabase.table("tasks") \
            .select("*, voice_notes(transcript)") \
            .order("created_at", desc=True) \
            .execute()
        return {"success": True, "data": tasks.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, payload: dict):
    try:
        data = {k: v for k, v in payload.items()
                if k in ("status", "assignee", "due_date", "titel", "beschreibung", "prioritaet")}
        supabase.table("tasks").update(data).eq("id", task_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
