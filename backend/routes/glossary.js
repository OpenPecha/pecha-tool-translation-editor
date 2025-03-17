const express = require("express");
const authenticate = require("../middleware/authenticate");const router = express.Router();
const { extractEntities } = require("../services/entityExtract");
const driver = require("../services/neo");

// Extract entities from text and store in Neo4j
router.post("/extract", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        // Extract entities using OpenAI
        const result = await extractEntities(text);
        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        // Store entities and relationships in Neo4j
        const session = driver.session();
        try {
            // await session.executeWrite(async (tx) => {
            //     for (const entity of result.data) {
            //         // Create or merge entity node
            //         await tx.run(
            //             `MERGE (e:Entity {name: $name})
            //              SET e.type = $type
            //              RETURN e`,
            //             { name: entity.name, type: entity.type }
            //         );

            //         // Create relationships
            //         for (const rel of entity.relationships) {
            //             await tx.run(
            //                 `MATCH (source:Entity {name: $sourceName})
            //                  MATCH (target:Entity {name: $targetName})
            //                  MERGE (source)-[r:${rel.type} {id: $id}]->(target)
            //                  RETURN r`,
            //                 {
            //                     sourceName: entity.name,
            //                     targetName: rel.target,
            //                     id: rel.id
            //                 }
            //             );
            //         }
            //     }
            // });

            res.json({
                success: true,
                data: result.data
            });
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error("Error in glossary extract:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get all entities
router.get("/entities", async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.executeRead(async (tx) => {
            const response = await tx.run(
                `MATCH (e:Entity)
                 OPTIONAL MATCH (e)-[r]->(target:Entity)
                 RETURN e.name as name, e.type as type, 
                        collect({
                            type: type(r),
                            target: target.name,
                            id: r.id
                        }) as relationships`
            );
            
            return response.records.map(record => ({
                name: record.get('name'),
                type: record.get('type'),
                relationships: record.get('relationships')
                    .filter(rel => rel.type !== null) // Remove null relationships from OPTIONAL MATCH
            }));
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("Error getting entities:", error);
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

module.exports = router;
