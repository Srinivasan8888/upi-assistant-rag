import fs from 'fs';
import pdf from 'pdf-parse';
import Document from '../models/Document.js';

export async function ingestPDF(filePath, documentId) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);

    // TODO: Implement chunking and embedding
    // For now, just mark as ingested
    
    const text = data.text;
    const chunks = chunkText(text, 500);

    await Document.findByIdAndUpdate(documentId, {
      status: 'ingested',
      chunk_count: chunks.length
    });

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    console.log(`✅ Ingested PDF: ${documentId}, ${chunks.length} chunks`);
  } catch (error) {
    console.error('PDF ingestion error:', error);
    await Document.findByIdAndUpdate(documentId, { status: 'failed' });
  }
}

function chunkText(text, maxLength) {
  const chunks = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}
