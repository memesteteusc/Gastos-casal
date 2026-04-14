const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/notes/:lessonId — retorna notas da aula
router.get('/:lessonId', (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE lesson_id = ?').get(req.params.lessonId);
    res.json(note || { lesson_id: req.params.lessonId, content: '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notes/:lessonId — salva/atualiza notas
router.put('/:lessonId', (req, res) => {
  const { content } = req.body;
  const { lessonId } = req.params;

  try {
    const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Aula não encontrada.' });

    db.prepare(`
      INSERT INTO notes (lesson_id, content, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(lesson_id) DO UPDATE SET
        content = excluded.content,
        updated_at = CURRENT_TIMESTAMP
    `).run(lessonId, content || '');

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
