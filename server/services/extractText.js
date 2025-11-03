// server/src/services/extractText.js
// Pure JavaScript text extraction - no external dependencies required

let _pdfParseLoaded = null
async function loadPdfParse() {
  if (_pdfParseLoaded) return _pdfParseLoaded
  try {
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
    
    const result = await pdfParse(buffer)
    console.log(`[extractText] PDF parsing successful, extracted ${result.text.length} characters`)
    
    if (result.text && result.text.trim().length > 0) {
      const cleanedText = result.text
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim()
      
      return { text: cleanedText, numpages: result.numpages, info: result.info }
    }
    
    return { text: '', numpages: result.numpages || 0, info: result.info || {} }
  } catch (e) {
    console.error('[extractText] PDF parsing failed:', e.message)
    return { text: `PDF parsing failed: ${e.message}`, numpages: 0, info: {} }
  }
}

async function safeOcr(buffer) {
  const tesseract = await loadTesseract()
  if (!tesseract) return ''
  
  const { createWorker } = tesseract
  const worker = await createWorker('eng')
  
  try {
    const { data: { text } } = await worker.recognize(buffer)
    return text.trim()
  } catch (e) {
    console.error('[extractText] OCR failed:', e.message)
    return `OCR failed: ${e.message}`
  } finally {
    await worker.terminate()
  }
}

import mammoth from "mammoth";
import fetch from "node-fetch";
import { load as cheerioLoad } from "cheerio";

/* global document */

// Full website content extraction using Puppeteer
async function extractWebsiteContent(url) {
  let browser = null
  try {
    console.log(`[extractText] Starting full website extraction for: ${url}`)
    
    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    })
    
    const page = await browser.newPage()
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 })
    
    // Navigate to the page and wait for network to be idle
    console.log(`[extractText] Navigating to URL...`)
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    })
    
    console.log(`[extractText] Page loaded, extracting content...`)
    
    // Extract comprehensive content from the page
    const content = await page.evaluate(() => {
      // Helper function to clean text
      const cleanText = (text) => text.replace(/\s+/g, ' ').trim()
      
      // Remove unwanted elements
      const unwantedSelectors = [
        'script', 'style', 'noscript', 'iframe', 
        'svg', 'path', 'use',
        '.advertisement', '.ads', '.cookie-banner',
        '[role="banner"]', '[role="complementary"]',
        'nav', 'footer'
      ]
      unwantedSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove())
      })
      
      const extracted = {
        title: document.title || '',
        description: '',
        headings: [],
        mainContent: [],
        lists: [],
        tables: [],
        links: []
      }
      
      // Meta description
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        extracted.description = cleanText(metaDesc.getAttribute('content') || '')
      }
      
      // All headings (h1-h6)
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
        const text = cleanText(heading.textContent)
        if (text.length > 0 && text.length < 200) {
          extracted.headings.push({
            level: heading.tagName.toLowerCase(),
            text: text
          })
        }
      })
      
      // Main content - paragraphs, divs with substantial text
      document.querySelectorAll('p, article, section, div.content, div.post, div.article, main').forEach(el => {
        const text = cleanText(el.textContent)
        // Only add if it has meaningful content (at least 50 chars)
        if (text.length >= 50) {
          extracted.mainContent.push(text)
        }
      })
      
      // Lists (ul, ol)
      document.querySelectorAll('ul, ol').forEach(list => {
        const items = []
        list.querySelectorAll('li').forEach(li => {
          const text = cleanText(li.textContent)
          if (text.length > 0 && text.length < 500) {
            items.push(text)
          }
        })
        if (items.length > 0) {
          extracted.lists.push(items)
        }
      })
      
      // Tables
      document.querySelectorAll('table').forEach(table => {
        const rows = []
        table.querySelectorAll('tr').forEach(tr => {
          const cells = []
          tr.querySelectorAll('td, th').forEach(cell => {
            const text = cleanText(cell.textContent)
            if (text.length > 0) {
              cells.push(text)
            }
          })
          if (cells.length > 0) {
            rows.push(cells.join(' | '))
          }
        })
        if (rows.length > 0) {
          extracted.tables.push(rows.join('\n'))
        }
      })
      
      // Important links with context
      document.querySelectorAll('a[href]').forEach(link => {
        const text = cleanText(link.textContent)
        const href = link.getAttribute('href')
        if (text.length > 0 && text.length < 100 && href && !href.startsWith('#')) {
          extracted.links.push({ text, href })
        }
      })
      
      return extracted
    })
    
    console.log(`[extractText] Extraction complete. Found ${content.headings.length} headings, ${content.mainContent.length} content blocks`)
    
    // Format the extracted content into readable text
    let formattedText = ''
    
    // Title and Description
    if (content.title) {
      formattedText += `TITLE: ${content.title}\n\n`
    }
    if (content.description) {
      formattedText += `DESCRIPTION: ${content.description}\n\n`
    }
    
    // Headings with hierarchy
    if (content.headings.length > 0) {
      formattedText += '=== PAGE STRUCTURE ===\n\n'
      content.headings.forEach(h => {
        const indent = '  '.repeat(parseInt(h.level.charAt(1)) - 1)
        formattedText += `${indent}${h.text}\n`
      })
      formattedText += '\n'
    }
    
    // Main content
    if (content.mainContent.length > 0) {
      formattedText += '=== MAIN CONTENT ===\n\n'
      // Remove duplicates while preserving order
      const uniqueContent = [...new Set(content.mainContent)]
      formattedText += uniqueContent.join('\n\n')
      formattedText += '\n\n'
    }
    
    // Lists
    if (content.lists.length > 0) {
      formattedText += '=== LISTS ===\n\n'
      content.lists.forEach((items, idx) => {
        formattedText += `List ${idx + 1}:\n`
        items.forEach(item => formattedText += `  • ${item}\n`)
        formattedText += '\n'
      })
    }
    
    // Tables
    if (content.tables.length > 0) {
      formattedText += '=== TABLES ===\n\n'
      content.tables.forEach((table, idx) => {
        formattedText += `Table ${idx + 1}:\n${table}\n\n`
      })
    }
    
    // Important links (limit to first 20)
    if (content.links.length > 0) {
      formattedText += '=== IMPORTANT LINKS ===\n\n'
      content.links.slice(0, 20).forEach(link => {
        formattedText += `• ${link.text}: ${link.href}\n`
      })
      formattedText += '\n'
    }
    
    await browser.close()
    browser = null
    
    console.log(`[extractText] Formatted text length: ${formattedText.length} characters`)
    return formattedText.trim()
    
  } catch (error) {
    if (browser) {
      try {
        await browser.close()
      } catch (closeErr) {
        console.error('[extractText] Error closing browser:', closeErr.message)
      }
    }
    
    console.error('[extractText] Puppeteer extraction failed:', error.message)
    console.log('[extractText] Falling back to simple fetch method...')
    
    // Fallback to simple fetch if Puppeteer fails
    try {
      const res = await fetch(url, { redirect: "follow" })
      if (!res.ok) return `Failed to fetch URL: ${res.status} ${res.statusText}`
      
      const html = await res.text()
      const $ = cheerioLoad(html)
      const tagsToStrip = ["script","style","nav","header","footer","noscript","iframe"]
      tagsToStrip.forEach(tag => $(tag).remove())
      
      const title = $("title").first().text().trim()
      const paragraphs = $("p")
        .map((i, el) => $(el).text().trim())
        .get()
        .filter(t => t.length > 0)
        .join("\n\n")
      
      return `${title}\n\n${paragraphs}`.trim()
    } catch (fallbackError) {
      console.error('[extractText] Fallback extraction also failed:', fallbackError.message)
      return `Failed to extract content from URL: ${error.message}`
    }
  }
}

