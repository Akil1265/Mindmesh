import 'dotenv/config'
import { GoogleGenerativeAI } from '@google/generative-ai'

// --- Provider bootstrap (Gemini) ---
const apiKey = process.env.GEMINI_API_KEY
// Default to a stable, widely supported model to avoid 404s on v1beta
const requestedModel = process.env.GEMINI_MODEL || 'gemini-pro'
// Ordered fallback preference list (attempt in sequence until one initializes)
// Start with stable models that work reliably on v1beta API
const GEMINI_MODEL_CANDIDATES = [
  requestedModel,
  'gemini-pro',
  'gemini-1.0-pro',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
]
let geminiModel = null
if (apiKey) {
  for (const m of GEMINI_MODEL_CANDIDATES) {
    if (geminiModel) break
    try {
  const genAI = new GoogleGenerativeAI(apiKey)
  geminiModel = genAI.getGenerativeModel({ model: m })
  console.log(`[summarizeProvider] Gemini model initialized: ${m}`)
    } catch (e) {
      console.warn(`[summarizeProvider] Gemini model init failed for ${m}: ${e.message}`)
    }
  }
  if (!geminiModel) console.error('All Gemini model initialization attempts failed. Falling back to local summarizer.')
} else {
  console.warn('GEMINI_API_KEY not set. Gemini provider unavailable; using local fallback.')
}

// --- Styles configuration ---
const STYLE_TARGETS = {
  short: { sentences: 3, maxWords: 90 },
  medium: { sentences: 6, maxWords: 180 },
  long: { sentences: 12, maxWords: 360 },
}

// --- Public API ---
export async function summarize(text, { provider = 'gemini', style = 'short' } = {}) {
  const cleaned = (text || '').trim()
  if (!cleaned) return buildResult({ summary: 'No extractable textual content.', provider: 'local', highlights: [] })

  // Basic chunking by char length (approx token ~ 4 chars heuristic)
  const MAX_CHARS_PER_CHUNK = 12000
  const chunks = chunkText(cleaned, MAX_CHARS_PER_CHUNK)

  const intermediateSummaries = []
  for (const chunk of chunks) {
    const s = await runProvider(provider, chunk, style)
    intermediateSummaries.push(s)
  }

  let finalSummary
  if (intermediateSummaries.length === 1) {
    finalSummary = intermediateSummaries[0]
  } else {
    // Merge step
    const mergeText = intermediateSummaries.join('\n\n')
    finalSummary = await runProvider(provider, mergeText, style, { isMeta: true })
  }

  const highlights = extractHighlights(cleaned)
  return buildResult({ summary: finalSummary, provider: effectiveProvider(provider), highlights, chunks: chunks.length })
}

// --- Provider dispatcher ---
async function runProvider(requested, text, style, { isMeta = false } = {}) {
  const provider = effectiveProvider(requested)
  switch (provider) {
    case 'gemini':
      return await geminiSummarize(text, style, { isMeta })
    case 'local':
    default:
      return localSummarize(text, style)
  }
}

function effectiveProvider(requested) {
  if (requested === 'gemini' && geminiModel) return 'gemini'
  return 'local'
}

// --- Gemini implementation ---
async function geminiSummarize(text, style, { isMeta }) {
  if (!geminiModel) return localSummarize(text, style)
  const styleCfg = STYLE_TARGETS[style] || STYLE_TARGETS.short
  const system = `You are a precise summarization assistant. Style=${style}. Target length up to ${styleCfg.maxWords} words.`
  const instructions = `${system}\n${isMeta ? 'The following are partial summaries. Merge them faithfully without adding new facts.' : 'Summarize the following content.'}\nConstraints:\n- Preserve key facts\n- No fabrication\n- Plain text\n- If list-like, use bullet lines starting with '-'\nInput:\n"""\n${text}\n"""\nOutput:`
  try {
    const result = await geminiModel.generateContent(instructions)
    const out = result.response.text().trim()
    return sanitizeOutput(out, styleCfg)
  } catch (e) {
    console.error('Gemini summarization failed:', e.message)
    // If model is not found/unsupported for this API version, try other candidates once
    const msg = String(e?.message || '').toLowerCase()
    if (msg.includes('404') || msg.includes('not found') || msg.includes('not supported')) {
      const apiKey = process.env.GEMINI_API_KEY
      if (apiKey) {
        for (const m of GEMINI_MODEL_CANDIDATES) {
          try {
            const genAI = new GoogleGenerativeAI(apiKey)
            const model = genAI.getGenerativeModel({ model: m })
            const test = await model.generateContent('Return the single word: ok')
            const ok = test.response.text().trim().toLowerCase().includes('ok')
            if (ok) {
              geminiModel = model
              console.log(`[summarizeProvider] Switched Gemini model to: ${m}`)
              const result = await geminiModel.generateContent(instructions)
              const out = result.response.text().trim()
              return sanitizeOutput(out, styleCfg)
            }
          } catch (_) {
            // try next
          }
        }
      }
    }
    // Fallback to local summary if we could not switch successfully
    return localSummarize(text, style)
  }
}

// --- Local fallback summarizer ---
function localSummarize(text, style) {
  const styleCfg = STYLE_TARGETS[style] || STYLE_TARGETS.short
  const sentences = splitSentences(text)
  const selected = sentences.slice(0, styleCfg.sentences)
  return selected.join(' ').trim()
}

// --- Utility: highlights extraction (top N longest informative sentences) ---
function extractHighlights(text, max = 5) {
  const sentences = splitSentences(text)
  const scored = sentences
    .map(s => ({ s: s.trim(), score: scoreSentence(s) }))
    .filter(o => o.s.length > 25)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, max).map(o => o.s)
}

function scoreSentence(s) {
  // crude scoring: length weight + count of nouns/ proper looking words
  const len = Math.min(s.length / 80, 1)
  const keywordMatches = (s.match(/[A-Z][a-z]+/g) || []).length
  return len * 0.6 + Math.min(keywordMatches / 8, 0.4)
}

// --- Helpers ---
function splitSentences(text) {
  return (text
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]/g) || [text]).map(t => t.trim())
}

function chunkText(text, maxChars) {
  if (text.length <= maxChars) return [text]
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length)
    chunks.push(text.slice(start, end))
    start = end
  }
  return chunks
}

function sanitizeOutput(out, styleCfg) {
  // Trim overly long outputs to approx maxWords
  const words = out.split(/\s+/)
  if (words.length > styleCfg.maxWords) {
    return words.slice(0, styleCfg.maxWords).join(' ') + '…'
  }
  return out
}

function buildResult({ summary, provider, highlights, chunks }) {
  return { summary, provider, highlights, chunks }
}
