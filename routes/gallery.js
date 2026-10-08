const express = require('express');
const router = express.Router();
const { all, get, run } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/gallery (Public)
router.get('/', async (req, res) => {
  try {
    const items = await all('SELECT * FROM gallery ORDER BY created_at DESC');
    res.json(items);
  } catch (error) {
    console.error('Error fetching gallery items:', error);
    res.status(500).json({ error: 'Failed to fetch gallery items.' });
  }
});

// POST /api/gallery (Admin Protected)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, category, image_url, description, vehicle_tag } = req.body;
    if (!title || !category || !image_url) {
      return res.status(400).json({ error: 'Title, category, and image_url are required.' });
    }

    const id = 'gal_' + Date.now();

    await run(
      'INSERT INTO gallery (id, title, category, image_url, description, vehicle_tag) VALUES (?, ?, ?, ?, ?, ?)',
      [id, title, category, image_url, description || '', vehicle_tag || 'All Vehicles']
    );

    const created = await get('SELECT * FROM gallery WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating gallery item:', error);
    res.status(500).json({ error: 'Failed to create gallery item.' });
  }
});

// PUT /api/gallery/:id (Admin Protected)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, category, image_url, description, vehicle_tag } = req.body;
    const item = await get('SELECT * FROM gallery WHERE id = ?', [req.params.id]);
    if (!item) {
      return res.status(404).json({ error: 'Gallery item not found.' });
    }

    await run(
      `UPDATE gallery 
       SET title = ?, category = ?, image_url = ?, description = ?, vehicle_tag = ? 
       WHERE id = ?`,
      [
        title || item.title,
        category || item.category,
        image_url || item.image_url,
        description !== undefined ? description : item.description,
        vehicle_tag || item.vehicle_tag,
        req.params.id
      ]
    );

    const updated = await get('SELECT * FROM gallery WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating gallery item:', error);
    res.status(500).json({ error: 'Failed to update gallery item.' });
  }
});

// DELETE /api/gallery/:id (Admin Protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await get('SELECT * FROM gallery WHERE id = ?', [req.params.id]);
    if (!item) {
      return res.status(404).json({ error: 'Gallery item not found.' });
    }

    await run('DELETE FROM gallery WHERE id = ?', [req.params.id]);
    res.json({ message: 'Gallery item deleted successfully.' });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).json({ error: 'Failed to delete gallery item.' });
  }
});

module.exports = router;
