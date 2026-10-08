const express = require('express');
const router = express.Router();
const { all, get, run } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/vehicles (Public)
router.get('/', async (req, res) => {
  try {
    const vehicles = await all('SELECT * FROM vehicles ORDER BY name ASC');
    const formatted = vehicles.map(v => ({
      ...v,
      features: v.features_json ? JSON.parse(v.features_json) : [],
      specifications: v.specs_json ? JSON.parse(v.specs_json) : {},
      gallery: v.gallery_json ? JSON.parse(v.gallery_json) : []
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

// GET /api/vehicles/:slug (Public)
router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();
    let vehicle = await get('SELECT * FROM vehicles WHERE slug = ?', [slug]);
    if (!vehicle) {
      // Fallback to first vehicle if slug not match
      vehicle = await get('SELECT * FROM vehicles LIMIT 1');
    }
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle fitment model not found.' });
    }
    res.json({
      ...vehicle,
      features: vehicle.features_json ? JSON.parse(vehicle.features_json) : [],
      specifications: vehicle.specs_json ? JSON.parse(vehicle.specs_json) : {},
      gallery: vehicle.gallery_json ? JSON.parse(vehicle.gallery_json) : []
    });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle.' });
  }
});

// POST /api/vehicles (Admin Protected)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, slug, years, description, features, specifications, gallery } = req.body;
    if (!name || !slug || !years) {
      return res.status(400).json({ error: 'Name, slug, and years are required.' });
    }

    const cleanSlug = slug.toLowerCase().replace(/\s+/g, '-');
    const existingSlug = await get('SELECT * FROM vehicles WHERE slug = ?', [cleanSlug]);
    if (existingSlug) {
      return res.status(400).json({ error: `URL Slug "${cleanSlug}" is already used by ${existingSlug.name}. Please enter a unique slug.` });
    }

    const id = 'veh_' + Date.now();
    const featuresJson = JSON.stringify(Array.isArray(features) ? features : []);
    const specsJson = JSON.stringify(specifications || {});
    const galleryJson = JSON.stringify(Array.isArray(gallery) ? gallery : []);

    await run(
      'INSERT INTO vehicles (id, name, slug, years, description, features_json, specs_json, gallery_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, cleanSlug, years, description || '', featuresJson, specsJson, galleryJson]
    );

    const created = await get('SELECT * FROM vehicles WHERE id = ?', [id]);
    res.status(201).json({
      ...created,
      features: created.features_json ? JSON.parse(created.features_json) : [],
      specifications: created.specs_json ? JSON.parse(created.specs_json) : {},
      gallery: created.gallery_json ? JSON.parse(created.gallery_json) : []
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: error.message || 'Failed to create vehicle fitment model.' });
  }
});

// PUT /api/vehicles/:id (Admin Protected)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, slug, years, description, features, specifications, gallery } = req.body;
    const vehicle = await get('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    const cleanSlug = slug ? slug.toLowerCase().replace(/\s+/g, '-') : vehicle.slug;
    const existingSlug = await get('SELECT * FROM vehicles WHERE slug = ? AND id != ?', [cleanSlug, req.params.id]);
    if (existingSlug) {
      return res.status(400).json({ error: `URL Slug "${cleanSlug}" is already used by ${existingSlug.name}. Please use a unique slug.` });
    }

    const featuresJson = JSON.stringify(Array.isArray(features) ? features : (vehicle.features_json ? JSON.parse(vehicle.features_json) : []));
    const specsJson = JSON.stringify(specifications || (vehicle.specs_json ? JSON.parse(vehicle.specs_json) : {}));
    const galleryJson = JSON.stringify(Array.isArray(gallery) ? gallery : (vehicle.gallery_json ? JSON.parse(vehicle.gallery_json) : []));

    await run(
      `UPDATE vehicles 
       SET name = ?, slug = ?, years = ?, description = ?, features_json = ?, specs_json = ?, gallery_json = ? 
       WHERE id = ?`,
      [
        name || vehicle.name,
        cleanSlug,
        years || vehicle.years,
        description !== undefined ? description : vehicle.description,
        featuresJson,
        specsJson,
        galleryJson,
        req.params.id
      ]
    );

    const updated = await get('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    res.json({
      ...updated,
      features: updated.features_json ? JSON.parse(updated.features_json) : [],
      specifications: updated.specs_json ? JSON.parse(updated.specs_json) : {},
      gallery: updated.gallery_json ? JSON.parse(updated.gallery_json) : []
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: error.message || 'Failed to update vehicle model.' });
  }
});

// DELETE /api/vehicles/:id (Admin Protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const vehicle = await get('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    await run('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    res.json({ message: 'Vehicle deleted successfully.' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Failed to delete vehicle.' });
  }
});

module.exports = router;
