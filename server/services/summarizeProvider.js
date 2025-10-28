import 'dotenv/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import OpenAI from 'openai'
import axios from 'axios'

const geminiKey = process.env.GEMINI_API_KEY
let geminiModel = null
if (geminiKey) {
  try {
    const genAI = new GoogleGenerativeAI(geminiKey)
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    console.log(' [AI] Gemini initialized')
  } catch (e) {
    console.warn(' [AI] Gemini init failed:', e.message)
  }
}

const groqKey = process.env.GROQ_API_KEY
let groqClient = null
if (groqKey) {
  try {
    groqClient = new Groq({ apiKey: groqKey })
    console.log(' [AI] Groq initialized')
  } catch (e) {
    console.warn(' [AI] Groq init failed:', e.message)
  }
}

const deepseekKey = process.env.DEEPSEEK_API_KEY
let deepseekClient = null
if (deepseekKey) {
  try {
    deepseekClient = new OpenAI({ apiKey: deepseekKey, baseURL: 'https://api.deepseek.com' })
    console.log(' [AI] DeepSeek initialized')
  } catch (e) {
    console.warn(' [AI] DeepSeek init failed:', e.message)
  }
}

const aimlKey = process.env.AIML_API_KEY
const aimlAvailable = !!aimlKey
if (aimlAvailable) console.log(' [AI] AIML configured')

const hasProvider = !!(geminiModel || groqClient || deepseekClient || aimlAvailable)
if (!hasProvider) console.error(' [AI] NO PROVIDERS AVAILABLE')

const STYLE_TARGETS = {
  short: { minWords: 30, maxWords: 60 },
  medium: { minWords: 100, maxWords: 180 },
  long: { minWords: 300, maxWords: 600 },
  bullets: { minWords: 100, maxWords: 250 }
}

export async function summarize(text, { style = 'medium' } = {}) {
  const cleaned = (text || '').trim()
  if (!cleaned) return { summary: 'No content', provider: 'none', highlights: [], chunks: 0 }
  if (!hasProvider) throw new Error('No AI providers available')

  console.log(`🚀 [Summarize] ${cleaned.length} chars, style: ${style}`)
  
  const chunks = chunkText(cleaned, 12000)
  console.log(`📦 [Chunks] ${chunks.length} chunk(s)`)
  
  const summaries = []
  for (let i = 0; i < chunks.length; i++) {
    console.log(`📝 [Chunk ${i + 1}/${chunks.length}]`)
    const result = await processWithRaceAndQuality(chunks[i], style)
    summaries.push(result)
  }
  
  let finalSummary = summaries.length === 1 ? summaries[0] : await processWithRaceAndQuality(summaries.join('\n\n'), style, { isMerge: true })
  const highlights = extractHighlights(cleaned)
  
  console.log('✅ [Complete]\n')
  return { summary: finalSummary, provider: 'gemini', highlights, chunks: chunks.length }
}

async function processWithRaceAndQuality(text, style, { isMerge = false } = {}) {
  console.log('🏁 [Race] DeepSeek vs Groq')
  let summary = await raceProviders(text, style)
  
  console.log('🔍 [Quality] Evaluating')
  const quality = evaluateQuality(summary, text, style)
  
  if (quality.pass) {
    console.log('✅ [Quality] PASS')
    return summary
  }
  
  console.log(`❌ [Quality] FAIL - ${quality.reason}`)
  console.log('🔄 [Rework] Trying fallback')
  
  try {
    const reworked = await callFallbackProvider(text, style, quality.feedback)
    console.log('✅ [Rework] Success')
    return reworked
  } catch (e) {
    console.warn('⚠️ [Rework] Failed:', e.message)
    return summary
  }
}

