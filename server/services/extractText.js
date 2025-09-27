// server/src/services/extractText.js
// NOTE: We lazy-load heavy / side‑effect libraries (pdf-parse & LibreOffice) only when needed
// to avoid executing their test harness code or emitting noisy warnings at startup.
// This also reduces cold start time.

let _pdfParseLoaded = null
async function loadPdfParse() {
  if (_pdfParseLoaded) return _pdfParseLoaded
  try {
    // dynamic import so that module.parent based debug code in CJS thinks it's being required
    const mod = await import('pdf-parse')
    _pdfParseLoaded = mod.default || mod
  } catch (e) {
    console.warn('[extractText] pdf-parse failed to load:', e.message)
    _pdfParseLoaded = async () => ({ text: 'PDF parsing unavailable: ' + e.message })
  }
  return _pdfParseLoaded
}

let _tesseractLoaded = null
async function loadTesseract() {
  if (_tesseractLoaded) return _tesseractLoaded
  try {
    const { createWorker } = await import('tesseract.js')
    _tesseractLoaded = { createWorker }
  } catch (e) {
    console.warn('[extractText] tesseract.js failed to load:', e.message)
    _tesseractLoaded = null
  }
  return _tesseractLoaded
}

async function safePdfParse(buffer) {
  const pdfParse = await loadPdfParse()
  try {
    console.log(`[extractText] Attempting to parse PDF (${buffer.length} bytes)`)
    
    // First, try with basic parsing
    const result = await pdfParse(buffer)
    
    console.log(`[extractText] PDF parsing successful, extracted ${result.text.length} characters`)
    
    // Clean up the extracted text
    if (result.text && result.text.trim().length > 0) {
      // Remove excessive whitespace and normalize line breaks
      const cleanedText = result.text
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n\n')  // Normalize paragraph breaks
        .trim()
      
      return { text: cleanedText, numpages: result.numpages, info: result.info }
    } else {
      throw new Error('No text content found in PDF')
    }
  } catch (e) {
    console.warn('[extractText] Primary PDF parsing failed:', e.message)
    
    // Try with different parsing options
    try {
      console.log('[extractText] Trying PDF parsing with alternative options...')
      const result = await pdfParse(buffer, {
        // Use different parsing strategy
        pagerender: function(pageData) {
          // Custom page rendering to handle special cases
          const render_options = {
            normalizeWhitespace: true,
            disableCombineTextItems: false
          }
          return pageData.getTextContent(render_options).then(function(textContent) {
            let lastY, text = '';
            for (const item of textContent.items) {
              if (lastY == item.transform[5] || !lastY){
                text += item.str;
              } else {
                text += '\n' + item.str;
              }
              lastY = item.transform[5];
            }
            return text;
          });
        }
      })
      
      if (result.text && result.text.trim().length > 0) {
        console.log(`[extractText] Alternative PDF parsing successful, extracted ${result.text.length} characters`)
        const cleanedText = result.text
          .replace(/\s+/g, ' ')
          .replace(/\n\s*\n/g, '\n\n')
          .trim()
        return { text: cleanedText, numpages: result.numpages, info: result.info }
      } else {
        throw new Error('Alternative parsing returned no text')
      }
    } catch (e2) {
      console.warn('[extractText] Alternative PDF parsing also failed:', e2.message)
      
      // Try minimal parsing as last resort
      try {
        console.log('[extractText] Trying minimal PDF parsing...')
        const result = await pdfParse(buffer, { max: 10 }) // Limit to first 10 pages
        
        if (result.text && result.text.trim().length > 0) {
          console.log(`[extractText] Minimal PDF parsing successful, extracted ${result.text.length} characters`)
          return { text: result.text.trim() }
        } else {
          throw new Error('Minimal parsing returned no text')
        }
      } catch (e3) {
        console.error('[extractText] All PDF parsing methods failed:', e3.message)
        
        // Return helpful error message instead of generic failure
        let errorMsg = '[PDF text extraction failed. '
        if (e.message.includes('Invalid PDF')) {
          errorMsg += 'The PDF file appears to be corrupted or invalid.'
        } else if (e.message.includes('Encrypted')) {
          errorMsg += 'The PDF is password-protected or encrypted.'
        } else if (e.message.includes('No text')) {
          errorMsg += 'The PDF contains no extractable text (might be image-based).'
        } else {
          errorMsg += `Parsing error: ${e.message}`
        }
        errorMsg += ' For image-based PDFs, try converting to images first.]'
        
        return { text: errorMsg }
      }
    }
  }
}

