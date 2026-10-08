const express = require('express');
const { randomUUID } = require('crypto');
const prisma = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { optionResponse } = require('../db/serializers');

const router = express.Router();

function validPrice(price) {
  if (!['number', 'string'].includes(typeof price) || String(price).trim() === '') return false;
  const value = Number(price);
  return Number.isFinite(value) && value >= 0 && value <= 99999999.99 &&
    Math.abs(Math.round(value * 100) - value * 100) < 1e-8;
}

function validFeatures(features) {
  return Array.isArray(features) &&
    features.length <= 50 &&
    features.every((feature) => typeof feature === 'string' && feature.length <= 200);
}

router.get('/', async (req, res) => {
  try {
    const steps = await prisma.configuratorStep.findMany({
      orderBy: { order: 'asc' },
      include: { options: { orderBy: { sortOrder: 'asc' } } }
    });
    res.json(steps.map((step) => ({
      id: step.id,
      order: step.order,
      title: step.title,
      description: step.description,
      icon: step.icon,
      options: step.options.map(optionResponse)
    })));
  } catch (error) {
    console.error('Error fetching configurator configuration:', error);
    res.status(500).json({ error: 'Failed to fetch configurator configuration.' });
  }
});

router.post('/options', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { step_id, name, description, price, features } = req.body || {};
    if (
      typeof step_id !== 'string' || !step_id ||
      typeof name !== 'string' || !name.trim() ||
      name.trim().length > 191 ||
      !validPrice(price) ||
      (description !== undefined && (typeof description !== 'string' || description.length > 20000)) ||
      (features !== undefined && !validFeatures(features))
    ) {
      return res.status(400).json({ error: 'step_id, name, a valid price, and valid option details are required.' });
    }

    const step = await prisma.configuratorStep.findUnique({ where: { id: step_id } });
    if (!step) return res.status(404).json({ error: 'Configurator step not found.' });
    const lastOption = await prisma.configuratorOption.findFirst({
      where: { stepId: step_id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    });

    const option = await prisma.configuratorOption.create({
      data: {
        id: `opt_${randomUUID()}`,
        stepId: step_id,
        sortOrder: (lastOption?.sortOrder ?? -1) + 1,
        name: name.trim(),
        description: description || '',
        price: Number(price),
        features: features || []
      }
    });
    res.status(201).json(optionResponse(option));
  } catch (error) {
    console.error('Error creating configurator option:', error);
    res.status(500).json({ error: 'Failed to create configurator option.' });
  }
});

router.put('/options/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.configuratorOption.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Configurator option not found.' });

    const { name, description, price, features } = req.body || {};
    if (
      (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 191)) ||
      (description !== undefined && (typeof description !== 'string' || description.length > 20000)) ||
      (price !== undefined && !validPrice(price)) ||
      (features !== undefined && !validFeatures(features))
    ) {
      return res.status(400).json({ error: 'Invalid configurator option fields.' });
    }

    const option = await prisma.configuratorOption.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(features !== undefined && { features })
      }
    });
    res.json(optionResponse(option));
  } catch (error) {
    console.error('Error updating configurator option:', error);
    res.status(500).json({ error: 'Failed to update configurator option.' });
  }
});

router.delete('/options/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await prisma.configuratorOption.deleteMany({ where: { id: req.params.id } });
    if (result.count === 0) return res.status(404).json({ error: 'Configurator option not found.' });
    res.json({ message: 'Configurator option deleted successfully.' });
  } catch (error) {
    console.error('Error deleting configurator option:', error);
    res.status(500).json({ error: 'Failed to delete option.' });
  }
});

module.exports = router;
