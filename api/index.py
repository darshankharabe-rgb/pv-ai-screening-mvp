from fastapi import FastAPI
from backend.app import app as backend_app

# Create a top-level app to handle routing on Vercel
app = FastAPI()

# Mount the backend app under the "/api" prefix
app.mount("/api", backend_app)
