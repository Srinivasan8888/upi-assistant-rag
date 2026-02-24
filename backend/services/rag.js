// RAG service: calls the persistent Python Flask RAG server at port 8000

const RAG_SERVER_URL = process.env.RAG_SERVER_URL || 'http://localhost:8000';

export async function generateResponse(query, recentMessages = [], file_b64 = null, mime_type = null) {
    console.log(`RAG query -> Flask: "${query}"`);

    let response;
    try {
        response = await fetch(`${RAG_SERVER_URL}/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: query, file_b64, mime_type })
        });
    } catch (err) {
        console.error('Fetch to RAG server failed:', err.message);
        if (err.code === 'ECONNREFUSED') {
            throw new Error('RAG server is not running on port 8000.');
        }
        throw new Error(`Could not reach RAG server: ${err.message}`);
    }

    console.log(`RAG server response status: ${response.status}`);

    if (!response.ok) {
        const errText = await response.text();
        console.error(`RAG server error: ${errText}`);
        throw new Error(`RAG server error ${response.status}: ${errText}`);
    }

    let result;
    try {
        result = await response.json();
    } catch (err) {
        console.error('Failed to parse RAG server JSON response:', err.message);
        throw new Error('Invalid JSON from RAG server');
    }

    console.log(`RAG answer received. Sources: ${JSON.stringify(result.sources)}`);

    if (result.error) {
        throw new Error(result.error);
    }

    return {
        response: result.answer,
        sources: result.sources || []
    };
}
