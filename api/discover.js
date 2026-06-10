// Serverless function. Runs on Vercel.
// Calls Google's Gemini API with Google Search grounding.
// Auto-retries on transient errors (503, 429).

const SYSTEM = `You are a creator discovery agent for an Indian marketing agency. The user gives filter criteria. Use Google Search to find REAL Instagram creators in India that match.

Search strategy:
- Search for: niche + city roundups, "top <niche> influencers <city> 2026", creator lists, media kits, agency rosters.
- Prefer recent sources (2025-2026). Indian creators specifically.

HARD RULES on honesty:
- NEVER invent Instagram handles, follower counts, or engagement rates.
- Only include a creator if web evidence shows they exist and roughly fit.
- If you cannot find a metric, use null. Do NOT estimate silently.
- Fewer verified creators is better than fabricated ones.
- "confidence" reflects how reliable/recent the data is: "high" (recent named source with numbers), "medium" (named but older or partial), "low" (mentioned but unverified numbers).
- "source" = the domain you found them on.
- followers and engagement_rate as plain numbers (engagement as a percent number, e.g. 4.2). null if unknown.
- "why_match" = one short clause on why they fit the brief.

Output ONLY a JSON array of creators wrapped exactly between <DATA> and </DATA>. No prose inside the tags. Schema per item:
{"handle":"@...","name":"...","followers":null|number,"engagement_rate":null|number,"niche":"...","location":"...","content_type":"...","why_match":"...","source":"...","confidence":"high|medium|low"}`;

function buildBrief(f) {
  const parts = [];
  if (f.niche) parts.push(`Niche: ${f.niche}`);
  if (f.location) parts.push(`Location: ${f.location}`);
  if (f.fMin || f.fMax) parts.push(`Followers: ${f.fMin || "any"} to ${f.fMax || "any"}`);
  if (f.engMin) parts.push(`Min engagement rate: ${f.engMin}%`);
  if (f.contentType && f.contentType !== "Any") parts.push(`Content type: ${f.contentType}`);
  if (f.brandSafe) parts.push("Must be brand-safe");
  if (f.exclude) parts.push(`Avoid creators with prior collabs for: ${f.exclude}`);
  if (f.notes) parts.push(`Other: ${f.notes}`);
  const n = Math.min(Math.max(parseInt(f.count) || 10, 1), 15);
  return `Find up to ${n} Indian Instagram creators matching:\n${parts.join("\n")}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGemini(key, brief, attempt = 1) {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: brief }] }],
      tools: [{ google_search: {} }],
      generationConfig: { maxOutputTokens: 4000, temperature: 0.3 },
    }),
  });

  // Retry on transient errors: 503 (overloaded), 429 (rate limit), 500 (server)
  if ((r.status === 503 || r.status === 429 || r.status === 500) && attempt < 4) {
    const wait = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
    await sleep(wait);
    return callGemini(key, brief, attempt + 1);
  }

  return r;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "Server missing GEMINI_API_KEY" });

  const filters = req.body?.filters || {};
  const brief = buildBrief(filters);

  try {
    const r = await callGemini(key, brief);

    if (!r.ok) {
      const detail = await r.text();
      let msg = `Gemini API error ${r.status}`;
      if (r.status === 503) msg += " — Google's servers are busy. Wait a minute and try again.";
      if (r.status === 429) msg += " — daily free quota hit. Try again tomorrow or upgrade.";
      return res.status(502).json({ error: msg, detail });
    }

    const data = await r.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("\n");

    let body = text;
    const tag = text.match(/<DATA>([\s\S]*?)<\/DATA>/);
    if (tag) body = tag[1];
    body = body.replace(/```(?:json)?/g, "").trim();

    const s = body.indexOf("[");
    const e = body.lastIndexOf("]");
    if (s === -1 || e === -1) {
      return res.status(200).json({ creators: [], note: "No creators returned. Broaden the filters." });
    }

    let creators = [];
    try {
      creators = JSON.parse(body.slice(s, e + 1));
    } catch {
      return res.status(200).json({ creators: [], note: "Could not parse results. Try again." });
    }

    return res.status(200).json({ creators: Array.isArray(creators) ? creators : [] });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Request failed" });
  }
}
