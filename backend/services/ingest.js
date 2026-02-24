import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

export const ingestPDF = async (filePath, documentId) => {
  try {
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(filePath));

    // Send to Python RAG Server for chunking and ChromaDB ingestion
    const res = await axios.post('http://localhost:8000/ingest', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    console.log(`[Ingest] Successfully processed ${documentId}. Result: ${JSON.stringify(res.data)}`);

    // In a real app we might update the Mongo document status to 'Ingested' here.

    // Optional: Clean up temporary upload file if desired
    // fs.unlinkSync(filePath);
    return res.data;

  } catch (error) {
    console.error(`[Ingest] Error processing document ${documentId}:`, error.message);
  }
};
