import PDFDocument from 'pdfkit'
import PptxGenJS from 'pptxgenjs'
import { Document, Packer, Paragraph } from 'docx'
import archiver from 'archiver'

// For image export we will lazily import puppeteer (heavy) only if requested

export async function generateOne(format, summaryObj) {
  const { summary, highlights = [] } = summaryObj
  switch (format) {
    case 'txt':
      return bufferResult('summary.txt', 'text/plain', Buffer.from(summary, 'utf8'))
    case 'pdf':
      return await generatePdf(summary, highlights)
    case 'docx':
      return await generateDocx(summary, highlights)
    case 'pptx':
      return await generatePptx(summary, highlights)
    case 'image':
      return await generateImage(summary)
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

export async function generateMany(formats, summaryObj) {
  if (formats.length === 1) return generateOne(formats[0], summaryObj)
  const archiveStream = archiver('zip', { zlib: { level: 9 } })
  const buffers = []
  const promise = new Promise((resolve, reject) => {
    archiveStream.on('warning', err => { if (err.code !== 'ENOENT') reject(err) })
    archiveStream.on('error', reject)
    archiveStream.on('data', d => buffers.push(d))
    archiveStream.on('end', () => resolve(Buffer.concat(buffers)))
  })

  for (const f of formats) {
    try {
      const { filename, buffer } = await generateOne(f, summaryObj)
      archiveStream.append(buffer, { name: filename })
    } catch (e) {
      const errMsg = `Failed to generate ${f}: ${e.message}`
      archiveStream.append(Buffer.from(errMsg), { name: `error-${f}.txt` })
    }
  }
  archiveStream.finalize()
  const zipBuffer = await promise
  return bufferResult('summary_bundle.zip', 'application/zip', zipBuffer)
}

// ---- Individual generators ----
async function generatePdf(summary, highlights) {
  const doc = new PDFDocument({ margin: 40 })
  const chunks = []
  doc.on('data', d => chunks.push(d))
  const done = new Promise(res => doc.on('end', res))
  doc.fontSize(20).text('Summary', { underline: true })
  doc.moveDown()
  doc.fontSize(12).text(summary, { align: 'left' })
  if (highlights.length) {
    doc.moveDown().fontSize(14).text('Highlights:', { underline: true })
    doc.fontSize(11)
    highlights.forEach(h => doc.list([h]))
  }
  doc.end()
  await done
  return bufferResult('summary.pdf', 'application/pdf', Buffer.concat(chunks))
}

async function generateDocx(summary, highlights) {
  const paragraphs = []
  paragraphs.push(new Paragraph({ text: 'Summary', heading: 'Heading1' }))
  paragraphs.push(new Paragraph(summary))
  if (highlights.length) {
    paragraphs.push(new Paragraph({ text: 'Highlights', heading: 'Heading2' }))
    highlights.forEach(h => paragraphs.push(new Paragraph('• ' + h)))
  }
  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] })
  const buffer = await Packer.toBuffer(doc)
  return bufferResult('summary.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer)
}

async function generatePptx(summary, highlights) {
  const pptx = new PptxGenJS()
  const maxCharsPerSlide = 900
  // Split summary
  const slidesData = chunkString(summary, maxCharsPerSlide)
  slidesData.forEach((chunk, idx) => {
    const slide = pptx.addSlide()
    slide.addText(idx === 0 ? 'Summary' : 'Continued', { x: 0.5, y: 0.3, fontSize: 24, bold: true })
    slide.addText(chunk, { x: 0.5, y: 1.0, fontSize: 14, w: 9, h: 4.5, valign: 'top' })
  })
  if (highlights.length) {
    const slide = pptx.addSlide()
    slide.addText('Highlights', { x: 0.5, y: 0.3, fontSize: 24, bold: true })
    slide.addText(highlights.map(h => '• ' + h).join('\n'), { x: 0.5, y: 1.0, fontSize: 16, w: 9, h: 5 })
  }
  const buffer = await pptx.write('arraybuffer')
  return bufferResult('summary.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', Buffer.from(buffer))
}

async function generateImage(summary) {
  // Lazy require puppeteer to avoid overhead unless needed
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.launch({ headless: 'new' })
  const page = await browser.newPage()
  const html = `<html><head><style>body{font-family:Arial;padding:24px;max-width:800px;}h1{margin-top:0;}p{line-height:1.4;white-space:pre-wrap;}</style></head><body><h1>Summary</h1><p>${escapeHtml(summary)}</p></body></html>`
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const buffer = await page.screenshot({ type: 'png', fullPage: true })
  await browser.close()
  return bufferResult('summary.png', 'image/png', buffer)
}

// ---- Helpers ----
function bufferResult(filename, mime, buffer) {
  return { filename, mime, buffer }
}

function chunkString(str, size) {
  const out = []
  for (let i = 0; i < str.length; i += size) out.push(str.slice(i, i + size))
  return out
}

function escapeHtml(str='') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

