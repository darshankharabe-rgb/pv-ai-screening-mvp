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
                    "authors": item.get("authorString", "Unknown Authors"),
                }
            )
        return {"results": results}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/screen")
async def screen_article(request: ArticleRequest):
    import json

    title = request.title or ""
    abstract = request.abstract or ""
    
    title_lower = title.lower()
    abstract_lower = abstract.lower()
    
    # Check if abstract is missing
    is_abstract_missing = not abstract.strip() or "no abstract available" in abstract_lower or "no abstract" in abstract_lower
    
    # Explicit case narrative check for title
    title_has_case_narrative = any(kw in title_lower for kw in [
        "case report", "case series", "case study", "patient", "developed", 
        "induced", "toxicity", "-year-old", "years old", "adverse reaction", "drug-induced"
    ]) or any(w in title_lower.split() for w in [
        "male", "female", "man", "woman", "boy", "girl", "infant", "neonate", "adolescent"
    ])
    
    # Check patient narrative in full text
    has_age_gender = "-year-old" in abstract_lower or "aged " in abstract_lower or "years old" in abstract_lower
    has_patient_words = any(w in abstract_lower.split() for w in [
        "male", "female", "man", "woman", "boy", "girl", "infant", "neonate", "patient"
    ])
    has_patient_narrative = has_age_gender or has_patient_words or any(sig in abstract_lower for sig in [
        "developed", "after receiving", "after initiation of", "was admitted", 
        "drug discontinued", "improved after withdrawal", "presented with", 
        "admitted to", "initiated on", "started on", "discontinued"
    ])
    
    auto_exclude_keywords = [
        "conference abstracts",
        "annual meeting",
        "poster session",
        "oral presentations",
        "proceedings",
        "supplement issue",
        "abstracts from the"
    ]
    has_auto_exclude_keywords = any(kw in abstract_lower or kw in title_lower for kw in auto_exclude_keywords)
    
    should_auto_exclude = False
    exclude_reason = ""
    
    if is_abstract_missing and not title_has_case_narrative:
        should_auto_exclude = True
        exclude_reason = "Excluded: Abstract is missing and title does not contain explicit case narrative."
    elif has_auto_exclude_keywords and not has_patient_narrative:
        should_auto_exclude = True
        exclude_reason = "Excluded: Conference proceeding / abstract collection without patient narrative."
        
    if should_auto_exclude:
        return {
            "result": json.dumps({
                "verdict": "NOT_RELEVANT",
                "confidence": 0.0,
                "reason": exclude_reason,
                "entities": {
                    "drug": None,
                    "adverse_event": None,
                    "patient": None,
                    "reporter": None
                }
            })
        }

    system_instruction = """You are a pharmacovigilance literature screening specialist.

Task:
Classify scientific abstracts or review queries for Individual Case Safety Report (ICSR) relevance.

A TRUE ICSR requires ALL FOUR:
1. Identifiable human patient
2. Suspect medicinal exposure
3. Adverse event/reaction
4. Identifiable reporter (authors/clinicians/publication)

==================================================
SPECIAL RULE — REVIEW QUERIES
==================================================

If the text is a pharmacovigilance/clinical/ADR review query
(e.g. “review rhabdomyolysis after atorvastatin”):

- Extract drug and adverse event
- verdict = "RELEVANT" or "CLOSELY_RELATED"
- confidence = 1.0
- concise reason only

==================================================
CLASSIFICATION
==================================================

"RELEVANT"
- Explicit patient-level ADR case(s)
- Case report/series
- Individual patient narrative

"CLOSELY_RELATED"
- Drug safety but not a full ICSR
- Clinical trials with aggregated AEs
- FAERS/VigiBase studies
- Cohort safety analyses
- Signal detection
- Interaction safety studies
- Post-marketing surveillance

"DISTANTLY_RELATED"
- General safety/toxicology discussion
- Reviews/editorials
- Animal/mechanistic/pharmacology studies

"NOT_RELEVANT"
- No meaningful drug safety relevance

"UNCERTAIN"
- Insufficient information

==================================================
RULES
==================================================

- Never hallucinate missing details
- Do not require exact drug names if exposure is reasonably implied
  (e.g. “lipid-lowering therapy”, “treated for infection”)
- Prefer conservative classification
- If unsure between RELEVANT and CLOSELY_RELATED:
  choose CLOSELY_RELATED

==================================================
ENTITY EXTRACTION
==================================================

Extract concise values only:
- drug
- adverse_event
- patient
- reporter

Use null if unavailable.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON:

{
  "verdict": "RELEVANT" | "CLOSELY_RELATED" | "DISTANTLY_RELATED" | "NOT_RELEVANT" | "UNCERTAIN",
  "confidence": 0.0,
  "reason": "concise explanation",
  "entities": {
    "drug": "...",
    "adverse_event": "...",
    "patient": "...",
    "reporter": "..."
  }
}

Confidence:
0.90-1.00 = explicit evidence
0.70-0.89 = strong partial evidence
0.40-0.69 = ambiguous
<0.40 = weak evidence

Now analyze the following abstract:"""

    user_prompt = f"Drug under surveillance: {request.drug_name}\nArticle title: {request.title}\nAbstract: {request.abstract}\nScreen this article and respond in JSON."

    try:
        response = get_model().generate_content(system_instruction + "\n\n" + user_prompt)
        return {"result": response.text}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
