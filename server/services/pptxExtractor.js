import JSZip from 'jszip'
import { parseString } from 'xml2js'
import { promisify } from 'util'

const parseXml = promisify(parseString)

export async function extractPPTXText(buffer) {
  try {
    // PPTX files are ZIP archives
    const zip = await JSZip.loadAsync(buffer)
    let allText = ''
    
    // Get all slide files (ppt/slides/slide1.xml, slide2.xml, etc.)
    const slideFiles = Object.keys(zip.files).filter(filename => 
      filename.match(/^ppt\/slides\/slide\d+\.xml$/)
    )
    
    console.log(`[PPTX] Found ${slideFiles.length} slides`)
    
    for (const slideFile of slideFiles) {
      try {
        const slideContent = await zip.files[slideFile].async('text')
        const slideXml = await parseXml(slideContent)
        
        // Extract text from XML structure
        const slideText = extractTextFromSlideXml(slideXml)
        if (slideText.trim()) {
          allText += slideText + '\n\n'
        }
      } catch (err) {
        console.warn(`[PPTX] Failed to parse slide ${slideFile}:`, err.message)
      }
    }
    
    return allText.trim()
  } catch (error) {
    console.error('[PPTX] Extraction failed:', error.message)
    throw error
  }
}

function extractTextFromSlideXml(slideXml) {
  let text = ''
  
  // Navigate the XML structure to find text content
  // PPTX XML structure: slide > cSld > spTree > sp > txBody > p > r > t
  try {
    const slide = slideXml['p:sld']
    if (!slide) return ''
    
    const cSld = slide['p:cSld']
    if (!cSld || !cSld[0]) return ''
    
    const spTree = cSld[0]['p:spTree']
    if (!spTree || !spTree[0]) return ''
    
    const shapes = spTree[0]['p:sp']
    if (!shapes) return ''
    
    // Extract text from each shape
    shapes.forEach(shape => {
      try {
        const txBody = shape['p:txBody']
        if (!txBody || !txBody[0]) return
        
        const paragraphs = txBody[0]['a:p']
        if (!paragraphs) return
        
        paragraphs.forEach(paragraph => {
          try {
            const runs = paragraph['a:r']
            if (!runs) return
            
            runs.forEach(run => {
              try {
                const textElement = run['a:t']
                if (textElement && textElement[0]) {
                  text += textElement[0] + ' '
                }
              } catch (e) {
                // Skip invalid runs
              }
            })
          } catch (e) {
            // Skip invalid paragraphs
          }
        })
        
        text += '\n'
      } catch (e) {
        // Skip invalid shapes
      }
    })
  } catch (e) {
    console.warn('[PPTX] XML parsing error:', e.message)
  }
  
  return text
}