async function raceProviders(text, style) {
  const racers = []
  
  if (deepseekClient) {
    racers.push(callProvider('deepseek', text, style)
      .then(result => ({ provider: 'deepseek', result, error: null }))
      .catch(err => ({ provider: 'deepseek', result: null, error: err.message })))
  }
  
  if (groqClient) {
    racers.push(callProvider('groq', text, style)
      .then(result => ({ provider: 'groq', result, error: null }))
      .catch(err => ({ provider: 'groq', result: null, error: err.message })))
  }
  
  if (racers.length === 0) {
    console.log('⚠️ [Race] No fast providers')
    return callFallbackProvider(text, style)
  }
  
  const winner = await Promise.race(racers)
  
  if (winner.error) {
    // Log provider failure with the underlying error message for debugging
    console.warn(`⚠️ [Race] ${winner.provider} failed: ${winner.error}`)
    const all = await Promise.allSettled(racers)
    // If any other racer succeeded, use it
    const success = all.find(r => r.status === 'fulfilled' && r.value && r.value.result && !r.value.error)
    if (success) {
      console.log(`✅ [Race] Backup: ${success.value.provider}`)
      return success.value.result
    }
    // None succeeded - log detailed errors for each racer then fallback
    const errors = all.map(r => {
      if (r.status === 'fulfilled') return `${r.value.provider}: ${r.value.error || 'no error'}`
      if (r.status === 'rejected') return `rejected: ${r.reason?.message || r.reason}`
      return 'unknown'
    }).join(' | ')
    console.error(`⚠️ [Race] All racers failed. Details: ${errors}`)
    return callFallbackProvider(text, style)
  }
  
  console.log(`🏆 [Race] Winner: ${winner.provider}`)
  return winner.result
}

async function callFallbackProvider(text, style, feedback = null) {
  const providers = []
  if (aimlAvailable) providers.push('aiml')
  if (geminiModel) providers.push('gemini')
  
  if (providers.length === 0) throw new Error('No fallback providers')
  
  for (const provider of providers) {
    try {
      console.log(`🔄 [Fallback] ${provider}`)
      const result = await callProvider(provider, text, style, feedback)
      console.log(`✅ [Fallback] ${provider} OK`)
      return result
    } catch (e) {
      console.warn(`⚠️ [Fallback] ${provider} failed: ${e?.message || e}`)
    }
  }
  
  throw new Error('All fallbacks failed')
}

async function callProvider(provider, text, style, feedback = null) {
  const prompt = buildPrompt(text, style, feedback)
  
  switch (provider) {
    case 'deepseek': return await callDeepSeek(prompt)
    case 'groq': return await callGroq(prompt)
    case 'aiml': return await callAIML(prompt)
    case 'gemini': return await callGemini(prompt)
    default: throw new Error(`Unknown provider: ${provider}`)
  }
}

async function callDeepSeek(prompt) {
  if (!deepseekClient) throw new Error('DeepSeek not initialized')
  const response = await deepseekClient.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1200
  })
  return response.choices[0].message.content.trim()
}

async function callGroq(prompt) {
  if (!groqClient) throw new Error('Groq not initialized')
  const response = await groqClient.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1200
  })
  return response.choices[0].message.content.trim()
}

async function callAIML(prompt) {
  if (!aimlAvailable) throw new Error('AIML not configured')
  const response = await axios.post('https://api.aimlapi.com/v1/chat/completions', {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1200
  }, {
    headers: { 'Authorization': `Bearer ${aimlKey}`, 'Content-Type': 'application/json' },
    timeout: 30000
  })
  return response.data.choices[0].message.content.trim()
}

async function callGemini(prompt) {
  if (!geminiModel) throw new Error('Gemini not initialized')
  const result = await geminiModel.generateContent(prompt)
  return result.response.text().trim()
}

