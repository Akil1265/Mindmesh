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
  // Standard lengths
  short: { minWords: 30, maxWords: 60 },
  medium: { minWords: 100, maxWords: 180 },
  long: { minWords: 300, maxWords: 600 },
  bullets: { minWords: 100, maxWords: 250 },
  
  // Executive style (all lengths)
  'executive-short': { minWords: 40, maxWords: 80 },
  'executive-medium': { minWords: 100, maxWords: 180 },
  'executive-long': { minWords: 250, maxWords: 450 },
  'executive-bullets': { minWords: 100, maxWords: 200 },
  
  // Academic style (all lengths)
  'academic-short': { minWords: 50, maxWords: 100 },
  'academic-medium': { minWords: 150, maxWords: 300 },
  'academic-long': { minWords: 400, maxWords: 700 },
  'academic-bullets': { minWords: 150, maxWords: 300 },
  
  // Casual style (all lengths)
  'casual-short': { minWords: 30, maxWords: 60 },
  'casual-medium': { minWords: 100, maxWords: 180 },
  'casual-long': { minWords: 250, maxWords: 500 },
  'casual-bullets': { minWords: 80, maxWords: 180 },
  
  // Technical style (all lengths)
  'technical-short': { minWords: 40, maxWords: 80 },
  'technical-medium': { minWords: 150, maxWords: 280 },
  'technical-long': { minWords: 350, maxWords: 650 },
  'technical-bullets': { minWords: 120, maxWords: 250 },
  
  // Storytelling style (all lengths)
  'storytelling-short': { minWords: 40, maxWords: 80 },
  'storytelling-medium': { minWords: 120, maxWords: 220 },
  'storytelling-long': { minWords: 300, maxWords: 600 },
  'storytelling-bullets': { minWords: 100, maxWords: 200 }
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
  const content = response.choices[0].message.content.trim()
  // Remove literal \n\n escape sequences
  return content.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n')
}

async function callGroq(prompt) {
  if (!groqClient) throw new Error('Groq not initialized')
  const response = await groqClient.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1200
  })
  const content = response.choices[0].message.content.trim()
  // Remove literal \n\n escape sequences
  return content.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n')
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
  const content = response.data.choices[0].message.content.trim()
  // Remove literal \n\n escape sequences
  return content.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n')
}

async function callGemini(prompt) {
  if (!geminiModel) throw new Error('Gemini not initialized')
  const result = await geminiModel.generateContent(prompt)
  const content = result.response.text().trim()
  // Remove literal \n\n escape sequences
  return content.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n')
}

