# Mind-Mesh Project State (2025-09-27)

Mind-Mesh is a Node.js/Express backend with a React/Vite frontend for file upload, text extraction, OCR, and AI summarization (Gemini).

## Backend
- Stack: Node.js, Express, Multer, pdf-parse, mammoth, libreoffice-convert, Tesseract.js, dotenv
- Endpoints:
  - POST /api/upload-and-summarize — Upload a file; returns extraction + summary
  - GET  /api/supported-types — Supported formats and summary styles
  - POST /api/test-ocr — Upload image; returns OCR text (dev/testing)
  - POST /api/summarize — Summarize text/url/file via streaming (existing)
- Supported Types:
  - Documents: PDF, DOCX, PPTX, DOC, PPT, TXT, HTML
  - Images: JPEG, JPG, PNG, GIF, BMP, TIFF (OCR)
- Features: 50MB limit, robust PDF parsing with fallbacks, DOCX/TXT/HTML extraction, LibreOffice bridge for PPTX/DOC/PPT, OCR with Tesseract.js, Gemini summaries (short/medium/long/bullets), debug logs, metadata, cleanup.

## Frontend
- Stack: React, Vite, Tailwind
- Features: Drag/drop upload, paste, URL/text input, style selector, live progress, summary + highlights + metadata display.

## Configuration (.env)
- GEMINI_API_KEY=... (required for AI)
- SILENCE_LIBRE_WARNING=1 (optional)
- OCR_ENABLED=true|false (default true)
- OCR_LANGUAGES=eng (space- or plus-separated ISO codes)
- PORT=4000 (default)

## Current Status
- Working and tested: TXT, DOCX, HTML, PDF, Images (OCR)
- Conditional: PPTX/DOC/PPT (requires LibreOffice on PATH or SOFFICE_PATH)
- Known: Gemini API quotas can block summaries; extraction still returns.
- Performance: Typical < 2s for small/medium docs; OCR time depends on image size.

## Quick Use
- Backend: from ./server — `node index.js`
- Frontend: from ./client — `npm run dev`
- Upload API: `POST /api/upload-and-summarize` form-data: file, summaryStyle (short|medium|long|bullets)

## Notes for Agents
- Extraction is in `server/services/extractText.js`
- Summarization is in `server/services/summarizeProvider.js`
- File upload route: `server/routes/fileUpload.js`
- Streaming route: `server/routes/summarize.js`
- OCR test route: `server/routes/ocrTest.js`
- If PDF parse fails, fallbacks applied and helpful message returned.
- For PPTX/DOC/PPT, conversion uses LibreOffice -> PDF -> text.