async function safeOcrExtract(buffer, mimetype) {
  // Cache OCR results by content hash to speed up repeated uploads
  const cacheDir = getCacheDir()
  const hash = sha256(buffer)
  const cachePath = path.join(cacheDir, `ocr-${hash}.txt`)
  try {
    if (fs.existsSync(cachePath)) {
      return fs.readFileSync(cachePath, 'utf8')
    }
  } catch {/* ignore cache read errors */}

  if (process.env.NODE_ENV === 'test') {
    return '[Image OCR skipped during automated tests]'
  }

  const tesseract = await loadTesseract()
  if (!tesseract) {
    return '[Image provided – Tesseract.js OCR not available. Install tesseract.js for image text extraction.]'
  }
  
  // Check if OCR is enabled via environment
  if (process.env.OCR_ENABLED === 'false') {
    return '[Image provided – OCR disabled via OCR_ENABLED=false]'
  }
  
  try {
    // Optional light pre-processing to improve speed/accuracy
    let workBuffer = buffer
    if (process.env.OCR_PREPROCESS !== '0') {
      try {
        // Import Jimp dynamically and handle both default and named exports
        const Jimp = await import('jimp').then(m => m.default || m.Jimp || m)
        const img = await Jimp.read(buffer)
        const maxDim = parseInt(process.env.OCR_MAX_DIMENSION || '1600', 10)
        if (img.getWidth() > maxDim || img.getHeight() > maxDim) {
          img.scaleToFit(maxDim, maxDim)
        }
        img.grayscale()
        img.contrast(0.2)
        workBuffer = await img.getBufferAsync(img.getMIME())
      } catch (e) {
        console.warn('[extractText] OCR pre-processing skipped:', e.message)
      }
    }

    const worker = await tesseract.createWorker()
    const languages = process.env.OCR_LANGUAGES || 'eng'
    
    // Note: loadLanguage and initialize are deprecated - workers come pre-loaded and pre-initialized
    console.log(`[extractText] Starting OCR for ${mimetype} with languages: ${languages}`)
    const startTime = Date.now()
    
  const { data: { text, confidence } } = await worker.recognize(workBuffer)
    await worker.terminate()
    
    const duration = Date.now() - startTime
    console.log(`[extractText] OCR completed in ${duration}ms, confidence: ${Math.round(confidence)}%, extracted ${text.length} characters`)
    
    if (text.trim().length === 0) {
      return '[Image processed but no readable text detected via OCR]'
    }
    
    // Add confidence note if low
    const confidenceNote = confidence < 70 ? ` (OCR confidence: ${Math.round(confidence)}%)` : ''
    const out = text.trim() + confidenceNote
    try { fs.writeFileSync(cachePath, out, 'utf8') } catch {/* ignore cache write errors */}
    return out
  } catch (e) {
    console.error('[extractText] OCR processing failed:', e.message)
    return `[Image OCR failed: ${e.message}]`
  }
}

import mammoth from "mammoth";
import fetch from "node-fetch";
import { load as cheerioLoad } from "cheerio";
import libre from "libreoffice-convert";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { execSync } from 'child_process'
import { spawn } from 'child_process'

// ---- Simple disk cache utilities ----
function getCacheDir() {
  const dir = path.join(process.cwd(), 'uploads', '.cache')
  try { fs.mkdirSync(dir, { recursive: true }) } catch {/* ignore if already exists */}
  return dir
}
function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

// Detect LibreOffice availability lazily (best effort) with Windows fallbacks and env override.
let _LIBRE_AVAILABLE = null // null = undetected, boolean after first check
let SOFFICE_CMD = process.env.SOFFICE_PATH || 'soffice'

