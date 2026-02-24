import { pipeline } from '@xenova/transformers';
import { GoogleGenAI } from '@google/genai';
import DocumentChunk from '../models/DocumentChunk.js';

let embedder;

async function getEmbedder() {
    if (!embedder) {
        // Load the pipeline the first time
        console.log("Loading MiniLM embedding model (one-time)...");
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log("MiniLM loaded [OK]");
    }
    return embedder;
}

let ai;

export async function generateResponse(query, recentMessages = [], file_b64 = null, mime_type = null) {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    const modelName = "gemini-2.5-flash";

    console.log(`Node RAG querying: "${query}"`);

    if (!query && !file_b64) {
        throw new Error('No question or file provided');
    }

    let context_str = "";
    const sources_list = [];
    const seen_sources = new Set();

    if (query) {
        try {
            // 1. Embed query using all-MiniLM-L6-v2 (384 dims, exactly as ChromaDB)
            const embedFn = await getEmbedder();
            const output = await embedFn(query.replace(/\n/g, ' '), { pooling: 'mean', normalize: true });
            const queryEmbedding = Array.from(output.data);

            console.log(`Embedded query. Length: ${queryEmbedding.length}. Querying MongoDB...`);

            // Helper function for cosine similarity if Atlas is not available
            function cosineSimilarity(vecA, vecB) {
                let dotProduct = 0, normA = 0, normB = 0;
                for (let i = 0; i < vecA.length; i++) {
                    dotProduct += vecA[i] * vecB[i];
                    normA += vecA[i] * vecA[i];
                    normB += vecB[i] * vecB[i];
                }
                return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
            }

            let results = [];
            try {
                // 2. Vector Search in MongoDB Atlas
                results = await DocumentChunk.aggregate([
                    {
                        $vectorSearch: {
                            index: 'default',
                            path: 'embedding',
                            queryVector: queryEmbedding,
                            numCandidates: 100,
                            limit: 5
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            text: 1,
                            metadata: 1,
                            score: { $meta: "vectorSearchScore" }
                        }
                    }
                ]);
                console.log(`Found ${results.length} relevant chunks using Atlas Vector Search`);
            } catch (searchErr) {
                if (searchErr.codeName === 'SearchNotEnabled' || searchErr.message.includes('$vectorSearch')) {
                    console.log("Atlas Vector Search not enabled. Falling back to in-memory cosine similarity...");
                    // Fallback: Fetch all chunks and calculate similarity manually (only viable for small datasets)
                    const allChunks = await DocumentChunk.find({}, { text: 1, metadata: 1, embedding: 1 }).lean();

                    for (const chunk of allChunks) {
                        if (chunk.embedding && chunk.embedding.length === queryEmbedding.length) {
                            chunk.score = cosineSimilarity(queryEmbedding, chunk.embedding);
                        } else {
                            chunk.score = -1;
                        }
                    }

                    results = allChunks
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 5)
                        .map(c => ({ text: c.text, metadata: c.metadata, score: c.score }));

                    console.log(`Found ${results.length} relevant chunks using local Fallback Search`);
                } else {
                    throw searchErr; // Re-throw if it's a different DB error
                }
            }

            // 3. Build context string and deduplicate
            for (const chunk of results) {
                const source = (chunk.metadata && chunk.metadata.source) ? chunk.metadata.source : 'unknown';
                context_str += `\n--- Source: ${source} ---\n${chunk.text}\n`;

                if (!seen_sources.has(source)) {
                    sources_list.push(source);
                    seen_sources.add(source);
                }
            }

        } catch (err) {
            console.error('Vector Search Error:', err);
            // We log but don't crash, Gemini can still answer based on basic knowledge or files if search fails
        }
    }

    // 4. Generate answer with Gemini
    const prompt = `
You are a helpful and professional UPI Assistant for bank staff.
Answer the user's query using the provided context below.

SPECIAL INSTRUCTIONS FOR ATTACHMENTS:
You may receive an attached image or PDF containing a transaction history or receipt. If you do, analyze it carefully to extract the correct transaction ID, date, amounts, and explicitly differentiate between SUCCESSFUL and FAILED transactions.
If the user's query is just "Uploaded a file" or empty, your primary task is to provide a clear summary of the attached file (listing successful vs failed transactions) and ask the user which specific transaction they need help with. Do NOT say "I don't have enough information" in this case.

If the user asks for advice (e.g. what to say to the bank, reporting fraud) and the retrieved context lacks the exact answer, you may use your general knowledge about UPI, banking, and cyber fraud to provide helpful best practices, next steps, and complaint templates. Always prioritize providing actionable advice over refusing to answer, even if the specific details aren't in the provided context. 
CRITICAL FORMATTING RULES:
1. Do not include raw source filenames in your response (e.g., do not write "(Source: document.pdf)"). The UI will handle source citations automatically.
2. Write in a clear, natural style.
3. Use clean markdown formatting without redundant asterisks (e.g., use \`### Title\` instead of \`### **Title**\`).

SPECIAL NOTE FOR TRANSACTION ANALYZER:
- The user might submit transactions with dates in the future (e.g., 2026/2027) generated by a test script. DO NOT mark a transaction as 'High Risk' or 'Fraud' purely because the date is in the future. Focus instead on the patterns, suspicious links, unknown merchants, or scam threats mentioned in the text.

ACTIONABLE RESOLUTIONS:
If the incident involves filing a dispute, reporting fraud, or contacting support, you MUST proactively generate:
1. **Direct Action Links**: Provide markdown links to relevant portals if known (e.g., \`[National Cyber Crime Portal](https://cybercrime.gov.in)\`). 
2. **Mailto Links**: If an email is required, provide a mailto link with a pre-filled subject and body.
3. **Complaint Templates**: Provide a professional, ready-to-copy text template inside a markdown code block (i.e. starting with \`\`\`text and ending with \`\`\`) that the user can copy. Fill in placeholders like \`[Transaction ID]\`, \`[Amount]\`, and \`[Date]\` using info from the uploaded transaction attachment!

Context:
${context_str || "No relevant context found."}

Question: ${query || "Uploaded a file"}
`;

    const contents = [prompt];

    if (file_b64 && mime_type) {
        contents.push({
            inlineData: {
                data: file_b64,
                mimeType: mime_type
            }
        });
    }

    try {
        const result = await ai.models.generateContent({
            model: modelName,
            contents: contents
        });

        const responseText = result.text; // new SDK uses result.text instead of result.response.text()

        return {
            response: responseText,
            sources: sources_list
        };
    } catch (err) {
        console.error('Gemini Generation failed:', err);
        throw new Error(`Gemini failed: ${err.message}`);
    }
}
