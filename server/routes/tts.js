import { Router } from 'express'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import say from 'say'

const router = Router()

function exportSpeech(text, voice, speed, outputPath) {
  return new Promise((resolve, reject) => {
    say.export(text, voice ?? null, speed ?? 1, outputPath, (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

router.post('/tts', async (req, res) => {
  let tempFile
  try {
    const { text = '', voice = null, speed = 1 } = req.body || {}
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' })
    }

    const normalizedText = text.trim().slice(0, 5000)
    tempFile = path.join(
      os.tmpdir(),
      `mindmesh-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`
    )

    await exportSpeech(normalizedText, voice, speed, tempFile)
    const audioBuffer = await fs.readFile(tempFile)

    res.setHeader('Content-Type', 'audio/wav')
    res.setHeader('Cache-Control', 'no-store')
    res.send(audioBuffer)
  } catch (error) {
    console.error('TTS generation failed:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'tts_generation_failed' })
    }
  } finally {
    if (tempFile) {
      await fs.unlink(tempFile).catch(() => {})
    }
  }
})

export default router