function tryDetectLibre() {
  const unquote = (s) => (s || '').replace(/^"|"$/g, '')
  const candidates = [
    unquote(SOFFICE_CMD),
    // Prefer soffice.com on Windows to avoid GUI/console prompts
    ...(process.platform === 'win32' ? [
      'soffice.com',
      'C:/Program Files/LibreOffice/program/soffice.com',
      'C:/Program Files (x86)/LibreOffice/program/soffice.com',
      'soffice.exe',
      'C:/Program Files/LibreOffice/program/soffice.exe',
      'C:/Program Files (x86)/LibreOffice/program/soffice.exe'
    ] : ['soffice'])
  ]
  // Allow skipping detection entirely (useful if detection pops a console on Windows)
  if (process.platform === 'win32' && process.env.LIBRE_SKIP_DETECT === '1') {
    // Trust provided SOFFICE_PATH if any; otherwise we’ll report unavailable and let calls fail gracefully.
    if (process.env.SOFFICE_PATH) {
      SOFFICE_CMD = unquote(process.env.SOFFICE_PATH)
      process.env.LIBREOFFICE_BIN = SOFFICE_CMD
      return true
    }
    return false
  }
  for (const c of candidates) {
    try {
      // On Windows, hide any console window and pass headless flags to avoid first-run prompts
      const flags = '--headless --invisible --nologo --nodefault --norestore --nolockcheck --nofirststartwizard --version'
      execSync(`"${c}" ${flags}`, { stdio: 'ignore', windowsHide: true })
      SOFFICE_CMD = c
      // Let libreoffice-convert know exactly which binary to use
      process.env.LIBREOFFICE_BIN = c
      return true
    } catch (_) { /* continue */ }
  }
  return false
}

function isLibreAvailable() {
  if (process.env.LIBRE_FORCE_DISABLE === '1') return false
  if (_LIBRE_AVAILABLE === null) {
    _LIBRE_AVAILABLE = tryDetectLibre()
    if (!_LIBRE_AVAILABLE && !process.env.SILENCE_LIBRE_WARNING) {
      console.warn('[extractText] LibreOffice (soffice) not found. Conversions for PPTX/DOC/PPT will be disabled. Set SOFFICE_PATH or install from https://www.libreoffice.org/')
    }
  }
  return _LIBRE_AVAILABLE
}

// ---- Helper: convert PPTX -> PDF using LibreOffice ----
async function convertWithLibreLibrary(inputBuffer, ext) {
  return new Promise((resolve, reject) => {
    try {
      // Ensure the library uses the same binary we detected
      if (SOFFICE_CMD) process.env.LIBREOFFICE_BIN = SOFFICE_CMD
      // Temporarily sanitize Python-related env vars to avoid LO embedded Python conflicts
      const saved = {
        PYTHONHOME: process.env.PYTHONHOME,
        PYTHONPATH: process.env.PYTHONPATH,
        PYTHONNOUSERSITE: process.env.PYTHONNOUSERSITE,
        VIRTUAL_ENV: process.env.VIRTUAL_ENV,
      }
      delete process.env.PYTHONHOME
      delete process.env.PYTHONPATH
      delete process.env.PYTHONNOUSERSITE
      delete process.env.VIRTUAL_ENV

      libre.convert(inputBuffer, ext, undefined, (err, done) => {
        // Restore env
        Object.assign(process.env, saved)
        if (err) return reject(err);
        resolve(done);
      });
    } catch (e) {
      reject(e)
    }
  })
}

