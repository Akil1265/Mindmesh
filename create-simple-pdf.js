const fs = require('fs');
const PDFDocument = require('pdfkit');

// Create a new PDF document
const doc = new PDFDocument();

// Create a write stream to save the PDF
const stream = fs.createWriteStream('simple-test-document.pdf');
doc.pipe(stream);

// Add simple text content without complex formatting
doc.fontSize(16)
   .text('Mind-Mesh PDF Test Document', 50, 50);

doc.moveDown();
doc.fontSize(12)
   .text('This is a simple PDF document created to test the Mind-Mesh text extraction system.', 50, 100, {
     width: 400,
     align: 'left'
   });

doc.moveDown();
doc.text('Key Features:', 50, 140);

doc.moveDown();
doc.text('File upload support for multiple document formats', 70, 170);
doc.text('Advanced text extraction from PDF DOCX PPTX files', 70, 190);
doc.text('OCR technology for extracting text from images', 70, 210);
doc.text('AI-powered summarization using Google Gemini API', 70, 230);
doc.text('Multiple summary styles short medium long and bullets', 70, 250);
doc.text('Support for multiple languages and international content', 70, 270);

doc.moveDown();
doc.text('Technical Details:', 50, 310);

doc.moveDown();
doc.text('The Mind-Mesh system processes documents in real-time and provides comprehensive metadata including processing times file information extracted text statistics and AI confidence scores.', 50, 340, {
  width: 400,
  align: 'left'
});

doc.moveDown();
doc.text('The system uses advanced natural language processing to understand document content and generate meaningful summaries that capture key points and essential information from uploaded files.', 50, 400, {
  width: 400,
  align: 'left'
});

doc.moveDown();
doc.text('This PDF serves as a test case to demonstrate the text extraction and summarization capabilities for PDF format files.', 50, 460, {
  width: 400,
  align: 'left'
});

// Finalize the PDF
doc.end();

stream.on('finish', () => {
  console.log('Simple test PDF created: simple-test-document.pdf');
});