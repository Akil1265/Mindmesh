import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import fs from 'fs';

// Create a new Word document
const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({
        text: "Mind-Mesh Test Document",
        heading: HeadingLevel.TITLE,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "This is a test DOCX document created for the Mind-Mesh file upload and summarization system.",
            break: 1,
          }),
        ],
      }),
      new Paragraph({
        text: "Key Features of Mind-Mesh:",
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [
          new TextRun("• File upload support for multiple document formats"),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun("• Advanced text extraction from PDF, DOCX, PPTX files"),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun("• OCR technology for extracting text from images"),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun("• AI-powered summarization using Google Gemini API"),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun("• Multiple summary styles: short, medium, long, and bullets"),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun("• Support for multiple languages and international content"),
        ],
      }),
      new Paragraph({
        text: "Technical Capabilities:",
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "The Mind-Mesh system processes documents in real-time and provides comprehensive metadata including processing times, file information, extracted text statistics, and AI confidence scores.",
            break: 1,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "The system uses advanced natural language processing to understand document content and generate meaningful summaries that capture key points and essential information from uploaded files.",
            break: 1,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "This document serves as a test case to demonstrate the text extraction and summarization capabilities across different file formats.",
            break: 1,
          }),
        ],
      }),
    ],
  }],
});

// Generate the document buffer and save to file
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("test-document.docx", buffer);
  console.log("Test DOCX document created: test-document.docx");
});