const express = require("express");
const authenticate = require("../middleware/authenticate");
const router = express.Router();
const driver = require('../services/neo');

router.post('/create', async (req, res) => {
    const { name, type } = req.body; // Expecting JSON { "name": "Example", "type": "Category" }
    if (!name || !type) {
        return res.status(400).json({ error: "Missing 'name' or 'type' in request body" });
    }

    const session = driver.session();
    try {
        const result = await session.run(
            'CREATE (n:Entity {name: $name, type: $type}) RETURN n',
            { name, type }
        );
        res.json({ message: 'Node created successfully', node: result.records[0].get(0) });
    } catch (error) {
        res.status(500).json({ error: 'Error creating node', details: error.message });
    } finally {
        await session.close();
    }
});

router.get('/data', async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.run('MATCH (n) RETURN n LIMIT 5');
        res.json(result.records);
    } catch (error) {
        res.status(500).send('Error fetching data');
    } finally {
        await session.close();
    }
});

module.exports = router;
