import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateResponse(query, recentMessages = []) {
  try {
    // TODO: Implement RAG retrieval here
    // For now, basic response
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `You are a UPI / Payments Dispute Assistant for Indian users.
Answer questions about UPI failures, refunds, chargebacks, and fraud reporting.
Always cite sources when available and provide specific timelines.`;

    const context = recentMessages
      .reverse()
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = `${systemPrompt}\n\nContext:\n${context}\n\nUser question: ${query}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return {
      response,
      sources: [] // TODO: Add retrieved sources
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate response');
  }
}
