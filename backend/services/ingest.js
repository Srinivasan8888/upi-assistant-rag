import fs from 'fs';
import pdfParse from 'pdf-parse';
import { pipeline } from '@xenova/transformers';
import DocumentChunk from '../models/DocumentChunk.js';
import Document from '../models/Document.js';

let embedder;

async function getEmbedder() {
  if (!embedder) {
    console.log("Loading MiniLM embedding model for ingest (one-time)...");
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

export const ingestPDF = async (filePath, documentId) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    // Simple chunking ~1000 chars (consistent with old Python code)
    const chunkSize = 1000;
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }

    const embedFn = await getEmbedder();
    const docMeta = await Document.findById(documentId);
    let chunkCounter = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunkStr = chunks[i].trim();
      if (!chunkStr) continue;

      // Create embedding using all-MiniLM-L6-v2 (same as ChromaDB legacy)
      const output = await embedFn(chunkStr.replace(/\n/g, ' '), { pooling: 'mean', normalize: true });
      const embArray = Array.from(output.data);

      await DocumentChunk.create({
        documentId: documentId,
        text: chunkStr,
        embedding: embArray,
        metadata: {
          source: docMeta ? docMeta.filename : 'unknown',
          chunk_index: i
        }
      });
      chunkCounter++;
    }

    if (docMeta) {
      docMeta.status = 'ingested';
      docMeta.chunk_count = chunkCounter;
      await docMeta.save();
    }

    console.log(`[Ingest] Successfully processed ${documentId}. Inserted ${chunkCounter} chunks.`);

    // Clean up temporary upload file
    fs.unlinkSync(filePath);

    return { message: `Successfully ingested ${chunkCounter} chunks` };

  } catch (error) {
    console.error(`[Ingest] Error processing document ${documentId}:`, error.message);

    try {
      await Document.findByIdAndUpdate(documentId, { status: 'failed' });
    } catch (e) { }

    throw error;
  }
};
