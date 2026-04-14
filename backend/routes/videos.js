const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../database');

// GET /api/videos/stream/:lessonId — stream do arquivo de vídeo com suporte a range
router.get('/stream/:lessonId', (req, res) => {
  try {
    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'Aula não encontrada.' });

    const filePath = lesson.file_path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `Arquivo de vídeo não encontrado: ${filePath}` });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.m4v': 'video/mp4',
      '.flv': 'video/x-flv',
      '.wmv': 'video/x-ms-wmv',
    };
    const contentType = mimeTypes[ext] || 'video/mp4';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/videos/:lessonId/progress — salva progresso do vídeo
router.patch('/:lessonId/progress', (req, res) => {
  const { position, duration, completed } = req.body;
  const { lessonId } = req.params;

  try {
    const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Aula não encontrada.' });

    const isCompleted = completed === true || completed === 1 ||
      (duration > 0 && position / duration >= 0.95);

    db.prepare(`
      INSERT INTO progress (lesson_id, position, duration, completed, last_watched)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(lesson_id) DO UPDATE SET
        position = excluded.position,
        duration = excluded.duration,
        completed = excluded.completed,
        last_watched = CURRENT_TIMESTAMP
    `).run(lessonId, position || 0, duration || 0, isCompleted ? 1 : 0);

    // Atualiza duração na tabela de aulas
    if (duration > 0) {
      db.prepare('UPDATE lessons SET duration = ? WHERE id = ?').run(duration, lessonId);
    }

    res.json({ success: true, completed: isCompleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/videos/:lessonId/progress — retorna progresso salvo
router.get('/:lessonId/progress', (req, res) => {
  try {
    const progress = db.prepare('SELECT * FROM progress WHERE lesson_id = ?').get(req.params.lessonId);
    res.json(progress || { position: 0, duration: 0, completed: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/videos/:lessonId/next — próxima aula
router.get('/:lessonId/next', (req, res) => {
  try {
    const current = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.lessonId);
    if (!current) return res.status(404).json({ error: 'Aula não encontrada.' });

    // Próxima aula no mesmo módulo
    let next = db.prepare(`
      SELECT l.*, m.name as module_name
      FROM lessons l JOIN modules m ON m.id = l.module_id
      WHERE l.module_id = ? AND l.number > ?
      ORDER BY l.number ASC LIMIT 1
    `).get(current.module_id, current.number);

    // Se não há próxima no módulo, pega o primeiro do próximo módulo
    if (!next) {
      const currentModule = db.prepare('SELECT * FROM modules WHERE id = ?').get(current.module_id);
      next = db.prepare(`
        SELECT l.*, m.name as module_name
        FROM lessons l JOIN modules m ON m.id = l.module_id
        WHERE m.course_id = ? AND m.number > ?
        ORDER BY m.number ASC, l.number ASC LIMIT 1
      `).get(current.course_id, currentModule.number);
    }

    res.json(next || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
