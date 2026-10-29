// Scene Talk server: serves the app and relays requests to the Gemini API.
// The API key stays on the server (GEMINI_API_KEY) and is never sent to the browser.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

// Models. Override with env vars if Google renames or retires one.
const MODEL_DEFAULT = process.env.GEMINI_MODEL || "gemini-3.6-flash";        // review notes (structured JSON)
const MODEL_QUICK = process.env.GEMINI_MODEL_QUICK || "gemini-3.5-flash-lite"; // live conversation turns, hints
const MODEL_FALLBACK = process.env.GEMINI_MODEL_FALLBACK || "gemini-2.5-flash";

if (!API_KEY) console.warn("[scene-talk] GEMINI_API_KEY is not set. AI requests will fail.");
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// [{role:"user"|"assistant", content}] -> Gemini contents, merging same-role neighbours.
function toContents(messages) {
  const out = [];
  for (const m of messages || []) {
    const text = String(m?.content ?? "").trim();
    if (!text) continue;
    const role = m.role === "assistant" ? "model" : "user";
    const last = out[out.length - 1];
    if (last && last.role === role) last.parts[0].text += "\n\n" + text;
    else out.push({ role, parts: [{ text }] });
  }
  if (out.length && out[out.length - 1].role !== "user") out.push({ role: "user", parts: [{ text: "(continue)" }] });
  return out;
}

async function generate(tier, contents, config = {}) {
  if (!ai) throw Object.assign(new Error("GEMINI_API_KEY is not set"), { code: "not_granted", status: 500 });
  const primary = tier === "quick" ? MODEL_QUICK : MODEL_DEFAULT;
  try {
    return await ai.models.generateContent({ model: primary, contents, config });
  } catch (e) {
    const status = e?.status ?? e?.code;
    if (status === 404 && primary !== MODEL_FALLBACK) {
      console.warn(`[scene-talk] model ${primary} not found, using ${MODEL_FALLBACK}`);
      return await ai.models.generateContent({ model: MODEL_FALLBACK, contents, config });
    }
    throw e;
  }
}

function sendError(res, e) {
  const status = Number(e?.status) || 500;
  const code = e?.code && typeof e.code === "string" ? e.code : status === 429 ? "rate_limited" : "upstream_error";
  console.error("[scene-talk]", status, e?.message || e);
  res.status(status === 429 ? 429 : 500).json({ code, error: String(e?.message || "AI request failed") });
}

// Conversation turns and hints: plain text reply.
app.post("/api/chat", async (req, res) => {
  try {
    const contents = toContents(req.body?.messages);
    if (!contents.length) return res.status(400).json({ code: "invalid_request", error: "messages required" });
    const r = await generate(req.body?.tier, contents, { temperature: 0.9 });
    res.json({ text: r.text ?? "", truncated: r.candidates?.[0]?.finishReason === "MAX_TOKENS" });
  } catch (e) { sendError(res, e); }
});

// Review notes and hint lists: JSON reply.
app.post("/api/json", async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "");
    if (!prompt) return res.status(400).json({ code: "invalid_request", error: "prompt required" });
    const r = await generate(req.body?.tier, [{ role: "user", parts: [{ text: prompt }] }], {
      responseMimeType: "application/json",
      temperature: 0.4,
    });
    const raw = (r.text ?? "").trim();
    let value;
    try { value = JSON.parse(raw); }
    catch {
      const m = raw.match(/[\[{][\s\S]*[\]}]/);
      try { value = m ? JSON.parse(m[0]) : undefined; } catch {}
    }
    if (value === undefined) return res.status(500).json({ code: "invalid_json", error: "Could not parse JSON reply" });
    res.json({ value });
  } catch (e) { sendError(res, e); }
});

app.listen(PORT, () => console.log(`[scene-talk] http://localhost:${PORT}`));
