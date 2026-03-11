from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv
import os
from voice import router as voice_router

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(
    title="E-Voila API",
    description="Voice-First Backend für E-Voila",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_router, prefix="/voice", tags=["Voice"])

@app.get("/")
def root():
    return {"message": "E-Voila API läuft! 🎙️"}

@app.get("/health")
def health():
    return {"status": "ok", "supabase": "verbunden ✅"}
