export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: true, message: 'Method POST only', code: 405 });
    }

    let { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: true, message: 'Prompt required', code: 400 });
    }

    try {
        // Contoh sederhana (placeholder; ganti dengan AI API real seperti OpenAI)
        const response = `AI Response to: "${prompt}" – This is a demo. Integrate with real AI for production.`;
        
        return res.status(200).json({
            error: false,
            prompt,
            aiResponse: response,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('AI error:', error);
        return res.status(500).json({
            error: true,
            message: 'AI processing failed',
            code: 500
        });
    }
}