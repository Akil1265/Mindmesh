import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractText } from '../services/extractText.js';
import { summarize } from '../services/summarizeProvider.js';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    // Keep original filename with timestamp to avoid conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image formats
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
      'application/msword', // doc
      'application/vnd.ms-powerpoint', // ppt
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'text/plain',
      'text/html',
      'application/octet-stream' // Generic binary, check extension
    ];
    
    // Check file extension for octet-stream files
    if (file.mimetype === 'application/octet-stream') {
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = ['.pdf', '.docx', '.pptx', '.doc', '.ppt'];
      
      if (allowedExtensions.includes(ext)) {
        // Override mimetype based on extension
        if (ext === '.docx') file.mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === '.pptx') file.mimetype = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        else if (ext === '.doc') file.mimetype = 'application/msword';
        else if (ext === '.ppt') file.mimetype = 'application/vnd.ms-powerpoint';
        else if (ext === '.pdf') file.mimetype = 'application/pdf';
        
        cb(null, true);
        return;
      } else {
        cb(new Error(`File extension ${ext} not supported. Supported extensions: .pdf, .docx, .pptx, .doc, .ppt, images, and text files.`));
        return;
      }
    }
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported. Supported types: PDF, DOCX, PPTX, DOC, PPT, images (JPEG, PNG, GIF, BMP, TIFF), and text files.`));
    }
  }
});

// Ensure uploads directory exists
async function ensureUploadsDir() {
  const uploadsDir = path.join(__dirname, '../uploads/');
  try {
    await fs.access(uploadsDir);
  } catch (error) {
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory');
  }
}

// Initialize uploads directory
ensureUploadsDir();

// File upload and summarization endpoint
router.post('/upload-and-summarize', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        supportedTypes: ['PDF', 'DOCX', 'PPTX', 'DOC', 'PPT', 'Images (JPEG, PNG, GIF, BMP, TIFF)', 'TXT']
      });
    }

    const { summaryStyle = 'medium', language = 'en' } = req.body;
    
    console.log('\n🔄 Processing file upload...');
    console.log(`📄 File: ${req.file.originalname}`);
    console.log(`📊 Size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🔍 Type: ${req.file.mimetype}`);
    console.log(`💾 Saved as: ${req.file.filename}`);

    // Extract text from the uploaded file
    console.log('\n⚡ Starting text extraction...');
    const startExtraction = Date.now();
    
    // Read the file buffer
    const fileBuffer = await fs.readFile(req.file.path);
    
    const extractedText = await extractText({
      mimetype: req.file.mimetype,
      buffer: fileBuffer
    });
    
    const extractionTime = Date.now() - startExtraction;
    console.log(`✅ Text extraction completed in ${extractionTime}ms`);
    console.log(`📝 Extracted ${extractedText.length} characters`);

    if (!extractedText || extractedText.trim().length === 0) {
      // Clean up file
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ 
        error: 'No text could be extracted from the file',
        details: 'The file may be empty, corrupted, or contain only non-text content'
      });
    }

    // Show preview of extracted text
    const preview = extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : '');
    console.log(`📖 Text preview: "${preview}"`);

    // Summarize the extracted text
    console.log('\n🧠 Starting summarization...');
    const startSummarization = Date.now();
    
    const summary = await summarize(extractedText, {
      style: summaryStyle,
      language: language
    });
    
    const summarizationTime = Date.now() - startSummarization;
    console.log(`✅ Summarization completed in ${summarizationTime}ms`);
    console.log(`📋 Summary length: ${summary.summary.length} characters`);

    // Clean up uploaded file
    await fs.unlink(req.file.path).catch(() => {});

    const totalTime = Date.now() - Date.parse(req.headers['x-request-start'] || Date.now());
    
    console.log(`\n🎉 Processing complete!`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(`🔧 Provider: ${summary.provider}`);
    console.log(`📊 Chunks processed: ${summary.chunks}`);

    // Return the summary with metadata and the actual extracted text (for client display)
    res.json({
      success: true,
      file: {
        originalName: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size
      },
      extraction: {
        textLength: extractedText.length,
        processingTime: extractionTime
      },
      // Provide the extracted text explicitly for parity with streaming summarize route
      extracted: extractedText,
      summary: {
        ...summary,
        processingTime: summarizationTime,
        style: summaryStyle,
        language: language
      },
      totalProcessingTime: extractionTime + summarizationTime
    });

  } catch (error) {
    console.error('\n❌ Error processing file:', error);
    
    // Clean up file if it exists
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    if (error.message.includes('not supported')) {
      return res.status(400).json({ 
        error: error.message,
        supportedTypes: ['PDF', 'DOCX', 'PPTX', 'DOC', 'PPT', 'Images (JPEG, PNG, GIF, BMP, TIFF)', 'TXT']
      });
    }
    
    if (error.message.includes('File too large')) {
      return res.status(413).json({ 
        error: 'File too large. Maximum size is 50MB.'
      });
    }

    res.status(500).json({ 
      error: 'Failed to process file',
      details: error.message
    });
  }
});

// Get supported file types endpoint
router.get('/supported-types', (req, res) => {
  res.json({
    supportedTypes: {
      documents: ['PDF', 'DOCX', 'PPTX', 'DOC', 'PPT', 'TXT'],
      images: ['JPEG', 'JPG', 'PNG', 'GIF', 'BMP', 'TIFF'],
      maxFileSize: '50MB'
    },
    summaryStyles: ['short', 'medium', 'long', 'bullets'],
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh']
  });
});

export default router;