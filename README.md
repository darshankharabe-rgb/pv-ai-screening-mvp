

# Run and deploy your app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy on Vercel (Single Project)

This project is pre-configured to deploy both the React frontend and the FastAPI backend as **one single Vercel project**. 

1. **Import the repository** in Vercel.
2. Keep the **Root Directory** as the repository root (do not select `backend` or `api`).
3. Vercel will automatically detect the **Vite** framework preset for the frontend.
4. Add the following **Environment Variables** in the Vercel dashboard:
   - `GEMINI_API_KEY`: Your Gemini API key.
5. Click **Deploy**.

### How it works:
- **Frontend**: Built from the root directory using Vite and served statically.
- **Backend**: Built from the `/api` directory as Python serverless functions.
- **Routing**: `vercel.json` rewrites all requests matching `/api/*` to `api/index.py`, which maps them to the FastAPI app. Because requests are relative (e.g. `/api/screen`), there is no need to configure CORS or custom API domain variables.
