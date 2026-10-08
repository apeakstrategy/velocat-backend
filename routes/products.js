const express = require('express');
const { randomUUID } = require('crypto');
const prisma = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { productResponse } = require('../db/serializers');
const { isSafeImageUrl } = require('../db/validation');

const router = express.Router();

function validFeatures(features) {
  return Array.isArray(features) &&
    features.length <= 50 &&
    features.every((feature) => typeof feature === 'string' && feature.length <= 200);
}

function validPrice(price) {
  if (!['number', 'string'].includes(typeof price) || String(price).trim() === '') return false;
  const value = Number(price);
  return Number.isFinite(value) && value >= 0 && value <= 99999999.99 &&
    Math.abs(Math.round(value * 100) - value * 100) < 1e-8;
}

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(products.map(productResponse));
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(productResponse(product));
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, price, description, features, image_url } = req.body || {};
    if (
      typeof name !== 'string' || !name.trim() ||
      name.trim().length > 191 ||
      typeof category !== 'string' || !category.trim() ||
      category.trim().length > 100 ||
      !validPrice(price) ||
      (description !== undefined && (typeof description !== 'string' || description.length > 20000)) ||
      (typeof image_url === 'string' && image_url.length > 5000) ||
      (features !== undefined && !validFeatures(features)) ||
      (image_url !== undefined && !isSafeImageUrl(image_url))
    ) {
      return res.status(400).json({ error: 'Name, category, a valid non-negative price, and valid features are required.' });
    }

    const product = await prisma.product.create({
      data: {
        id: `prod_${randomUUID()}`,
        name: name.trim(),
        category: category.trim(),
        price: Number(price),
        description: typeof description === 'string' ? description : '',
        features: features || [],
        imageUrl: typeof image_url === 'string' && image_url.trim() ? image_url.trim() : '/08.png'
      }
    });
    res.status(201).json(productResponse(product));
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    const { name, category, price, description, features, image_url } = req.body || {};
    if (
      (name !== undefined && (typeof name !== 'string' || !name.trim())) ||
      (name !== undefined && name.trim().length > 191) ||
      (category !== undefined && (typeof category !== 'string' || !category.trim() || category.trim().length > 100)) ||
      (price !== undefined && !validPrice(price)) ||
      (features !== undefined && !validFeatures(features)) ||
      (description !== undefined && (typeof description !== 'string' || description.length > 20000)) ||
      (image_url !== undefined && (!isSafeImageUrl(image_url) || image_url.length > 5000))
    ) {
      return res.status(400).json({ error: 'Invalid product fields.' });
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(category !== undefined && { category: category.trim() }),
        ...(price !== undefined && { price: Number(price) }),
        ...(description !== undefined && { description }),
        ...(features !== undefined && { features }),
        ...(image_url !== undefined && { imageUrl: image_url.trim() })
      }
    });
    res.json(productResponse(product));
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await prisma.product.deleteMany({ where: { id: req.params.id } });
    if (result.count === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

module.exports = router;
