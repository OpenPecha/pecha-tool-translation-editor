const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');

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
                    content: `You are a helpful assistant that extracts entities and their relationships from text. 
                    For each entity, provide:
                    - name: The entity name
                    - type: One of PERSON, ORGANIZATION, CONCEPT, LOCATION, or EVENT
                    - relationships: Array of relationships to other entities, each with:
                        - type: The relationship type in UPPERCASE_WITH_UNDERSCORES
                        - target: The name of the target entity
                        - id: A UUID (will be added by the system)
                    
                    Return the entities as a JSON array.`
                },
                {
                    role: "user",
                    content: `Extract entities and relationships from this text: ${text}`
                }
            ],
            response_format: { type: "json_object" }
        });

        let result = JSON.parse(completion.choices[0].message.content);
        
        // Add UUIDs to relationships if they don't exist
        result = result.entities.map(entity => ({
            ...entity,
            relationships: entity.relationships.map(rel => ({
                ...rel,
                id: rel.id || uuidv4()
            }))
        }));

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