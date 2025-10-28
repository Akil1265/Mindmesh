import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import summarizeRouter from './routes/summarize.js'
import ocrTestRouter from './routes/ocrTest.js'
import fileUploadRouter from './routes/fileUpload.js'
import { diagnosticsRouter } from './routes/libreDiag.js'
import exportRouter from './routes/export.js'
import ttsRouter from './routes/tts.js'

const app = express()
const PORT = process.env.PORT || 4000

// Middleware
const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost:3001', 
  'http://localhost:3002', 
  'http://127.0.0.1:3000', 
  'http://127.0.0.1:3001', 
  'http://127.0.0.1:3002'
]

// Add production Vercel URL when deployed
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL)
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    // Check if origin is allowed or matches Vercel preview/production pattern
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
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
app.use('/api/export', exportRouter)
app.use('/api', ttsRouter)
app.use('/api', fileUploadRouter)
app.use('/api', diagnosticsRouter)
// OCR test endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api', ocrTestRouter)
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
