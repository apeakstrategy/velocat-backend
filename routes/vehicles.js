const express = require('express');
const { randomUUID } = require('crypto');
const prisma = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { vehicleResponse } = require('../db/serializers');
const { isSafeImageUrl } = require('../db/validation');

const router = express.Router();

function isStringArray(value) {
  return Array.isArray(value) &&
    value.length <= 100 &&
    value.every((item) => typeof item === 'string' && item.length <= 500);
}

function isImageUrlArray(value) {
  return Array.isArray(value) && value.length <= 100 && value.every(isSafeImageUrl);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSlug(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function isValidSlug(value) {
  return value.length <= 191 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

router.get('/', async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { name: 'asc' } });
    res.json(vehicles.map(vehicleResponse));
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();
    const vehicle = await prisma.vehicle.findUnique({ where: { slug } }) ||
      await prisma.vehicle.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle fitment model not found.' });
    res.json(vehicleResponse(vehicle));
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle.' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, slug, years, description, features, specifications, gallery } = req.body || {};
    if (
      typeof name !== 'string' || !name.trim() ||
      name.trim().length > 191 ||
      typeof slug !== 'string' || !slug.trim() ||
      !isValidSlug(normalizeSlug(slug)) ||
      typeof years !== 'string' || !years.trim() ||
      years.trim().length > 64 ||
      (description !== undefined && (typeof description !== 'string' || description.length > 20000)) ||
      (features !== undefined && !isStringArray(features)) ||
      (specifications !== undefined && !isObject(specifications)) ||
      (specifications !== undefined && Buffer.byteLength(JSON.stringify(specifications)) > 60000) ||
      (gallery !== undefined && !isImageUrlArray(gallery))
    ) {
      return res.status(400).json({ error: 'Name, slug, years, and valid vehicle details are required.' });
    }

    const cleanSlug = normalizeSlug(slug);
    const duplicate = await prisma.vehicle.findUnique({ where: { slug: cleanSlug } });
    if (duplicate) {
      return res.status(409).json({ error: `URL Slug "${cleanSlug}" is already in use.` });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        id: `veh_${randomUUID()}`,
        name: name.trim(),
        slug: cleanSlug,
        years: years.trim(),
        description: typeof description === 'string' ? description : '',
        features: features || [],
        specifications: specifications || {},
        gallery: gallery || []
      }
    });
    res.status(201).json(vehicleResponse(vehicle));
  } catch (error) {
    console.error('Error creating vehicle:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'That vehicle slug is already in use.' });
    }
    res.status(500).json({ error: 'Failed to create vehicle fitment model.' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Vehicle not found.' });

    const { name, slug, years, description, features, specifications, gallery } = req.body || {};
    if (
      (name !== undefined && (typeof name !== 'string' || !name.trim())) ||
      (slug !== undefined && (typeof slug !== 'string' || !slug.trim())) ||
      (name !== undefined && name.trim().length > 191) ||
      (slug !== undefined && !isValidSlug(normalizeSlug(slug))) ||
      (years !== undefined && (typeof years !== 'string' || !years.trim() || years.trim().length > 64)) ||
      (description !== undefined && (typeof description !== 'string' || description.length > 20000)) ||
      (features !== undefined && !isStringArray(features)) ||
      (specifications !== undefined && !isObject(specifications)) ||
      (specifications !== undefined && Buffer.byteLength(JSON.stringify(specifications)) > 60000) ||
      (gallery !== undefined && !isImageUrlArray(gallery))
    ) {
      return res.status(400).json({ error: 'Invalid vehicle fields.' });
    }

    const cleanSlug = slug === undefined ? existing.slug : normalizeSlug(slug);
    const duplicate = await prisma.vehicle.findFirst({
      where: { slug: cleanSlug, NOT: { id: existing.id } }
    });
    if (duplicate) return res.status(409).json({ error: `URL Slug "${cleanSlug}" is already in use.` });

    const vehicle = await prisma.vehicle.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        slug: cleanSlug,
        ...(years !== undefined && { years: years.trim() }),
        ...(description !== undefined && { description }),
        ...(features !== undefined && { features }),
        ...(specifications !== undefined && { specifications }),
        ...(gallery !== undefined && { gallery })
      }
    });
    res.json(vehicleResponse(vehicle));
  } catch (error) {
    console.error('Error updating vehicle:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'That vehicle slug is already in use.' });
    }
    res.status(500).json({ error: 'Failed to update vehicle model.' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await prisma.vehicle.deleteMany({ where: { id: req.params.id } });
    if (result.count === 0) return res.status(404).json({ error: 'Vehicle not found.' });
    res.json({ message: 'Vehicle deleted successfully.' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Failed to delete vehicle.' });
  }
});

module.exports = router;