function buildPrompt(text, style, feedback = null) {
  const cfg = STYLE_TARGETS[style] || STYLE_TARGETS.medium
  
  let styleInstr = ''
  switch (style) {
    case 'short':
      styleInstr = `VERY SHORT summary in 1-2 sentences (${cfg.minWords}-${cfg.maxWords} words). Core message only.`
      break
    case 'medium':
      styleInstr = `MEDIUM summary as one paragraph (${cfg.minWords}-${cfg.maxWords} words). Main points and key details.`
      break
    case 'long':
      styleInstr = `COMPREHENSIVE summary (${cfg.minWords}-${cfg.maxWords} words). Multiple paragraphs with all important aspects.`
      break
    case 'bullets':
      styleInstr = `BULLET POINT summary with 5-8 points (${cfg.minWords}-${cfg.maxWords} words total). Start each with "• ".`
      break
  }
  
  let reworkInstr = feedback ? `\n\n⚠️ IMPORTANT - Address:\n${feedback}\n` : ''
  
  return `You are an expert summarization assistant.

${styleInstr}

RULES:
- Preserve all key facts and details
- Do NOT add information not in source
- Clear, professional English
- Plain text only (no markdown ** or __)
${style === 'bullets' ? '- Start each bullet with "• " on new line' : ''}
${style === 'long' ? '- Separate paragraphs with \\n\\n' : ''}
${reworkInstr}
INPUT TEXT:
"""
${text}
"""

YOUR SUMMARY:`
}

function evaluateQuality(summary, originalText, style) {
  const cfg = STYLE_TARGETS[style] || STYLE_TARGETS.medium
  const words = summary.split(/\s+/).filter(w => w.length > 0).length
  const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0).length
  
  if (words < cfg.minWords) {
    return {
      pass: false,
      reason: `Too short (${words} words)`,
      feedback: `Summary too brief at ${words} words. Expand to ${cfg.minWords}-${cfg.maxWords} words with more details and key points.`
    }
  }
  
  if (words > cfg.maxWords * 1.3) {
    return {
      pass: false,
      reason: `Too long (${words} words)`,
      feedback: `Summary too lengthy at ${words} words. Condense to ${cfg.minWords}-${cfg.maxWords} words focusing on key points.`
    }
  }
  
  if (style === 'bullets') {
    const hasBullets = /^[•\-\*\d]/m.test(summary)
    if (!hasBullets) {
      return {
        pass: false,
        reason: 'Missing bullet format',
        feedback: 'Format as bullet list. Start each point with "• " on new line. 5-8 points.'
      }
    }
    const bulletCount = (summary.match(/^[•\-\*]/gm) || []).length
    if (bulletCount < 4) {
      return {
        pass: false,
        reason: 'Too few bullets',
        feedback: `Provide 5-8 bullet points (currently ${bulletCount}). Each distinct key point.`
      }
    }
  }
  
  const genericPhrases = ['the text discusses', 'the document talks about', 'this content is about', 'the article covers']
  const lowerSummary = summary.toLowerCase()
  const hasGeneric = genericPhrases.some(phrase => lowerSummary.includes(phrase))
  
  if (hasGeneric && words < cfg.maxWords * 0.7) {
    return {
      pass: false,
      reason: 'Too generic',
      feedback: 'Summary too generic. Include specific details, concrete facts, and key points instead of describing what text is about.'
    }
  }
  
  if (style !== 'short' && sentences < 2) {
    return {
      pass: false,
      reason: 'Insufficient structure',
      feedback: 'Summary needs more structure. Provide multiple sentences/bullets to cover key points.'
    }
  }
  
  return { pass: true }
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

function extractHighlights(text, max = 5) {
  const sentences = (text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]/g) || [text])
    .map(s => s.trim())
    .filter(s => s.length > 20)
  
  if (sentences.length === 0) return []
  
  const scored = sentences.map(s => {
    const lengthScore = Math.min(s.length / 100, 1) * 0.5
    const keywordCount = (s.match(/[A-Z][a-z]+/g) || []).length
    const keywordScore = Math.min(keywordCount / 10, 1) * 0.5
    return { s, score: lengthScore + keywordScore }
  })
  
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, max).map(o => o.s)
}
