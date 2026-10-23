const express = require('express');
const router = express.Router();
const { getAllNotices, addNotice, updateNotice, deleteNotice } = require('../dbHelpers');

const db = require('../database');

// GET /api/notices
router.get('/', async (req, res) => {
  try {
    const notices = await getAllNotices();
    res.json({ success: true, data: notices, count: notices.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/notices
router.post('/', async (req, res) => {
  try {
    const { title, content, type, priority, author } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: 'title and content required' });
    const result = await addNotice({ title, content, type: type || 'general', priority: priority || 'normal', author: author || 'Admin' });
    res.json({ success: true, id: result.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/notices/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    db.get('SELECT * FROM notices WHERE id = ?', [Number(id)], async (err, notice) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });
      const { title, content, type, priority } = req.body;
      await updateNotice(Number(id), { title: title || notice.title, content: content || notice.content, type: type || notice.type, priority: priority || notice.priority });
      res.json({ success: true });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/notices/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    db.get('SELECT * FROM notices WHERE id = ?', [Number(id)], async (err, notice) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });
      await deleteNotice(Number(id));
      res.json({ success: true });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