export async function extractText(source) {
  // Case 1: URL - Full website content extraction
  if (source.url) {
    return await extractWebsiteContent(source.url)
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
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // PPTX (PowerPoint) - Pure JavaScript extraction
  if (
    mimetype.includes("presentation") ||
    mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    try {
      const { extractPPTXText } = await import('./pptxExtractor.js')
      const text = await extractPPTXText(buffer)
      if (text && text.trim().length > 0) {
        return text.trim()
      }
      return '[PPTX provided – Unable to extract text content.]'
    } catch (jsError) {
      console.error('[extractText] PPTX extraction failed:', jsError.message)
      return '[PPTX provided – Text extraction failed. Please try converting to DOCX or PDF format.]'
    }
  }

  // Legacy DOC (Word 97-2003) - Not supported
  if (mimetype === 'application/msword') {
    return '[DOC provided – Legacy DOC format not supported. Please convert to DOCX format.]'
  }

  // Legacy PPT (PowerPoint 97-2003) - Not supported
  if (mimetype === 'application/vnd.ms-powerpoint') {
    return '[PPT provided – Legacy PPT format not supported. Please convert to PPTX format.]'
  }

  // HTML (uploaded file): strip tags and extract readable text
  if (mimetype === "text/html" || mimetype === "application/xhtml+xml") {
    try {
      const html = buffer.toString("utf8");
      const $ = cheerioLoad(html);
      const tagsToStrip = ["script","style","nav","header","footer","noscript","iframe"]
      tagsToStrip.forEach(tag => $(tag).remove());
      return $("body").text().replace(/\s+/g, ' ').trim() || $.text().replace(/\s+/g, ' ').trim();
    } catch (e) {
      console.error('[extractText] HTML parsing failed:', e.message)
      return buffer.toString("utf8").replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
  }

  // Plain text or JSON
  if (mimetype.includes("text") || mimetype.includes("json")) {
    return buffer.toString("utf8");
  }

  // Images - OCR extraction
  if (mimetype.startsWith("image/")) {
    try {
      const ocrText = await safeOcr(buffer)
      return ocrText || '[Image provided – No text detected via OCR.]'
    } catch (e) {
      console.error('[extractText] Image OCR failed:', e.message)
      return '[Image provided – OCR text extraction failed.]'
    }
  }

  // RTF (Rich Text Format) - basic text extraction
  if (mimetype === "application/rtf" || mimetype === "text/rtf") {
    try {
      const rtfText = buffer.toString("utf8");
      // Simple RTF parsing - remove control words and extract plain text
      return rtfText
        .replace(/\\[a-z]+\d*\s?/gi, ' ') // Remove RTF control words
        .replace(/[{}]/g, ' ') // Remove braces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    } catch (e) {
      console.error('[extractText] RTF parsing failed:', e.message)
      return '[RTF provided – Text extraction failed.]'
    }
  }

  // CSV files
  if (mimetype === "text/csv" || mimetype === "application/csv") {
    return buffer.toString("utf8");
  }

  // Default fallback
  return `[File type '${mimetype}' provided – Text extraction not supported for this format.]`;
}