import React, { useState } from 'react'
import { extractFromHtml } from '../utils/parseHtml'

export default function UrlExtractorDemo() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function fetchAndParse() {
    setError(null)
    setResult(null)
    if (!url) return setError('Please enter a URL')

    // Only accept web URLs (http or https). Reject other schemes (file:, mailto:, ftp:, etc.)
    const trimmed = url.trim()
    if (!/^https?:\/\//i.test(trimmed)) {
      return setError('Only web URLs are allowed (must start with http:// or https://). Please provide a public web URL.')
    }
    setLoading(true)
    try {
      // Call server proxy at /api/fetch?url=...
      const res = await fetch(`/api/fetch?url=${encodeURIComponent(trimmed)}`)
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
      const body = await res.json()

      // If server indicates page is not public, show a clear warning
      if (body && body.public === false) {
        const reason = body.reason || 'not_public'
        const title = body.title || ''
        setError(`The requested page is not publicly accessible (${reason}). ${title ? `Title: ${title}.` : ''} Please provide a different public URL.`)
        setResult(null)
        return
      }

      const html = body && body.html ? body.html : ''
      if (!html) {
        setError('No HTML returned from server or page could not be fetched.')
        return
      }

      const parsed = extractFromHtml(html)
      setResult(parsed)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow">
      <h3 className="text-lg font-semibold mb-3">URL Extractor Demo</h3>
      <p className="text-sm text-gray-600 mb-4">Enter a URL to fetch server-side and extract structured content client-side.</p>
      <div className="flex gap-2 mb-4">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" className="flex-1 px-3 py-2 border rounded" />
        <button onClick={fetchAndParse} disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded">{loading ? 'Loading…' : 'Fetch & Parse'}</button>
      </div>
  {error && <div className="text-red-600 mb-3">{error}</div>}
  <div className="text-xs text-gray-500 mb-3">Note: Private or login-protected pages (for example, LinkedIn profile activity) cannot be extracted. Please use a public URL.</div>
      {result && (
        <div className="text-sm text-gray-800">
          <div className="mb-3">
            <div className="font-semibold">Title</div>
            <div>{result.title}</div>
          </div>
          {result.description && (
            <div className="mb-3">
              <div className="font-semibold">Meta Description</div>
              <div>{result.description}</div>
            </div>
          )}
          <div className="mb-3">
            <div className="font-semibold">Summary</div>
            <div>{result.summary}</div>
          </div>
          <div className="mb-3">
            <div className="font-semibold">Headings</div>
            <ul className="list-disc list-inside">
              {result.headings.map((h, i) => <li key={i}><strong>{h.tag}:</strong> {h.text}</li>)}
            </ul>
          </div>
          <div className="mb-3">
            <div className="font-semibold">Top Paragraphs</div>
            {result.paragraphs.map((p, i) => <p key={i} className="mt-1">{p}</p>)}
          </div>
          <div>
            <div className="font-semibold">Links ({result.links.length})</div>
            <ul className="list-disc list-inside">
              {result.links.slice(0, 40).map((l, i) => (
                <li key={i}><a href={l.href} target="_blank" rel="noreferrer" className="text-blue-600 underline">{l.text}</a> — <span className="text-xs text-gray-500">{l.href}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
