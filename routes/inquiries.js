const express = require('express');
const router = express.Router();
const { all, get, run } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// POST /api/inquiries (Public client submission)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, notes, selectedOptions, totalEstimate } = req.body;

    // Validation requirement: At least Email OR Phone MUST be provided
    const cleanEmail = email ? email.trim() : '';
    const cleanPhone = phone ? phone.trim() : '';

    if (!cleanEmail && !cleanPhone) {
      return res.status(400).json({ error: 'Please provide either an Email Address or Phone Number to submit your CAD request.' });
    }

    const id = 'inq_' + Date.now();
    const optionsJson = JSON.stringify(selectedOptions || {});

    await run(
      `INSERT INTO inquiries (id, client_name, email, phone, notes, selected_options_json, total_estimate, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name || 'Anonymous Client',
        cleanEmail,
        cleanPhone,
        notes || '',
        optionsJson,
        parseFloat(totalEstimate || 0),
        'New'
      ]
    );

    const created = await get('SELECT * FROM inquiries WHERE id = ?', [id]);
    res.status(201).json({
      message: 'CAD Engineering Package Inquiry submitted successfully.',
      inquiry: {
        ...created,
        selectedOptions: created.selected_options_json ? JSON.parse(created.selected_options_json) : {}
      }
    });
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    res.status(500).json({ error: 'Failed to process inquiry submission.' });
  }
});

// GET /api/inquiries (Admin Protected)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const inquiries = await all('SELECT * FROM inquiries ORDER BY created_at DESC');
    const formatted = inquiries.map(inq => ({
      ...inq,
      selectedOptions: inq.selected_options_json ? JSON.parse(inq.selected_options_json) : {}
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({ error: 'Failed to fetch inquiries.' });
  }
});

// PUT /api/inquiries/:id (Admin Protected)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const inquiry = await get('SELECT * FROM inquiries WHERE id = ?', [req.params.id]);
    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }

    await run('UPDATE inquiries SET status = ? WHERE id = ?', [status || inquiry.status, req.params.id]);
    const updated = await get('SELECT * FROM inquiries WHERE id = ?', [req.params.id]);
    res.json({
      ...updated,
      selectedOptions: updated.selected_options_json ? JSON.parse(updated.selected_options_json) : {}
    });
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    res.status(500).json({ error: 'Failed to update inquiry status.' });
  }
});

// DELETE /api/inquiries/:id (Admin Protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const inquiry = await get('SELECT * FROM inquiries WHERE id = ?', [req.params.id]);
    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }

    await run('DELETE FROM inquiries WHERE id = ?', [req.params.id]);
    res.json({ message: 'Inquiry deleted successfully.' });
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    res.status(500).json({ error: 'Failed to delete inquiry.' });
  }
});

module.exports = router;
