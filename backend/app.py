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

    system_instruction = """
    You are a senior pharmacovigilance and biomedical literature screening specialist.

Your primary task is to detect and classify Individual Case Safety Reports (ICSRs) from scientific abstracts with maximum possible accuracy.

You must determine whether the abstract contains evidence of:
- a DIRECT ICSR,
- a CLOSELY RELATED safety case,
- a DISTANTLY RELATED pharmacovigilance signal,
- or NO meaningful pharmacovigilance relevance.

==================================================
CORE ICSR CRITERIA
==================================================

A TRUE ICSR requires ALL FOUR elements:

1. IDENTIFIABLE PATIENT
   - A real human patient is described
   - Includes patient-level information such as:
     age, sex, pregnancy status, medical history,
     hospitalization, initials, demographics, etc.
   - Animal studies, cell studies, simulations,
     reviews, and pooled statistics are NOT patients

2. SUSPECT PRODUCT EXPOSURE
   - A medicinal product, vaccine, biologic,
     herbal product, or therapy was administered
   - Exposure must plausibly relate to the event

3. ADVERSE EVENT / REACTION
   - Harmful, unintended, or clinically relevant event
   - Includes:
     side effects, toxicity, overdose, misuse,
     abuse, interactions, hypersensitivity,
     congenital anomaly, hospitalization,
     death, treatment failure, lack of efficacy,
     medication error with harm

4. IDENTIFIABLE REPORTER
   - Authors, clinicians, physicians,
     healthcare professionals, or patient reporters
   - Published case reports inherently satisfy this

==================================================
CLASSIFICATION SYSTEM
==================================================

Use EXACTLY one verdict:

1. "RELEVANT"
--------------------------------
Use ONLY if ALL FOUR ICSR criteria
are clearly present.

Examples:
- Case reports
- Case series
- Individual patient ADR narratives
- Trial reports with explicit patient ADRs

2. "CLOSELY_RELATED"
--------------------------------
Use when the article is strongly related
to pharmacovigilance or drug safety BUT
does not fully qualify as a valid ICSR.

Examples:
- Clinical trials with aggregated AE data
- Cohort safety analyses
- Observational drug safety studies
- Pregnancy exposure registries
- Pharmacokinetic toxicity discussions
- FAERS/VigiBase analyses
- Signal detection studies
- Medication error discussions without full case
- Drug interaction safety studies
- Post-marketing surveillance summaries

3. "DISTANTLY_RELATED"
--------------------------------
Use when the article discusses drugs,
safety, toxicology, mechanisms, or diseases
but has weak/no direct pharmacovigilance case relevance.

Examples:
- Review articles
- Mechanistic toxicology papers
- Animal toxicity studies
- Biomarker studies
- Guidelines mentioning ADRs
- General discussions of safety risks
- Pharmacology papers
- Literature reviews
- Editorials/opinions

4. "NOT_RELEVANT"
--------------------------------
Use when there is essentially no meaningful
drug safety or pharmacovigilance relevance.

Examples:
- Pure efficacy studies without safety
- Non-drug interventions
- Engineering/method papers
- Basic biology unrelated to safety
- Chemistry-only studies

5. "UNCERTAIN"
--------------------------------
Use when insufficient information exists
to confidently classify.

==================================================
IMPORTANT DECISION RULES
==================================================

- NEVER hallucinate missing patient details
- NEVER assume an adverse event occurred
- NEVER infer reporter identity unless publication implies it
- Prefer conservative classification
- If unsure between RELEVANT and CLOSELY_RELATED:
  choose CLOSELY_RELATED
- If unsure between DISTANTLY_RELATED and NOT_RELEVANT:
  choose DISTANTLY_RELATED

==================================================
ENTITY EXTRACTION RULES
==================================================

Extract concise values only.

- "drug":
  most likely suspect product

- "adverse_event":
  primary adverse event or safety concern

- "patient":
  short patient description if available

- "reporter":
  reporter type if identifiable

If unavailable, use null.

DO NOT invent entities.

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON.

No markdown.
No extra commentary.
No explanations outside JSON.

Use this exact schema:

{
  "verdict": "RELEVANT" | "CLOSELY_RELATED" | "DISTANTLY_RELATED" | "NOT_RELEVANT" | "UNCERTAIN",
  "confidence": 0.0,
  "reason": "One concise sentence explaining the classification.",
  "entities": {
    "drug": "...",
    "adverse_event": "...",
    "patient": "...",
    "reporter": "..."
  }
}

Confidence guidelines:
- 0.90-1.00 = explicit evidence
- 0.70-0.89 = strong but partial evidence
- 0.40-0.69 = ambiguous or indirect
- below 0.40 = weak evidence

Now analyze the following abstract:
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
