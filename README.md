# Mind-Mesh - AI-Powered Document Summarizer

![CI](https://github.com/yourusername/mind-mesh/actions/workflows/ci.yml/badge.svg)

A modern, full-stack document summarization tool with intelligent AI:
- 🤖 **Gemini AI** - Google's powerful cloud AI for accurate summaries
- � **Local Fallback** - JavaScript-based summarization when offline
- ⚡ **Vite + React** - Modern frontend with streaming progress

Mind-Mesh intelligently extracts and summarizes content from various document formats and web URLs with support for multiple summary styles and export formats.

> _Note: Mind-Mesh was originally created as an academic Sem-5 project and continues to evolve into a production-ready toolkit._

## ✨ Features

- 📄 **Multi-format Support**: PDF, DOCX, PPTX, TXT, and image files with OCR
- 🤖 **Gemini AI**: Google's powerful AI for intelligent summaries
- 🎯 **4 Summary Styles**: Short, Medium, Long, and Bullets
- 📤 **5 Export Formats**: TXT, PDF, DOCX, PPTX, PNG
- 🌐 **URL Processing**: Extract and summarize content from web pages
- 🎨 **Modern UI**: Responsive design with Tailwind CSS
- 🔒 **Security**: Built-in rate limiting and security headers
- 📱 **Mobile Friendly**: Works on all devices
- ⚡ **Streaming Progress**: Real-time updates during processing

## 🛠️ Tech Stack

- **Axios** - HTTP client for API calls

### Backend
- **Express.js** - Web framework
- **Multer** - File upload handling  
- **For Python Backend**: Python 3.8+ 
- **For Node.js Backend**: Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**

2. **Install dependencies**
3. **Configure environment**
   ```bash
   # Create .env file in server directory
   cd server
   cp .env.example .env
   # Add your Gemini API key to .env
   ```
4. **Start development servers**
   ```bash
   npm run dev
   ```
   This will start:
   - Backend (Express): `http://localhost:4000`
   - Frontend (Vite): `http://localhost:3000`
   - Frontend (Vite): `http://localhost:3000`

npm install
npm run dev
```
```bash
cd server
npm install
```

### Endpoints
- `GET /health` → health probe
- `POST /api/summarize` → classic single-response summarization / export
- `POST /api/summarize/stream` → streaming progress (Server-Sent-Events style over POST) using header `x-stream-progress: 1`

2. Extraction layer (`extractText.js`)
3. Summarization logic (`summarizeProvider.js`)
4. Export generators (`exportGenerators.js`)
6. UI polish + deploy

## API Usage Examples

### JSON Preview (no file download)
   -F "text=Mindmesh lets users summarize documents quickly." \
   -F "summaryStyle=medium"
```
```bash
curl -X POST http://localhost:4000/api/summarize \
   -F "text=Mindmesh supports multi-format export" \

### Multiple Formats (ZIP)
```bash
   -F "output=pdf,docx,txt" \
   -o bundle.zip
```
curl -X POST http://localhost:4000/api/summarize \
   -F "url=https://example.com" \
   -F "output=txt"
```

### With File Upload
```bash
curl -X POST http://localhost:4000/api/summarize \
   -F "file=@/path/to/document.pdf" \
   -F "summaryStyle=short" \
   -F "output=pdf,docx" \
   -o exports.zip
```

### Image (Screenshot) Export
```bash
curl -X POST http://localhost:4000/api/summarize \
   -F "text=Mindmesh image export" \
   -F "output=image" \
   -o summary.png
```

### Parameters
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| file | multipart file | No | pdf, docx, pptx, txt, png, jpg, jpeg, gif, bmp, tiff |
| text | string | No | Raw text body |
| url | string | No | Public webpage URL |
| output | csv string | No | e.g. `pdf,docx,txt,image,pptx` |
| summaryStyle | string | No | `short` (default) \| `medium` \| `long` |
| provider | string | No | Currently `gemini` (local fallback if unavailable) |

**📷 Image OCR**: Supported image formats (PNG, JPG, GIF, BMP, TIFF) are processed using Tesseract.js OCR to extract text before summarization.

### OCR Configuration
Environment variables for image processing:
- `OCR_ENABLED=true` - Enable/disable OCR (default: true)
- `OCR_LANGUAGES=eng` - OCR language codes (default: English)

### OCR Testing (Development)
Test OCR functionality directly:
```bash
curl -X POST http://localhost:4000/api/test-ocr \
   -F "image=@/path/to/screenshot.png"
```
Returns extracted text with confidence scores and processing time.

If `output` omitted → JSON preview returned.

### Streaming (progress + auto download)
```
curl -X POST http://localhost:4000/api/summarize/stream \
   -H "x-stream-progress: 1" \
   -F "text=Streaming summarization demo content." \
   -F "summaryStyle=short"
```
The response will contain event blocks like:
```
event: stage
data: {"stage":"summarizing"}

event: summary
data: {"summary":"..."}
```

## Environment Variables

### Backend Configuration (.env in server/)
```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Gemini AI (Required for cloud AI)
GEMINI_API_KEY=your-gemini-api-key-here

# Client Configuration  
VITE_API_URL=http://localhost:4000

# Rate Limiting
RATE_LIMIT_WINDOW_MINUTES=1
RATE_LIMIT_MAX_REQUESTS=60

# OCR Configuration
OCR_ENABLED=true
OCR_LANGUAGES=eng
```

## 🧪 Testing

### Server (Jest + Supertest)
```
cd server
npm test
```
Includes:
- Unit tests: extraction logic (`extractText`)
- Integration tests: `/api/summarize` basic flows

### Client (Vitest + RTL)
```
cd client
npm test
```

## 🧰 Linting

Server:
```
cd server
npm run lint
```
(Currently permissive if no ESLint config is added.)

## 🏗️ CI
GitHub Actions workflow: `.github/workflows/ci.yml`
Pipeline steps:
1. Install deps (server + client)
2. Lint (server)
3. Run Jest tests (server)
4. Build client (Vite)
5. Upload `dist` artifact

Badge included at top of README once repo path is updated.

## 🚢 Deployment

### Client → Vercel / Netlify
1. Set project root to `client/`
2. Build command: `npm run build`
3. Output directory: `dist`
4. Environment variable: `VITE_API_URL=https://your-server.example.com`

### Server → Render / Railway
1. Root: `server/`
2. Build command: (none) / or `npm install`
3. Start command: `node index.js`
4. Environment vars: `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT` (Render can auto-assign; ensure client points to that URL)
5. (Optional) Add `soffice` if wanting PPTX extraction. On Render/Railway you may need a custom Dockerfile for LibreOffice.

### CORS / Client URL
Add deployed client origin to allowed CORS origins list in `server/index.js`.

### Sample Production curl
```
curl -X POST https://your-server.example.com/api/summarize \
   -F "text=Production deployment test" \
   -F "summaryStyle=short"
```
Expect JSON with `summary`, `provider`, `highlights`.

## Security Notes
- File size limited to 50MB.
- MIME whitelist enforced.
- HTML sanitized (scripts/styles/navigation removed) before summarization.
- PPTX conversion uses LibreOffice if installed.
- Image OCR not implemented (placeholder message returned).
