import express from 'express'
import multer from 'multer'
import { extractText } from '../services/extractText.js'
import { summarize } from '../services/summarizeProvider.js'
import { generateMany, generateOne } from '../services/exportGenerators.js'

const router = express.Router()
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'text/plain',
  'application/json',
  'image/png',
  'image/jpeg'
])
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true)
    return cb(new Error('Unsupported file type: ' + file.mimetype))
  }
})

router.post('/', upload.single('file'), async (req, res) => {
  try {
    let extracted = ''

    if (req.file) {
      extracted = await extractText({ buffer: req.file.buffer, mimetype: req.file.mimetype })
    } else if (req.body && req.body.url) {
      extracted = await extractText({ url: req.body.url })
    } else if (req.body && req.body.text) {
      extracted = req.body.text
    } else {
      return res.status(400).json({ error: 'Provide a file, url, or text field.' })
    }

    // Debug: Log extracted text length and preview
    console.log(`[DEBUG] Extracted ${extracted.length} characters`)
    console.log(`[DEBUG] Text preview: "${extracted.slice(0, 200)}${extracted.length > 200 ? '...' : ''}"`)

    if (!extracted || extracted.trim().length === 0) {
      return res.status(422).json({ error: 'No meaningful text could be extracted.' })
    }

    const provider = (req.body.provider || 'gemini').toLowerCase()
    const summaryStyle = (req.body.summaryStyle || 'short').toLowerCase()
    
    // Debug: Log processing parameters
    console.log(`[DEBUG] Processing with provider: ${provider}, style: ${summaryStyle}`)

    const outputRaw = req.body.output
    const formats = outputRaw ? outputRaw.split(',').map(f => f.trim().toLowerCase()).filter(Boolean) : []

    const result = await summarize(extracted, { provider, style: summaryStyle })
    
    // Debug: Log summarization result
    console.log(`[DEBUG] Summary generated (${result.provider}): "${result.summary.slice(0, 100)}${result.summary.length > 100 ? '...' : ''}"`)  

    if (formats.length === 0) {
      // JSON preview mode - include extracted text for later download
      return res.json({ ...result, extracted })
    }

    try {
      const uniqueFormats = [...new Set(formats)]
      if (uniqueFormats.length === 1) {
        const file = await generateOne(uniqueFormats[0], result)
        res.setHeader('Content-Type', file.mime)
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
        return res.send(file.buffer)
      } else {
        const zip = await generateMany(uniqueFormats, result)
        res.setHeader('Content-Type', zip.mime)
        res.setHeader('Content-Disposition', `attachment; filename="${zip.filename}"`)
        return res.send(zip.buffer)
      }
    } catch (e) {
      console.error('Export generation failed:', e)
      return res.status(500).json({ error: 'Export generation failed', details: e.message, result })
    }
  } catch (err) {
    console.error('Summarize route error:', err)
    if (err.message && err.message.startsWith('Unsupported file type')) {
      return res.status(415).json({ error: err.message })
    }
    res.status(500).json({ error: 'Internal summarization error.' })
  }
})

// Streaming progress variant (POST with SSE-like streamed events). Not a standard SSE GET, but
// works with fetch() reading the response body progressively. The client parses lines beginning
// with "event:" and "data:" pairs.
router.post('/stream', upload.single('file'), async (req, res) => {
  // Only proceed if client indicates it can handle streaming
  if (!req.headers['x-stream-progress']) {
    return res.status(400).json({ error: 'Missing x-stream-progress header for streaming mode.' })
  }
  // Establish streaming headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('X-Accel-Buffering', 'no') // nginx compatibility
  res.flushHeaders?.()

  let aborted = false
  req.on('close', () => { aborted = true })

  const send = (event, payload) => {
    if (aborted) return
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }
  const safeEnd = () => { if (!aborted) try { res.end() } catch {/* ignore response end errors */} }

  try {
    send('stage', { stage: 'start' })
    let extracted = ''
    if (req.file) {
      send('stage', { stage: 'extracting', filename: req.file.originalname })
      extracted = await extractText({ buffer: req.file.buffer, mimetype: req.file.mimetype })
    } else if (req.body && req.body.url) {
      send('stage', { stage: 'fetching-url', url: req.body.url })
      extracted = await extractText({ url: req.body.url })
    } else if (req.body && req.body.text) {
      extracted = req.body.text
    } else {
      send('error', { error: 'Provide a file, url, or text field.' })
      return safeEnd()
    }

    if (aborted) return safeEnd()
    if (!extracted || extracted.trim().length === 0) {
      send('error', { error: 'No meaningful text could be extracted.' })
      return safeEnd()
    }

    const provider = (req.body.provider || 'gemini').toLowerCase()
    const summaryStyle = (req.body.summaryStyle || 'short').toLowerCase()
    const outputRaw = req.body.output
    const formats = outputRaw ? outputRaw.split(',').map(f => f.trim().toLowerCase()).filter(Boolean) : []

    // Summarization progress (basic heuristic: chunk count)
    send('stage', { stage: 'summarizing', provider, style: summaryStyle })
    const summaryResult = await summarize(extracted, { provider, style: summaryStyle })
    // Include extracted text in summary event
    send('summary', { ...summaryResult, extracted })

    if (aborted) return safeEnd()

    if (formats.length === 0) {
      send('done', { mode: 'preview-only' })
      return safeEnd()
    }

    // Export generation sequentially with per-format status
    const uniqueFormats = [...new Set(formats)]
    if (uniqueFormats.length === 1) {
      const f = uniqueFormats[0]
      send('export-start', { format: f })
      try {
        const file = await generateOne(f, summaryResult)
        if (aborted) return safeEnd()
        // base64 encode
        const base64 = file.buffer.toString('base64')
        send('export-done', { format: f, filename: file.filename, size: file.buffer.length })
        send('download', { filename: file.filename, mime: file.mime, base64 })
        send('done', { mode: 'single-file' })
      } catch (e) {
        send('export-error', { format: f, error: e.message })
        send('done', { error: 'Export failed' })
      }
      return safeEnd()
    } else {
      // Multiple -> zip via generateMany
      for (const f of uniqueFormats) {
        send('export-start', { format: f })
      }
      try {
        const zip = await generateMany(uniqueFormats, summaryResult)
        if (aborted) return safeEnd()
        const base64 = zip.buffer.toString('base64')
        for (const f of uniqueFormats) {
          send('export-done', { format: f })
        }
        send('download', { filename: zip.filename, mime: zip.mime, base64 })
        send('done', { mode: 'zip' })
      } catch (e) {
        send('export-error', { error: e.message })
        send('done', { error: 'Export failed' })
      }
      return safeEnd()
    }
  } catch (err) {
    console.error('Streaming summarize error:', err)
    send('error', { error: 'Internal summarization error.' })
    safeEnd()
  }
})

export default router
