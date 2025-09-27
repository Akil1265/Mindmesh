import PDFDocument from 'pdfkit';
import fs from 'fs';

// Create a simple PDF document for testing
const doc = new PDFDocument();

// Pipe the PDF to a file
doc.pipe(fs.createWriteStream('test-document.pdf'));

// Add content to the PDF
doc.fontSize(20).text('Mind-Mesh Test Document', 100, 80);

doc.fontSize(14).text('This is a test PDF document created for the Mind-Mesh file upload and summarization system.', 100, 120, {
  width: 400,
  align: 'justify'
});

doc.text('Features of Mind-Mesh:', 100, 160);
doc.text('• File upload support for multiple formats', 100, 180);
doc.text('• Text extraction from PDF, DOCX, PPTX files', 100, 200);
doc.text('• OCR technology for image text extraction', 100, 220);
doc.text('• AI-powered summarization using Gemini API', 100, 240);
doc.text('• Multiple summary styles (short, medium, long, bullets)', 100, 260);
doc.text('• Support for multiple languages', 100, 280);

doc.text('This PDF contains structured content that should be extracted and summarized effectively by the system.', 100, 320, {
  width: 400,
  align: 'justify'
});

doc.text('The system processes documents in real-time and provides detailed metadata including processing times, file information, and extracted text statistics.', 100, 360, {
  width: 400,
  align: 'justify'
});

// Finalize the PDF
doc.end();

console.log('Test PDF created: test-document.pdf');