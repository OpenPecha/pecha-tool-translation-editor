const OpenAI = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function extractEntities(text) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that extracts entities and their relationships from text. Output should be in JSON format with 'entities' and 'relationships' arrays."
                },
                {
                    role: "user",
                    content: `Extract entities and relationships from this text: ${text}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error extracting entities:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    extractEntities
};