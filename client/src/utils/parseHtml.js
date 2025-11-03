// parseHtml.js
// Utilities to extract structured data from an HTML string in the browser.
// Uses DOMParser (browser) to build a lightweight representation: title, meta, headings,
// paragraphs, links, and a short heuristic summary.

export function extractFromHtml(htmlString) {
  if (typeof window === 'undefined' || !htmlString) return null

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlString, 'text/html')

    const title = doc.querySelector('title')?.innerText?.trim() || ''
    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || ''

    // Collect headings (h1-h3)
    const headings = []
    ;[...doc.querySelectorAll('h1,h2,h3')].forEach(h => headings.push({ tag: h.tagName, text: h.innerText.trim() }))

    // Collect paragraphs (first N)
    const paragraphs = []
    ;[...doc.querySelectorAll('p')].slice(0, 12).forEach(p => paragraphs.push(p.innerText.trim()))

    // Collect links (text + href)
    const links = []
    ;[...doc.querySelectorAll('a[href]')].forEach(a => {
      const href = a.getAttribute('href')
      const text = a.innerText.trim() || href
      links.push({ text, href })
    })

    // Visible text summary: take body text, remove long whitespace, and take first 400 chars
    const bodyText = doc.body ? doc.body.innerText.replace(/\s+/g, ' ').trim() : ''
    const summary = summarizeText(bodyText, 300)

    return { title, description, headings, paragraphs, links, summary, bodyText }
  } catch (err) {
    console.error('extractFromHtml error', err)
    return null
  }
}

// Very small heuristic summarizer: return first N characters or first 2 sentences
export function summarizeText(text, maxChars = 300) {
  if (!text) return ''
  // Try to split into sentences
  const sentences = text.match(/[^.!?]+[.!?]?/g) || [text]
  let out = ''
  for (let s of sentences) {
    if ((out + s).length <= maxChars) out += s.trim() + ' '
    else break
  }
  if (!out) out = text.slice(0, maxChars) + (text.length > maxChars ? '…' : '')
  return out.trim()
}
