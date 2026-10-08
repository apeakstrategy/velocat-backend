const express = require('express');
const router = express.Router();
const { all, get, run } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/products (Public)
router.get('/', async (req, res) => {
  try {
    const products = await all('SELECT * FROM products ORDER BY created_at DESC');
    const formatted = products.map(p => ({
      ...p,
      features: p.features_json ? JSON.parse(p.features_json) : []
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// GET /api/products/:id (Public)
router.get('/:id', async (req, res) => {
  try {
    const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({
      ...product,
      features: product.features_json ? JSON.parse(product.features_json) : []
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
});

// POST /api/products (Admin Protected)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, category, price, description, features, image_url } = req.body;
    if (!name || !category || price === undefined) {
      return res.status(400).json({ error: 'Name, category, and price are required.' });
    }

    const id = 'prod_' + Date.now();
    const featuresJson = JSON.stringify(Array.isArray(features) ? features : []);

    await run(
      'INSERT INTO products (id, name, category, price, description, features_json, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, category, parseFloat(price), description || '', featuresJson, image_url || '/08.png']
    );

    const created = await get('SELECT * FROM products WHERE id = ?', [id]);
    res.status(201).json({
      ...created,
      features: created.features_json ? JSON.parse(created.features_json) : []
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

// PUT /api/products/:id (Admin Protected)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, category, price, description, features, image_url } = req.body;
    const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const featuresJson = JSON.stringify(Array.isArray(features) ? features : (product.features_json ? JSON.parse(product.features_json) : []));

    await run(
      `UPDATE products 
       SET name = ?, category = ?, price = ?, description = ?, features_json = ?, image_url = ? 
       WHERE id = ?`,
      [
        name || product.name,
        category || product.category,
        price !== undefined ? parseFloat(price) : product.price,
        description !== undefined ? description : product.description,
        featuresJson,
        image_url !== undefined ? image_url : product.image_url,
        req.params.id
      ]
    );

    const updated = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json({
      ...updated,
      features: updated.features_json ? JSON.parse(updated.features_json) : []
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

// DELETE /api/products/:id (Admin Protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    await run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

module.exports = router;