// Convert using "soffice" directly to ensure full headless, non-interactive behavior
async function convertWithSoffice(inputBuffer, toExt, inputExt) {
  if (!isLibreAvailable()) throw new Error('LibreOffice not available')

  const tmpRoot = path.join(process.cwd(), 'uploads', '.lo-tmp')
  const profileDir = process.env.LIBRE_OFFICE_PROFILE_DIR
    ? process.env.LIBRE_OFFICE_PROFILE_DIR
    : path.join(tmpRoot, '.lo-profile')
  const workDir = path.join(tmpRoot, `job-${Date.now()}-${Math.random().toString(36).slice(2,8)}`)
  fs.mkdirSync(workDir, { recursive: true })
  fs.mkdirSync(profileDir, { recursive: true })

  const safeInputExt = (inputExt && inputExt.startsWith('.')) ? inputExt : (inputExt ? `.${inputExt}` : '')
  const inPath = path.join(workDir, `input${safeInputExt}`)
  fs.writeFileSync(inPath, inputBuffer)

  // Build file URL for UserInstallation
  function toFileUrl(p) {
    const abs = path.resolve(p)
    const url = 'file:///' + abs.replace(/\\/g, '/').replace(/:/, ':')
    return url
  }

  // Choose export filter based on input type when converting to PDF
  const target = toExt.replace(/^\./, '')
  let filter = target
  const extLower = (safeInputExt || '').toLowerCase()
  if (target === 'pdf') {
    if (extLower === '.pptx' || extLower === '.ppt') filter = 'pdf:impress_pdf_Export'
    else if (extLower === '.docx' || extLower === '.doc') filter = 'pdf:writer_pdf_Export'
    else if (extLower === '.xlsx' || extLower === '.xls') filter = 'pdf:calc_pdf_Export'
  }

  const args = [
    '--headless', '--invisible', '--nologo', '--nodefault', '--norestore', '--nolockcheck', '--nofirststartwizard',
    `-env:UserInstallation=${toFileUrl(profileDir)}`,
    '--convert-to', filter, '--outdir', workDir, inPath
  ]

  await new Promise((resolve, reject) => {
    // Sanitize Python-related env vars; LO embeds Python and can break if these are set globally
    const env = { ...process.env }
    delete env.PYTHONHOME
    delete env.PYTHONPATH
    delete env.PYTHONNOUSERSITE
    delete env.VIRTUAL_ENV
    const child = spawn(SOFFICE_CMD, args, { stdio: ['ignore','pipe','pipe'], windowsHide: true, env })
    let err = ''
    // eslint-disable-next-line no-unused-vars
    let out = ''
    child.stdout?.on('data', d => { out += d.toString() })
    child.stderr?.on('data', d => { err += d.toString() })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve(0); else {
        const msg = `soffice exited with code ${code}${err ? `; stderr: ${err.trim().slice(0, 800)}` : ''}`
        reject(new Error(msg))
      }
    })
  })

  // Find the converted file (same basename, target extension)
  const files = fs.readdirSync(workDir)
  const targetExt = toExt.replace(/^\./, '')
  const outName = files.find(f => f.toLowerCase().endsWith(`.${targetExt.toLowerCase()}`))
  if (!outName) throw new Error('No output from soffice conversion')
  const outBuf = fs.readFileSync(path.join(workDir, outName))

  // Best effort cleanup (ignore errors)
  try { fs.rmSync(workDir, { recursive: true, force: true }) } catch {/* ignore cleanup errors */}
  return outBuf
}

// Cached conversion wrapper (PPTX/DOC/PPT -> PDF)
async function convertWithLibreCached(inputBuffer, toExt, inputExt) {
  const cacheDir = getCacheDir()
  const hash = sha256(Buffer.concat([inputBuffer, Buffer.from(`|${inputExt||''}|${toExt}`)]))
  const outPath = path.join(cacheDir, `lo-${hash}${toExt}`)
  try {
    if (fs.existsSync(outPath)) {
      return fs.readFileSync(outPath)
    }
  } catch {/* ignore cache read errors */}

  let outBuf
  try {
    outBuf = await convertWithSoffice(inputBuffer, toExt, inputExt)
  } catch (e) {
    outBuf = await convertWithLibreLibrary(inputBuffer, toExt)
  }
  try { fs.writeFileSync(outPath, outBuf) } catch {/* ignore cache write errors */}
  return outBuf
}

/**
 * Extracts plain text from a file buffer OR a URL
 * @param {Object} source - Either { buffer, mimetype } or { url }
 * @returns {Promise<string>} plain text
 */
