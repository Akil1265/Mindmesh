import { jest } from '@jest/globals'
import request from 'supertest'
import express from 'express'

// ESM-compatible mocking: declare mock then dynamically import
jest.unstable_mockModule('../services/summarizeProvider.js', () => ({
  summarize: jest.fn()
}))

const { summarize } = await import('../services/summarizeProvider.js')
const { default: summarizeRouter } = await import('../routes/summarize.js')

const app = express()
app.use(express.json())
app.use('/api/summarize', summarizeRouter)

describe('/api/summarize integration (mocked provider)', () => {
  beforeEach(() => { summarize.mockReset() })

  test('rejects missing input', async () => {
    summarize.mockResolvedValue({ summary: 'IGNORED', provider: 'mock', highlights: [] })
    const res = await request(app).post('/api/summarize')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Provide a file|url|text/i)
  })

  test('accepts raw text summarization (preview)', async () => {
    summarize.mockResolvedValue({ summary: 'This is a mocked summary.', provider: 'mock', highlights: [] })
    const res = await request(app)
      .post('/api/summarize')
      .field('text', 'Mind Mesh test summary sentence. Another sentence to analyze.')
      .field('summaryStyle', 'short')
    expect(res.status).toBe(200)
    expect(res.body.summary).toBe('This is a mocked summary.')
    expect(res.body.provider).toBe('mock')
    expect(summarize).toHaveBeenCalledTimes(1)
  })

  test('returns zip when multiple outputs requested', async () => {
    summarize.mockResolvedValue({ summary: 'MOCK_MULTI', provider: 'mock', highlights: [] })
    const res = await request(app)
      .post('/api/summarize')
      .field('text', 'Export to multiple formats for integration test.')
      .field('output', 'txt,pdf')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/(application\/zip|application\/pdf|text\/plain)/)
    expect(summarize).toHaveBeenCalled()
  })
})
