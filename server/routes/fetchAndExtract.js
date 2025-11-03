const express = require('express')
const axios = require('axios')

const router = express.Router()

// Simple server-side proxy to fetch remote pages and return HTML.
// Important: This proxies the raw HTML only. Use responsibly and respect site terms.
// Route: GET /api/fetch?url=<encoded URL>
router.get('/', async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'Missing url param' })

  try {
  // Basic validation: only allow http(s) web URLs. Reject other schemes explicitly.
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'Invalid url', reason: 'only_http_https_allowed' })

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'MindMeshFetcher/1.0 (+https://github.com/Akil1265)'
      },
      // allow large pages
      maxContentLength: 5 * 1024 * 1024,
      maxBodyLength: 5 * 1024 * 1024,
      timeout: 15000
    })

  const html = typeof response.data === 'string' ? response.data : ''

  // Basic privacy/publicity detection for common login walls (LinkedIn etc.)
  // If the target is LinkedIn or the fetched HTML looks like a login/signup wall,
  // do NOT return the full HTML. Instead return a public:false flag and reason.
    const isLinkedIn = /linkedin\.com/.test(url)
    const looksLikeLogin = /sign in to linkedin|linkedin authentication|id="session_key"|name="session_key"|class="signin"|aria-label="Sign in"/i.test(html)

    if (isLinkedIn && looksLikeLogin) {
      // try to extract a safe title
      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : 'LinkedIn (login required)'
      return res.json({ public: false, reason: 'requires_authentication', title })
    }

    // If the page contains a generic login wall indicator, avoid returning full HTML
    if (looksLikeLogin) {
      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : 'Login required'
      return res.json({ public: false, reason: 'login_wall_detected', title })
    }

    res.json({ public: true, html })
  } catch (err) {
    console.error('fetch proxy error', err.message)
    res.status(502).json({ error: 'Failed to fetch url', message: err.message })
  }
})

module.exports = router
