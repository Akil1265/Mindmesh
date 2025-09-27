// Test endpoint for OCR functionality - development only
import express from 'express'
import multer from 'multer'
import { extractText } from '../services/extractText.js'

const router = express.Router()
const upload = multer()

// Test OCR endpoint
router.post('/test-ocr', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image file' })
    }

    const { buffer, mimetype } = req.file
    
    if (!mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' })
    }

    console.log(`[OCR TEST] Processing ${mimetype}, ${buffer.length} bytes`)
    const extractedText = await extractText({ buffer, mimetype })
    
    res.json({
      success: true,
      mimetype,
      fileSize: buffer.length,
      extractedText,
      textLength: extractedText.length
    })
  } catch (error) {
    console.error('[OCR TEST] Error:', error)
    res.status(500).json({ 
      error: 'OCR test failed', 
      details: error.message 
    })
  }
})

export default router