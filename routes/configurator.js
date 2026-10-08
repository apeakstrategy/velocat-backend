const express = require('express');
const router = express.Router();
const { all, get, run } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/configurator (Public - returns all steps and options)
router.get('/', async (req, res) => {
  try {
    const steps = await all('SELECT * FROM configurator_steps ORDER BY step_order ASC');
    const options = await all('SELECT * FROM configurator_options');

    const formattedSteps = steps.map(s => {
      const stepOptions = options
        .filter(o => o.step_id === s.id)
        .map(o => ({
          ...o,
          features: o.features_json ? JSON.parse(o.features_json) : []
        }));

      return {
        id: s.id,
        order: s.step_order,
        title: s.title,
        description: s.description,
        icon: s.icon_name,
        options: stepOptions
      };
    });

    res.json(formattedSteps);
  } catch (error) {
    console.error('Error fetching configurator configuration:', error);
    res.status(500).json({ error: 'Failed to fetch configurator configuration.' });
  }
});

// POST /api/configurator/options (Admin Protected)
router.post('/options', authenticateToken, async (req, res) => {
  try {
    const { step_id, name, description, price, features } = req.body;
    if (!step_id || !name || price === undefined) {
      return res.status(400).json({ error: 'step_id, name, and price are required.' });
    }

    const id = 'opt_' + Date.now();
    const featuresJson = JSON.stringify(Array.isArray(features) ? features : []);

    await run(
      'INSERT INTO configurator_options (id, step_id, name, description, price, features_json) VALUES (?, ?, ?, ?, ?, ?)',
      [id, step_id, name, description || '', parseFloat(price), featuresJson]
    );

    const created = await get('SELECT * FROM configurator_options WHERE id = ?', [id]);
    res.status(201).json({
      ...created,
      features: created.features_json ? JSON.parse(created.features_json) : []
    });
  } catch (error) {
    console.error('Error creating configurator option:', error);
    res.status(500).json({ error: 'Failed to create configurator option.' });
  }
});

// PUT /api/configurator/options/:id (Admin Protected)
router.put('/options/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, price, features } = req.body;
    const option = await get('SELECT * FROM configurator_options WHERE id = ?', [req.params.id]);
    if (!option) {
      return res.status(404).json({ error: 'Configurator option not found.' });
    }

    const featuresJson = JSON.stringify(Array.isArray(features) ? features : (option.features_json ? JSON.parse(option.features_json) : []));

    await run(
      `UPDATE configurator_options 
       SET name = ?, description = ?, price = ?, features_json = ? 
       WHERE id = ?`,
      [
        name || option.name,
        description !== undefined ? description : option.description,
        price !== undefined ? parseFloat(price) : option.price,
        featuresJson,
        req.params.id
      ]
    );

    const updated = await get('SELECT * FROM configurator_options WHERE id = ?', [req.params.id]);
    res.json({
      ...updated,
      features: updated.features_json ? JSON.parse(updated.features_json) : []
    });
  } catch (error) {
    console.error('Error updating configurator option:', error);
    res.status(500).json({ error: 'Failed to update configurator option.' });
  }
});

// DELETE /api/configurator/options/:id (Admin Protected)
router.delete('/options/:id', authenticateToken, async (req, res) => {
  try {
    const option = await get('SELECT * FROM configurator_options WHERE id = ?', [req.params.id]);
    if (!option) {
      return res.status(404).json({ error: 'Configurator option not found.' });
    }

    await run('DELETE FROM configurator_options WHERE id = ?', [req.params.id]);
    res.json({ message: 'Configurator option deleted successfully.' });
  } catch (error) {
    console.error('Error deleting configurator option:', error);
    res.status(500).json({ error: 'Failed to delete option.' });
  }
});

module.exports = router;
