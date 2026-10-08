const express = require('express');
const { randomUUID } = require('crypto');
const prisma = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { galleryResponse } = require('../db/serializers');
const { isSafeImageUrl } = require('../db/validation');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const items = await prisma.galleryItem.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(items.map(galleryResponse));
  } catch (error) {
    console.error('Error fetching gallery items:', error);
    res.status(500).json({ error: 'Failed to fetch gallery items.' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, category, image_url, description, vehicle_tag } = req.body || {};
    if (
      typeof title !== 'string' || !title.trim() ||
      title.trim().length > 191 ||
      typeof category !== 'string' || !category.trim() ||
      category.trim().length > 100 ||
      !isSafeImageUrl(image_url) || image_url.length > 5000 ||
      (description !== undefined && (typeof description !== 'string' || description.length > 20000)) ||
      (vehicle_tag !== undefined && (typeof vehicle_tag !== 'string' || vehicle_tag.length > 191))
    ) {
      return res.status(400).json({ error: 'Title, category, and a valid image URL are required.' });
    }

    const item = await prisma.galleryItem.create({
      data: {
        id: `gal_${randomUUID()}`,
        title: title.trim(),
        category: category.trim(),
        imageUrl: image_url.trim(),
        description: typeof description === 'string' ? description : '',
        vehicleTag: typeof vehicle_tag === 'string' && vehicle_tag.trim()
          ? vehicle_tag.trim()
          : 'All Vehicles'
      }
    });
    res.status(201).json(galleryResponse(item));
  } catch (error) {
    console.error('Error creating gallery item:', error);
    res.status(500).json({ error: 'Failed to create gallery item.' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.galleryItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Gallery item not found.' });

    const { title, category, image_url, description, vehicle_tag } = req.body || {};
    if (
      (title !== undefined && (typeof title !== 'string' || !title.trim() || title.trim().length > 191)) ||
      (category !== undefined && (typeof category !== 'string' || !category.trim() || category.trim().length > 100)) ||
      (image_url !== undefined && (!isSafeImageUrl(image_url) || image_url.length > 5000)) ||
      (description !== undefined && (typeof description !== 'string' || description.length > 20000)) ||
      (vehicle_tag !== undefined && (typeof vehicle_tag !== 'string' || vehicle_tag.length > 191))
    ) {
      return res.status(400).json({ error: 'Invalid gallery item fields.' });
    }

    const item = await prisma.galleryItem.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(category !== undefined && { category: category.trim() }),
        ...(image_url !== undefined && { imageUrl: image_url.trim() }),
        ...(description !== undefined && { description }),
        ...(vehicle_tag !== undefined && { vehicleTag: vehicle_tag.trim() })
      }
    });
    res.json(galleryResponse(item));
  } catch (error) {
    console.error('Error updating gallery item:', error);
    res.status(500).json({ error: 'Failed to update gallery item.' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await prisma.galleryItem.deleteMany({ where: { id: req.params.id } });
    if (result.count === 0) return res.status(404).json({ error: 'Gallery item not found.' });
    res.json({ message: 'Gallery item deleted successfully.' });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).json({ error: 'Failed to delete gallery item.' });
  }
});

module.exports = router;