export async function extractText(source) {
  // Case 1: URL
  if (source.url) {
    const res = await fetch(source.url, { redirect: "follow" });
    if (!res.ok) return "";
    const html = await res.text();
    const $ = cheerioLoad(html);

    // Strip scripts, styles, nav elements
    ["script","style","nav","header","footer","noscript","iframe"].forEach(tag => $(tag).remove());

    const title = ("" + $("title").first().text()).trim();
    const paragraphs = $("p")
      .map((i, el) => $(el).text().trim())
      .get()
      .filter(t => t.length > 0)
      .join("\n\n");

    return `${title}\n\n${paragraphs}`.trim();
  }

  // Case 2: File buffer
  const { mimetype, buffer } = source;

  if (!buffer) return "";

  // PDF
  if (mimetype.includes("pdf")) {
    const data = await safePdfParse(buffer)
    return data.text
  }

  // DOCX (Word)
  if (
    mimetype.includes("word") ||
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // PPTX (PowerPoint)
  if (
    mimetype.includes("presentation") ||
    mimetype ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    if (!isLibreAvailable()) {
      return '[PPTX provided – LibreOffice not installed; install LibreOffice or set SOFFICE_PATH to enable slide text extraction.]'
    }
    try {
  const pdfBuf = await convertWithLibreCached(buffer, '.pdf', '.pptx')
      const data = await safePdfParse(pdfBuf)
      return data.text
    } catch (e) {
      console.error('[extractText] PPTX conversion failed:', e.message)
      return ''
    }
  }

  // Legacy DOC (Word 97-2003)
  if (mimetype === 'application/msword') {
    if (!isLibreAvailable()) {
      return '[DOC provided – LibreOffice not installed; install LibreOffice or set SOFFICE_PATH to enable DOC text extraction.]'
    }
    try {
  const pdfBuf = await convertWithLibreCached(buffer, '.pdf', '.doc')
      const data = await safePdfParse(pdfBuf)
      return data.text
    } catch (e) {
      console.error('[extractText] DOC conversion failed:', e.message)
      return ''
    }
  }

  // Legacy PPT (PowerPoint 97-2003)
  if (mimetype === 'application/vnd.ms-powerpoint') {
    if (!isLibreAvailable()) {
      return '[PPT provided – LibreOffice not installed; install LibreOffice or set SOFFICE_PATH to enable PPT text extraction.]'
    }
    try {
  const pdfBuf = await convertWithLibreCached(buffer, '.pdf', '.ppt')
      const data = await safePdfParse(pdfBuf)
      return data.text
    } catch (e) {
      console.error('[extractText] PPT conversion failed:', e.message)
      return ''
    }
  }

  // HTML (uploaded file): strip tags and extract readable text
  if (mimetype === "text/html" || mimetype === "application/xhtml+xml") {
    try {
      const html = buffer.toString("utf8");
      const $ = cheerioLoad(html);
      ["script","style","nav","header","footer","noscript","iframe"].forEach(tag => $(tag).remove());

  const title = ("" + $("title").first().text()).trim();
  const h1Text = ("" + $("h1").first().text()).trim();

      // Collect headings, paragraphs, and list items in order
      const blocks = [];
      $("h1, h2, h3, h4, h5, h6, p, li").each((i, el) => {
        const tag = (el.tagName || el.name || '').toLowerCase();
        let text = $(el).text().replace(/\s+/g, ' ').trim();
        if (!text) return;
        if (tag === 'li') {
          const isOrdered = $(el).parents('ol').length > 0;
          if (isOrdered) {
            const idx = $(el).prevAll('li').length + 1;
            text = `${idx}. ${text}`; // preserve ordered list numbering
          } else {
            text = `- ${text}`; // preserve unordered list bullets
          }
        }
        blocks.push(text);
      });

      // Helper for robust equality (case/space/punct insensitive)
      const norm = (s) => (s || '')
        .toLowerCase()
        .replace(/[\s\u00A0]+/g, ' ')
        .replace(/[\p{P}\p{S}]+/gu, '')
        .trim();

      // Avoid duplicating the title if the first block repeats it
      if (blocks.length && title && norm(blocks[0]) === norm(title)) {
        blocks.shift();
      }

      // Also guard against immediate double lines at the very start
      if (blocks.length > 1 && norm(blocks[0]) === norm(blocks[1])) {
        blocks.splice(1, 1);
      }

      // De-duplicate consecutive identical lines
      const deduped = blocks.filter((t, i, arr) => i === 0 || t !== arr[i - 1]);

  const bodyText = deduped.join("\n\n");

  // Include <title> only if there is no matching <h1> (to avoid duplication)
  const includeTitle = title && (!h1Text || norm(title) !== norm(h1Text));
  return `${includeTitle ? title + "\n\n" : ""}${bodyText}`.trim();
    } catch (e) {
      console.warn('[extractText] HTML parsing failed, returning raw text:', e.message)
      return buffer.toString("utf8");
    }
  }

  // Plain text / JSON
  if (mimetype.startsWith("text/") || mimetype === "application/json") {
    return buffer.toString("utf8");
  }

  // Images (OCR with Tesseract.js)
  if (mimetype.startsWith("image/")) {
    return await safeOcrExtract(buffer, mimetype)
  }

  return "";
}
