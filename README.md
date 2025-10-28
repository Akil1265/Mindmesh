npm install
event: summary
# Mind-Mesh — AI-Powered Document Summarizer

Mind-Mesh streamlines long-form content into concise, high quality summaries with a friendly React interface backed by an Express API. The project began as a university initiative and is now evolving into a production-ready toolkit.

## Highlights
- Multi-format ingestion covering PDF, DOCX, PPTX, TXT, and images (OCR-enabled)
- Gemini-powered cloud summarization with an offline-safe fallback
- Configurable summary styles and one-click exports to TXT, PDF, DOCX, PPTX, PNG, and MP4 with voiceover
- Clean Tailwind UI with real-time progress feedback and mobile support
- Hardened backend featuring rate limiting, secure headers, and health checks

## Stack Overview
- Frontend: Vite, React, Tailwind CSS, Axios
- Backend: Node.js, Express, Multer, Tesseract.js, Google Gemini SDK, Say (TTS)
- Tooling: Vitest, Jest, ESLint, GitHub Actions CI

## Getting Started
1. Clone the repository and open it in your preferred editor.
2. Install dependencies separately inside `client` and `server` using your package manager.
3. Duplicate the sample environment file in `server`, rename it to `.env`, and add your Gemini API key along with any optional OCR or rate-limit tweaks.
4. Start the Express API (defaults to port 4000) and run the Vite dev server (defaults to port 3000). The frontend proxy already forwards `/api` requests to the backend.
5. Visit the client URL to upload documents, paste URLs, or type raw text, then try the various summary modes and export targets.

## Environment Checklist
- `PORT` and `NODE_ENV` for Express runtime
- `GEMINI_API_KEY` (required for cloud summarization)
- Optional OCR flags such as `OCR_ENABLED` and `OCR_LANGUAGES`
- Client configuration variable `VITE_API_URL` when deploying the frontend separately

## Testing and Quality
- Run API tests from the `server` directory to cover extraction and summarization flows.
- Execute component tests from the `client` directory to verify UI behavior.
- Lint the codebase regularly to keep styling consistent and catch issues early.

## Deployment Notes
- Frontend can ship to Vercel or Netlify using the `client` folder as the root and `dist` as the output.
- Backend can deploy to Render, Railway, or any Node-compatible host; ensure environment variables mirror your production needs and update CORS origins in `server/index.js`.
- For production builds, confirm both servers are reachable and that the client proxy (or environment variable) targets the hosted API.

## Security Considerations
- Uploaded files are validated against a strict MIME whitelist and size cap.
- HTML content undergoes sanitization before summarization.
- Rate limiting protects the API from abusive patterns.

## Roadmap Snapshot
- Additional summary templates tailored to specific industries
- Richer analytics in the export packages
- Expanded voice customization for generated videos

Feedback and contributions are welcome—Mind-Mesh is an active project aimed at making knowledge digestion effortless.
