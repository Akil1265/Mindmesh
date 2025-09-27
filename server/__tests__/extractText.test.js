import { extractText } from '../services/extractText.js'

// Minimal synthetic buffers for formats
function makeBuffer(str){return Buffer.from(str,'utf8')}

describe('extractText', () => {
  test('returns raw text for plain text buffer', async () => {
    const text = await extractText({ buffer: makeBuffer('hello world'), mimetype: 'text/plain' })
    expect(text).toMatch(/hello world/)
  })

  test('returns json text when application/json', async () => {
    const obj = { a: 1, b: 'two' }
    const json = JSON.stringify(obj)
    const text = await extractText({ buffer: makeBuffer(json), mimetype: 'application/json' })
    // Expect raw JSON string (unmodified)
    expect(() => JSON.parse(text)).not.toThrow()
    expect(JSON.parse(text)).toMatchObject(obj)
  })

  test('image placeholder for image/*', async () => {
    const text = await extractText({ buffer: makeBuffer('fakebinary'), mimetype: 'image/png' })
    expect(text).toMatch(/OCR skipped/i)
  })

  test('unsupported binary returns empty string', async () => {
    const text = await extractText({ buffer: makeBuffer('data'), mimetype: 'application/octet-stream' })
    expect(text).toBe('')
  })
})
