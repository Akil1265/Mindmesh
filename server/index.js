import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import summarizeRouter from './routes/summarize.js'
import ocrTestRouter from './routes/ocrTest.js'
import fileUploadRouter from './routes/fileUpload.js'
import { diagnosticsRouter } from './routes/libreDiag.js'

const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3002'],
  credentials: true
}))
app.use(express.json())
app.use(helmet({
  crossOriginEmbedderPolicy: false
}))

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
})
app.use(limiter)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/summarize', summarizeRouter)
app.use('/api', fileUploadRouter)
app.use('/api', diagnosticsRouter)
// OCR test endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api', ocrTestRouter)
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
