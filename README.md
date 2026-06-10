# Creator Discovery Agent

Web tool that finds Indian Instagram creators by filter (niche, location, follower range,
engagement, content type) using live Google Search via the Gemini API, and exports the
shortlist to CSV or Google Sheets.

## How it works

- Frontend (React + Vite) collects your filters.
- A serverless function (`api/discover.js`) holds your Gemini API key and runs the search
  server-side, so the key is never exposed in the browser.
- Gemini 2.5 Flash + Google Search grounding fetches real Indian creators matching the
  filters. Results render in a table with confidence flags; export to CSV or copy-paste
  into Sheets.

## Free tier usage

Gemini 2.5 Flash is free with rate limits, and Google Search grounding gives 5,000 free
grounded prompts per month. For per-campaign creator discovery, you will not pay anything
unless you run hundreds of searches per day.

Note: Free tier means Google may use your queries to improve their models. For creator
discovery this is fine. If you ever need stricter data handling, switch to the paid tier
in Google AI Studio.

## Deploy (Vercel, free tier)

1. Get a Gemini API key:
   - Go to https://aistudio.google.com
   - Sign in with your Google account.
   - Click "Get API key" in the left sidebar.
   - Click "Create API key", select or create a project, copy the key.
2. Push this folder to a GitHub repo.
3. Go to https://vercel.com, sign in with GitHub, click "Add New Project", import the repo.
4. Framework Preset: Vite.
5. Under Environment Variables, add:
   - Key: `GEMINI_API_KEY`
   - Value: the key you copied (starts with `AIza...`)
6. Click Deploy. You get a live URL.

## Run locally

```
npm install
npm run dev
```

For local API calls, install the Vercel CLI and run `vercel dev` with a `.env` file
containing `GEMINI_API_KEY=AIza...`. Plain `npm run dev` only serves the frontend.

## Notes

- Data is from public web sources and may be self-reported or dated. Verify figures before
  pitching. The tool flags low-confidence rows and leaves unknown metrics blank rather than
  guessing.
- This does NOT scrape Instagram. Gemini searches the open web (creator roundup articles,
  agency rosters, media kits, etc.).
