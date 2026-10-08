const express = require('express');
const { randomUUID } = require('crypto');
const prisma = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { inquiryResponse } = require('../db/serializers');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      notes,
      selectedOptionIds
    } = req.body || {};

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
    if ((!cleanEmail && !cleanPhone) || (cleanEmail && !emailPattern.test(cleanEmail))) {
      return res.status(400).json({ error: 'Provide a valid email address or phone number.' });
    }
    if (
      cleanEmail.length > 191 || cleanPhone.length > 64 ||
      (name !== undefined && (typeof name !== 'string' || name.trim().length > 191)) ||
      (notes !== undefined && (typeof notes !== 'string' || notes.length > 5000)) ||
      !isRecord(selectedOptionIds)
    ) {
      return res.status(400).json({ error: 'Invalid inquiry details.' });
    }

    const requiredSteps = ['vehicle', 'type', 'finish', 'delivery'];
    if (
      !requiredSteps.every((step) => typeof selectedOptionIds[step] === 'string') ||
      Object.keys(selectedOptionIds).some((step) => ![...requiredSteps, 'modules'].includes(step)) ||
      (selectedOptionIds.modules !== undefined && typeof selectedOptionIds.modules !== 'string')
    ) {
      return res.status(400).json({ error: 'Select valid configurator options before submitting.' });
    }

    const optionIds = Object.values(selectedOptionIds);
    const options = await prisma.configuratorOption.findMany({
      where: { id: { in: optionIds } }
    });
    const optionsById = new Map(options.map((option) => [option.id, option]));
    const stepIds = ['vehicle', 'type', 'finish', 'delivery'];
    for (const stepId of stepIds) {
      const option = optionsById.get(selectedOptionIds[stepId]);
      if (!option || option.stepId !== stepId) {
        return res.status(400).json({ error: 'One or more selected configurator options are invalid.' });
      }
    }
    if (selectedOptionIds.modules) {
      const moduleOption = optionsById.get(selectedOptionIds.modules);
      if (!moduleOption || moduleOption.stepId !== 'modules') {
        return res.status(400).json({ error: 'The selected module is invalid.' });
      }
    }

    const selectionNames = {
      vehicle: optionsById.get(selectedOptionIds.vehicle).name,
      type: optionsById.get(selectedOptionIds.type).name,
      module: selectedOptionIds.modules
        ? optionsById.get(selectedOptionIds.modules).name
        : 'None',
      finish: optionsById.get(selectedOptionIds.finish).name,
      delivery: optionsById.get(selectedOptionIds.delivery).name
    };
    const totalCents = ['type', 'modules', 'finish', 'delivery']
      .reduce((total, stepId) => {
        const optionId = selectedOptionIds[stepId];
        return total + (optionId ? Math.round(Number(optionsById.get(optionId).price) * 100) : 0);
      }, 0);
    const totalEstimate = totalCents / 100;

    const inquiry = await prisma.inquiry.create({
      data: {
        id: `inq_${randomUUID()}`,
        clientName: typeof name === 'string' && name.trim() ? name.trim() : 'Anonymous Client',
        email: cleanEmail,
        phone: cleanPhone,
        notes: typeof notes === 'string' ? notes.trim() : '',
        selectedOptions: selectionNames,
        totalEstimate
      }
    });

    res.status(201).json({
      message: 'CAD Engineering Package Inquiry submitted successfully.',
      inquiry: inquiryResponse(inquiry)
    });
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    res.status(500).json({ error: 'Failed to process inquiry submission.' });
  }
});

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const inquiries = await prisma.inquiry.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(inquiries.map(inquiryResponse));
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({ error: 'Failed to fetch inquiries.' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['New', 'In Progress', 'Completed', 'Archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid inquiry status.' });
    }
    const result = await prisma.inquiry.updateMany({
      where: { id: req.params.id },
      data: { status }
    });
    if (result.count === 0) return res.status(404).json({ error: 'Inquiry not found.' });
    const inquiry = await prisma.inquiry.findUnique({ where: { id: req.params.id } });
    res.json(inquiryResponse(inquiry));
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    res.status(500).json({ error: 'Failed to update inquiry status.' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await prisma.inquiry.deleteMany({ where: { id: req.params.id } });
    if (result.count === 0) return res.status(404).json({ error: 'Inquiry not found.' });
    res.json({ message: 'Inquiry deleted successfully.' });
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    res.status(500).json({ error: 'Failed to delete inquiry.' });
  }
});

module.exports = router;
