import express from 'express'
import { generateOne } from '../services/exportGenerators.js'

const router = express.Router()

router.post('/', async (req, res) => {
  try {
    const { format, summary, highlights = [], metadata = {} } = req.body

    // Validate required fields
    if (!format || !summary) {
      return res.status(400).json({ 
        error: 'Missing required fields: format and summary' 
      })
    }

    // Validate format
    const validFormats = ['txt', 'pdf', 'docx', 'pptx', 'png']
    if (!validFormats.includes(format)) {
      return res.status(400).json({ 
        error: `Invalid format. Supported formats: ${validFormats.join(', ')}` 
      })
    }

    console.log(`[export] Generating ${format} for summary (${summary.length} chars)`)

    // Prepare summary object for export
    const summaryObj = {
      summary,
      highlights,
      metadata: {
        ...metadata,
        generatedAt: new Date().toISOString(),
        format,
        tool: 'Mind-Mesh'
      }
    }

    // Generate the export
    const result = await generateOne(format, summaryObj)
    
    console.log(`[export] Successfully generated ${format} (${result.buffer.length} bytes)`)

    // Set appropriate headers
    res.setHeader('Content-Type', result.mime)
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
    res.setHeader('Content-Length', result.buffer.length)

    // Send the file
    res.send(result.buffer)

  } catch (error) {
    console.error('[export] Generation failed:', error)
    res.status(500).json({ 
      error: `Export generation failed: ${error.message}` 
    })
  }
})

export default router