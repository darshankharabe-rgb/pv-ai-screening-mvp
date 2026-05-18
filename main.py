import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware # Add this import
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')

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