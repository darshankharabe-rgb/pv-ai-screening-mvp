import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware # Add this import
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash-lite')

app = FastAPI(title="PV Literature Screening API")

# --- Add this CORS block to allow your website to connect ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, put your actual website URL here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -----------------------------------------------------------

class ArticleRequest(BaseModel):
    drug_name: str
    title: str
    abstract: str

@app.get("/search")
async def search(query: str, limit: int = 5):
    url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
    params = {
        "query": query,
        "format": "json",
        "resultType": "core",
        "pageSize": limit
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
        results = []
        for item in data.get('resultList', {}).get('result', []):
            results.append({
                "title": item.get('title', 'No Title'),
                "abstract": item.get('abstractText', 'No abstract available.'),
                "source": item.get('source', 'MED'),
                "pmid": item.get('pmid', ''),
            })
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ... (Keep your @app.post("/screen") route exactly the same below this) ...
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
        response = model.generate_content(system_instruction + "\n\n" + user_prompt)
        return {"result": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))