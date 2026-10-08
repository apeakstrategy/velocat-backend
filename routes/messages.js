const express = require('express');
const { randomUUID } = require('crypto');
const prisma = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { contactMessageResponse } = require('../db/serializers');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validStatuses = ['New', 'In Progress', 'Replied', 'Archived'];

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, vehicle, message } = req.body || {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
    const cleanVehicle = typeof vehicle === 'string' ? vehicle.trim() : '';
    const cleanMessage = typeof message === 'string' ? message.trim() : '';

    if (
      !cleanName || cleanName.length > 191 ||
      !emailPattern.test(cleanEmail) || cleanEmail.length > 191 ||
      cleanPhone.length > 64 ||
      cleanVehicle.length > 191 ||
      !cleanMessage || cleanMessage.length > 10000
    ) {
      return res.status(400).json({ error: 'Provide a valid name, email address, and message.' });
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        id: `msg_${randomUUID()}`,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        vehicle: cleanVehicle,
        message: cleanMessage
      }
    });

    res.status(201).json({
      message: 'Message sent successfully.',
      contactMessage: contactMessageResponse(contactMessage)
    });
  } catch (error) {
    console.error('Error submitting contact message:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(messages.map(contactMessageResponse));
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid message status.' });
    }

    const result = await prisma.contactMessage.updateMany({
      where: { id: req.params.id },
      data: { status }
    });
    if (result.count === 0) return res.status(404).json({ error: 'Message not found.' });

    const message = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    res.json(contactMessageResponse(message));
  } catch (error) {
    console.error('Error updating contact message:', error);
    res.status(500).json({ error: 'Failed to update message.' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await prisma.contactMessage.deleteMany({ where: { id: req.params.id } });
    if (result.count === 0) return res.status(404).json({ error: 'Message not found.' });
    res.json({ message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('Error deleting contact message:', error);
    res.status(500).json({ error: 'Failed to delete message.' });
  }
});

module.exports = router;