function buildPrompt(text, style, feedback = null) {
  const cfg = STYLE_TARGETS[style] || STYLE_TARGETS.medium
  
  // Parse style: could be "short", "medium", "executive-long", "casual-bullets", etc.
  const parts = style.split('-')
  const styleType = parts.length > 1 ? parts[0] : 'standard'
  const length = parts.length > 1 ? parts[1] : style
  
  // Determine tone instructions based on style type
  let toneInstr = ''
  switch (styleType) {
    case 'executive':
      toneInstr = `Executive/C-suite tone: Write for business leaders and decision-makers. Be strategic and action-oriented. 
      Focus on business impact, ROI, competitive advantages, and key decisions. Emphasize outcomes, metrics, and actionable insights. 
      Use confident, authoritative language. Highlight risks, opportunities, and strategic implications. Keep it results-focused and data-driven.`
      break
    case 'academic':
      toneInstr = `Academic/scholarly tone: Write in formal, rigorous academic style. Be objective, analytical, and evidence-based. 
      Use proper scholarly terminology and discipline-specific language. Maintain logical structure with clear argumentation. 
      Avoid casual expressions, contractions, and colloquialisms. Present information with academic precision and intellectual depth. 
      Use third-person perspective. Include contextual analysis and theoretical frameworks where relevant.`
      break
    case 'casual':
      toneInstr = `Casual/conversational tone: Write as if explaining to a friend over coffee. Be warm, friendly, and approachable. 
      Use everyday language, simple words, and natural expressions. Contractions are encouraged (it's, you'll, don't). 
      Make it engaging and relatable—avoid jargon and complex terminology. Use "you" to address the reader directly. 
      Keep sentences flowing naturally like spoken conversation. It's okay to be enthusiastic and personable.`
      break
    case 'technical':
      toneInstr = `Technical tone: Write for technical experts and practitioners. Use precise, domain-specific terminology without over-explaining. 
      Include technical specifications, methodologies, algorithms, and implementation details. Be accurate and unambiguous. 
      Use industry-standard terms, acronyms, and technical concepts. Focus on how things work, not just what they do. 
      Maintain technical rigor—include parameters, configurations, and technical constraints. Assume reader has technical background.`
      break
    case 'storytelling':
      toneInstr = `Storytelling/narrative tone: Present information as an engaging story with clear narrative arc. Set the scene with context, 
      introduce the situation or challenge, describe the journey or process, and conclude with outcomes or resolution. 
      Use narrative elements—characters, conflict, progression, and resolution. Make it flow naturally with temporal progression. 
      Create vivid descriptions and compelling progression. Maintain human interest while preserving factual accuracy. 
      Use transitions that guide readers through the narrative journey.`
      break
    default:
      toneInstr = `Professional balanced tone: Write in clear, neutral, and informative style suitable for business communication. 
      Be objective and professional without being overly formal or too casual. Use precise language that is accessible to general audiences. 
      Maintain credibility and authority while staying approachable. Avoid jargon unless necessary. Present facts clearly and logically.`
      break
  }
  
  // Determine length instructions
  let lengthInstr = ''
  switch (length) {
    case 'short':
      lengthInstr = `VERY SHORT summary in 1-2 sentences (${cfg.minWords}-${cfg.maxWords} words). Core message only.`
      break
    case 'medium':
      lengthInstr = `MEDIUM summary as one paragraph (${cfg.minWords}-${cfg.maxWords} words). Main points and key details.`
      break
    case 'long':
      lengthInstr = `COMPREHENSIVE summary (${cfg.minWords}-${cfg.maxWords} words). Multiple paragraphs with all important aspects.`
      break
    case 'bullets':
      lengthInstr = `BULLET POINT summary with 5-8 points (${cfg.minWords}-${cfg.maxWords} words total). Start each with "• ".`
      break
  }
  
  let reworkInstr = feedback ? `\n\n⚠️ IMPORTANT - Address:\n${feedback}\n` : ''
  
  return `You are an expert summarization assistant.

TONE: ${toneInstr}

LENGTH: ${lengthInstr}

RULES:
- Preserve all key facts and details
- Do NOT add information not in source
- Match the specified tone throughout
- Plain text only (no markdown ** or __)
${length === 'bullets' ? '- Start each bullet with "• " on new line' : ''}
${length === 'long' ? '- Separate paragraphs with \\n\\n' : ''}
${styleType === 'executive' ? '- Focus on strategic insights and actionable takeaways' : ''}
${styleType === 'technical' ? '- Use domain-specific terminology and precise language' : ''}
${styleType === 'storytelling' ? '- Create narrative flow: set scene, describe journey, show outcomes' : ''}
${styleType === 'casual' ? '- Use conversational language, contractions okay' : ''}
${styleType === 'academic' ? '- Maintain formal scholarly language and structure' : ''}
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
  
  // Parse style to check format and tone
  const isBullets = style.endsWith('-bullets') || style === 'bullets'
  const isShort = style.endsWith('-short') || style === 'short'
  const isLong = style.endsWith('-long') || style === 'long'
  const parts = style.split('-')
  const styleType = parts.length > 1 ? parts[0] : 'standard'
  
  // 1. CHECK: Word count within range
  if (words < cfg.minWords) {
    return {
      pass: false,
      reason: `Too short (${words} words)`,
      feedback: `CRITICAL LENGTH ISSUE: Your summary is only ${words} words but needs ${cfg.minWords}-${cfg.maxWords} words.

REQUIRED ACTIONS:
• Expand the summary significantly by adding more specific details, concrete examples, and important context
• Include ALL key facts, findings, and insights from the source material
• Add supporting information and explanations for main points
• DO NOT just repeat the same information - add NEW details and depth
• Reach the target word count naturally by being thorough and comprehensive, not by adding fluff`
    }
  }
  
  if (words > cfg.maxWords * 1.3) {
    return {
      pass: false,
      reason: `Too long (${words} words)`,
      feedback: `CRITICAL LENGTH ISSUE: Your summary is ${words} words but should be ${cfg.minWords}-${cfg.maxWords} words.

REQUIRED ACTIONS:
• Cut down the summary by removing redundant information and repetitive phrases
• Focus ONLY on the most important key points - eliminate secondary details
• Combine similar ideas into single, concise statements
• Remove any unnecessary adjectives, adverbs, and filler words
• Every word must add value - if it doesn't, remove it
• Be more selective about what information to include`
    }
  }
  
  // 2. CHECK: Bullet format and structure
  if (isBullets) {
    const hasBullets = /^[•\-\*\d]/m.test(summary)
    if (!hasBullets) {
      return {
        pass: false,
        reason: 'Missing bullet format',
        feedback: `CRITICAL FORMATTING ERROR: This must be a BULLET LIST format, not a paragraph.

REQUIRED FORMAT:
• Start each point with "• " (bullet symbol followed by space)
• Put each bullet point on a NEW LINE
• Provide 5-8 distinct bullet points
• Each bullet must be a complete, standalone statement
• Do NOT write paragraphs - write bullets only

EXAMPLE FORMAT:
• First key point here with complete information
• Second key point covering different aspect
• Third key point with specific details
• Fourth key point highlighting important finding
• Fifth key point presenting unique insight

IMPORTANT: The format MUST match this structure exactly. No paragraphs allowed.`
      }
    }
    const bulletCount = (summary.match(/^[•\-\*]/gm) || []).length
    if (bulletCount < 4) {
      return {
        pass: false,
        reason: 'Too few bullets',
        feedback: `BULLET COUNT ERROR: You provided only ${bulletCount} bullet point(s) but need 5-8 bullets.

REQUIRED ACTIONS:
• Create ${5 - bulletCount} more distinct bullet points
• Each bullet must cover a DIFFERENT key aspect from the source
• Break down complex information into separate, organized points
• Each bullet should be substantial and informative (not just one word)
• Cover different themes: main finding, methodology, implications, context, details, etc.
• DO NOT repeat the same information across bullets - each must be unique

MAKE SURE: Every bullet provides NEW and VALUABLE information from the source material.`
      }
    }
  }
  
  // 3. CHECK: Generic phrases (low quality)
  const genericPhrases = [
    'the text discusses', 'the document talks about', 'this content is about', 
    'the article covers', 'the passage explains', 'this text describes',
    'the author mentions', 'it is stated that', 'according to the text'
  ]
  const lowerSummary = summary.toLowerCase()
  const hasGeneric = genericPhrases.some(phrase => lowerSummary.includes(phrase))
  
  if (hasGeneric) {
    const foundPhrase = genericPhrases.find(phrase => lowerSummary.includes(phrase))
    return {
      pass: false,
      reason: 'Too generic and vague',
      feedback: `PRESENTATION QUALITY ERROR: Summary uses meta-descriptive language ("${foundPhrase}") instead of presenting information directly.

REQUIRED ACTIONS:
• Remove ALL phrases like: "the text discusses", "the document talks about", "the article covers"
• Present the actual CONTENT and FINDINGS directly
• Write as if YOU are presenting the information, not describing what a document says
• Replace meta-phrases with direct statements of fact
• Focus on WHAT is known, discovered, or explained - not on what the document does

BAD EXAMPLE: "The text discusses how solar panels work..."
GOOD EXAMPLE: "Solar panels convert sunlight into electricity using photovoltaic cells..."

BAD EXAMPLE: "According to the text, climate change affects ecosystems..."
GOOD EXAMPLE: "Climate change disrupts ecosystems through temperature shifts, habitat loss, and species migration..."

BAD EXAMPLE: "The author mentions that AI has limitations..."
GOOD EXAMPLE: "AI systems face limitations in common sense reasoning, contextual understanding, and creativity..."

REMEMBER: You are presenting information, not describing a document. Be direct, authoritative, and factual.`
    }
  }
  
  // 4. CHECK: Unnecessary filler words
  const fillerPhrases = [
    'in conclusion', 'to sum up', 'in summary', 'overall',
    'it can be said that', 'it is important to note', 'it should be mentioned',
    'basically', 'essentially', 'simply put'
  ]
  const hasFillers = fillerPhrases.some(phrase => lowerSummary.includes(phrase))
  
  if (hasFillers) {
    const foundFiller = fillerPhrases.find(phrase => lowerSummary.includes(phrase))
    return {
      pass: false,
      reason: 'Contains unnecessary filler words',
      feedback: `CONCISENESS ERROR: Summary contains filler phrase ("${foundFiller}") that adds no value and wastes words.

REQUIRED ACTIONS:
• Remove ALL filler phrases immediately: "in conclusion", "to sum up", "in summary", "overall", "basically", "essentially", "simply put", "it can be said that", "it is important to note", "it should be mentioned"
• Present information DIRECTLY without transitional fluff
• Start sentences with the actual content, not meta-commentary
• Every word must carry meaning and information
• Replace vague phrases with specific facts and details
• Be crisp, direct, and information-dense

BAD EXAMPLE: "In conclusion, the project was successful..."
GOOD EXAMPLE: "The project achieved all targets, delivering 30% cost savings..."

BAD EXAMPLE: "Basically, AI uses algorithms to learn patterns..."
GOOD EXAMPLE: "AI uses machine learning algorithms to identify patterns in data..."

BAD EXAMPLE: "It is important to note that climate affects agriculture..."
GOOD EXAMPLE: "Climate directly impacts crop yields, growing seasons, and irrigation needs..."

REMEMBER: Every word counts toward your word limit. Use them for information, not filler.`
    }
  }
  
  // 5. CHECK: Structure and readability
  if (!isShort && !isBullets && sentences < 2) {
    return {
      pass: false,
      reason: 'Insufficient structure',
      feedback: `STRUCTURE ERROR: Summary has only ${sentences} sentence(s) but needs proper multi-sentence structure for this format.

REQUIRED ACTIONS:
• Write at least 3-5 well-formed, complete sentences
• Each sentence should present distinct information or different aspects
• Break down complex information into multiple digestible sentences
• Create logical flow from one sentence to the next
• Vary sentence structure and length for better readability
• Ensure each sentence is substantial and informative

GOOD STRUCTURE EXAMPLE:
"Artificial intelligence revolutionizes healthcare through predictive diagnostics and personalized treatment plans. Machine learning algorithms analyze patient data to identify disease patterns earlier than traditional methods. The technology reduces diagnostic errors by 40% while cutting costs by 30%. However, implementation challenges include data privacy concerns and the need for extensive training datasets. Future developments focus on integrating AI with wearable devices for real-time health monitoring."

REMEMBER: Multiple sentences allow you to organize information clearly and cover different aspects thoroughly.`
    }
  }
  
  // 6. CHECK: Long format should have paragraphs
  if (isLong && !summary.includes('\n\n')) {
    return {
      pass: false,
      reason: 'Long format needs paragraph breaks',
      feedback: `FORMATTING ERROR: Long summaries MUST be organized into multiple paragraphs with proper breaks (\\n\\n between paragraphs).

REQUIRED ACTIONS:
• Divide your summary into 2-4 distinct paragraphs
• Separate paragraphs with double line break (\\n\\n)
• Each paragraph should cover a different theme or aspect:
  - Paragraph 1: Main findings or core concepts
  - Paragraph 2: Supporting details, methodology, or context
  - Paragraph 3: Implications, applications, or related information
  - Paragraph 4 (if needed): Future directions or conclusions
• Each paragraph should be 3-5 sentences
• Create logical flow between paragraphs
• Make it visually easy to read and scan

GOOD FORMAT EXAMPLE:
"First paragraph covers main concept with key points and primary findings. It establishes context and introduces the core ideas. This section should be comprehensive yet focused.

Second paragraph dives into supporting details, methodology, or specific examples. It provides depth and elaboration on the main concepts. Technical details and evidence appear here.

Third paragraph discusses implications, applications, or broader context. It connects ideas and shows relevance. Future directions or conclusions may be presented here."

REMEMBER: Long summaries without paragraph breaks are hard to read. Break them up for better user experience.`
    }
  }
  
  // 7. CHECK: Repetition (same words repeated too often)
  const wordFreq = {}
  const contentWords = summary.toLowerCase().split(/\s+/).filter(w => 
    w.length > 5 && !['their', 'there', 'which', 'where', 'these', 'those', 'would', 'could', 'should'].includes(w)
  )
  contentWords.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1
  })
  const repeatedWords = Object.entries(wordFreq).filter(([word, count]) => count > 3)
  
  if (repeatedWords.length > 0) {
    const repeated = repeatedWords.map(([word, count]) => `"${word}" (${count} times)`).slice(0, 5).join(', ')
    return {
      pass: false,
      reason: 'Excessive word repetition',
      feedback: `REPETITION ERROR: Multiple words repeated excessively: ${repeated}

REQUIRED ACTIONS:
• Identify all overused words and replace most instances with synonyms
• Vary your vocabulary while maintaining meaning and accuracy
• Use a thesaurus if needed to find appropriate alternatives
• Keep one or two mentions of key technical terms, but vary everything else
• Rephrase sentences to naturally use different words
• Make the text more engaging through linguistic variety

SYNONYM SUGGESTIONS (examples):
• "important" → significant, crucial, vital, essential, key
• "shows" → demonstrates, reveals, indicates, illustrates, displays
• "method" → approach, technique, process, strategy, system
• "increase" → growth, rise, expansion, enhancement, boost
• "analyze" → examine, evaluate, assess, study, investigate

REMEMBER: Repetition makes summaries boring and unprofessional. Use varied vocabulary to maintain reader engagement.`
    }
  }
  
  // 8. CHECK: Style-specific tone validation
  if (styleType === 'academic') {
    // Check for casual language in academic style
    const casualWords = ['gonna', 'wanna', "can't", "won't", "isn't", "don't", 'really', 'very', 'super', 'cool', 'awesome']
    const hasCasual = casualWords.some(word => lowerSummary.includes(word))
    if (hasCasual) {
      const foundCasual = casualWords.filter(word => lowerSummary.includes(word)).join(', ')
      return {
        pass: false,
        reason: 'Inappropriate tone for academic style',
        feedback: `TONE MISMATCH ERROR: Academic style requires FORMAL scholarly language, but your summary contains casual/informal words: ${foundCasual}

REQUIRED ACTIONS:
• Remove ALL contractions: "can't" → "cannot", "won't" → "will not", "isn't" → "is not", "don't" → "do not"
• Replace casual intensifiers: "really" → "significantly", "very" → "considerably", "super" → "extremely"
• Remove colloquial terms: "cool", "awesome", "gonna", "wanna"
• Use formal scholarly terminology and complete proper words
• Maintain objective third-person perspective throughout
• Use precise academic vocabulary appropriate to the field

BAD EXAMPLE: "The study shows AI is really cool and can't be beaten in some tasks..."
GOOD EXAMPLE: "The research demonstrates that artificial intelligence systems exhibit superior performance in specific computational tasks..."

REMEMBER: Academic style = formal, objective, precise, and scholarly. No casual or conversational language allowed.`
      }
    }
  }
  
  if (styleType === 'casual') {
    // Check if casual style is too formal
    const tooFormal = /\b(furthermore|consequently|notwithstanding|heretofore|aforementioned)\b/i.test(summary)
    if (tooFormal) {
      const matches = summary.match(/\b(furthermore|consequently|notwithstanding|heretofore|aforementioned)\b/gi)
      const formalWords = [...new Set(matches)].join(', ')
      return {
        pass: false,
        reason: 'Too formal for casual style',
        feedback: `TONE MISMATCH ERROR: Casual style should be FRIENDLY and CONVERSATIONAL, but your summary uses overly formal/stiff words: ${formalWords}

REQUIRED ACTIONS:
• Replace formal connectors with casual ones:
  - "furthermore" → "also", "plus", "and"
  - "consequently" → "so", "that's why", "because of this"
  - "notwithstanding" → "even though", "despite"
  - "heretofore" → "until now", "so far"
  - "aforementioned" → "the above", "what we talked about"
• Use simple, everyday words that you'd use talking to a friend
• Contractions are GOOD in casual style: "it's", "don't", "can't", "you'll"
• Write as if explaining over coffee - warm, friendly, approachable
• Use active voice and direct language

BAD EXAMPLE: "Furthermore, the aforementioned technique demonstrates considerable efficacy..."
GOOD EXAMPLE: "Plus, the technique we talked about works really well..."

REMEMBER: Casual style = friendly, conversational, simple. Write like you're talking to a friend.`
      }
    }
  }
  
  if (styleType === 'executive') {
    // Check if executive style lacks business focus
    const hasBusinessLanguage = /\b(impact|strategic|action|decision|ROI|value|opportunity|risk|outcome|business|market|revenue|cost|efficiency)\b/i.test(summary)
    if (!hasBusinessLanguage && words > 50) {
      return {
        pass: false,
        reason: 'Missing business focus for executive style',
        feedback: `TONE MISMATCH ERROR: Executive summaries must focus on BUSINESS IMPACT and STRATEGIC VALUE, but your summary lacks business-oriented language.

REQUIRED ACTIONS:
• Frame information in terms of business outcomes and value
• Include at least 3-4 of these business elements:
  - Strategic impact or competitive advantages
  - ROI, cost savings, or revenue potential
  - Key decisions or action items for leaders
  - Business risks or opportunities
  - Market implications or business applications
  - Efficiency gains or performance metrics
• Focus on "So what?" for business leaders - why does this matter to the organization?
• Present information through a business lens, not just technical or academic details
• Use action-oriented language that drives decisions

BAD EXAMPLE: "The new software uses advanced algorithms to process data faster and more accurately than previous versions..."
GOOD EXAMPLE: "The new software delivers 40% faster processing, reducing operational costs by $200K annually while improving decision-making accuracy—creating competitive advantage in real-time market response..."

REMEMBER: Executive style = business impact, strategic value, actionable insights for decision-makers.`
      }
    }
  }
  
  // 9. CHECK: Empty or placeholder content
  if (summary.includes('[') || summary.includes('...') || summary.includes('etc.') || summary.includes('and so on')) {
    const issues = []
    if (summary.includes('[')) issues.push('brackets/placeholders [...]')
    if (summary.includes('...')) issues.push('ellipsis (...)')
    if (summary.includes('etc.')) issues.push('"etc."')
    if (summary.includes('and so on')) issues.push('"and so on"')
    
    return {
      pass: false,
      reason: 'Contains placeholders or vague endings',
      feedback: `COMPLETENESS ERROR: Summary contains incomplete or vague content: ${issues.join(', ')}

REQUIRED ACTIONS:
• Remove ALL placeholder markers: [...], [insert here], [to be added]
• Replace ellipsis (...) with complete information - finish your thoughts
• Replace "etc." with ACTUAL examples or specific items
• Replace "and so on" with concrete details or specific examples
• Every sentence must be complete and fully formed
• Provide specific, concrete information instead of vague references
• If you can't list all items, list the most important 3-5 specifically

BAD EXAMPLE: "The benefits include cost savings, efficiency, productivity, etc."
GOOD EXAMPLE: "The benefits include 30% cost savings, 40% faster processing, 25% productivity gains, and improved accuracy."

BAD EXAMPLE: "Key factors are technology, market trends, and so on..."
GOOD EXAMPLE: "Key factors are emerging AI technology, shifting consumer preferences toward sustainability, and increased regulatory requirements."

BAD EXAMPLE: "The process involves [...] and data analysis."
GOOD EXAMPLE: "The process involves data collection via automated sensors, preprocessing to remove noise, statistical analysis using regression models, and validation through cross-checking."

REMEMBER: Be specific, complete, and concrete. No vague endings or incomplete thoughts allowed.`
    }
  }
  
  // 10. CHECK: Starts with meta-description
  const badStarts = ['this summary', 'this document', 'this text', 'this article', 'the following']
  const firstWords = summary.toLowerCase().substring(0, 50)
  const hasBadStart = badStarts.some(phrase => firstWords.includes(phrase))
  
  if (hasBadStart) {
    const foundStart = badStarts.find(phrase => firstWords.includes(phrase))
    return {
      pass: false,
      reason: 'Starts with meta-description',
      feedback: `OPENING ERROR: Summary starts with meta-descriptive phrase ("${foundStart}") instead of jumping directly into content.

REQUIRED ACTIONS:
• NEVER start with: "This summary...", "This document...", "This text...", "This article...", "The following..."
• Start immediately with your MOST IMPORTANT information or key finding
• Open with a strong, compelling statement that delivers value
• First sentence should hook the reader with substance, not describe the summary
• Make every word count - especially the critical first sentence

BAD EXAMPLES:
❌ "This summary provides an overview of artificial intelligence applications..."
❌ "This document discusses the benefits of renewable energy..."
❌ "The following text examines climate change impacts..."

GOOD EXAMPLES:
✅ "Artificial intelligence revolutionizes healthcare through 40% faster diagnostics and personalized treatment plans..."
✅ "Renewable energy costs dropped 89% since 2010, making solar and wind cheaper than fossil fuels..."
✅ "Climate change drives unprecedented ecosystem disruption, threatening 1 million species with extinction..."

POWER OPENING STRATEGIES:
• State the main finding or conclusion first
• Lead with a striking fact or statistic
• Present the core concept or breakthrough directly
• Highlight the most important implication or outcome
• Jump straight into what matters most

REMEMBER: Your opening sentence is prime real estate. Use it for high-value content, not meta-commentary.`
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
