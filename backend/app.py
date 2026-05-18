import os

import google.generativeai as genai
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="PV Literature Screening API")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ArticleRequest(BaseModel):
    drug_name: str
    title: str
    abstract: str


def get_model():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-2.5-flash")


@app.get("/")
async def health():
    return {"status": "ok", "service": "PV Literature Screening API"}


@app.get("/search")
async def search(query: str, limit: int = 120):
    url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
    params = {
        "query": query,
        "format": "json",
        "resultType": "core",
        "pageSize": min(max(limit, 1), 200),
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("resultList", {}).get("result", []):
            results.append(
                {
                    "title": item.get("title", "No Title"),
                    "abstract": item.get("abstractText", "No abstract available."),
                    "source": item.get("source", "MED"),
                    "pmid": item.get("pmid", ""),
                }
            )
        return {"results": results}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/screen")
async def screen_article(request: ArticleRequest):
    system_instruction = """
    You are an expert pharmacovigilance specialist. Your task is to screen scientific literature abstracts to identify Individual Case Safety Reports (ICSRs) - articles that describe an adverse drug reaction experienced by a real human patient.
    An article is RELEVANT if it contains ALL FOUR of:
    1. An identifiable patient (human, any age)
    2. Exposure to the suspect drug
    3. An adverse event or suspected adverse reaction
    4. A reporter (author, physician, or patient themselves)

    Respond ONLY with valid JSON in this exact format:
    {
      "verdict": "RELEVANT" | "NOT_RELEVANT" | "UNCERTAIN",
      "confidence": 0.0-1.0,
      "reason": "one sentence plain English",
      "entities": {
        "drug": "...",
        "adverse_event": "...",
        "patient": "...",
        "reporter": "..."
      }
    }
    """

    user_prompt = f"Drug under surveillance: {request.drug_name}\nArticle title: {request.title}\nAbstract: {request.abstract}\nScreen this article and respond in JSON."

    try:
        response = get_model().generate_content(system_instruction + "\n\n" + user_prompt)
        return {"result": response.text}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
