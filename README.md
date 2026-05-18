<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ea6c0b32-44d0-4690-bacd-91fb7256236c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy on Vercel

Deploy this as two Vercel projects from the same GitHub repo.

### Backend project

1. Import the repo in Vercel.
2. Set **Root Directory** to `backend`.
3. Add environment variables:
   - `GEMINI_API_KEY`: your Gemini key
   - `ALLOWED_ORIGINS`: your frontend Vercel URL, or `*` while testing
4. Deploy. The backend exposes:
   - `GET /`
   - `GET /search`
   - `POST /screen`

### Frontend project

1. Import the same repo in Vercel.
2. Keep **Root Directory** as the repo root.
3. Framework preset should be **Vite**.
4. Add environment variable:
   - `VITE_API_BASE_URL`: the deployed backend URL from the backend project
5. Deploy or redeploy after setting the variable.
