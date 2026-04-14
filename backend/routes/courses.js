const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../database');

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.flv', '.wmv'];

// Extrai número do início de uma string (ex: "01 - Aula", "Módulo 2", "3. Título")
function extractLeadingNumber(str) {
  const match = str.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Ordena strings naturalmente (1, 2, 10 em vez de 1, 10, 2)
function naturalSort(arr) {
  return [...arr].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );
}

// Limpa o nome removendo números iniciais e separadores
function cleanName(str) {
  return str
    .replace(/^\d+[\s.\-_]+/, '')
    .replace(/\.(mp4|mkv|avi|mov|webm|m4v|flv|wmv)$/i, '')
    .trim();
}

// Escaneia uma pasta e retorna estrutura organizada
function scanFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    throw new Error(`Pasta não encontrada: ${folderPath}`);
  }

  const stat = fs.statSync(folderPath);
  if (!stat.isDirectory()) {
    throw new Error(`Caminho não é uma pasta: ${folderPath}`);
  }

  const items = fs.readdirSync(folderPath);
  const subfolders = items.filter(item => {
    const fullPath = path.join(folderPath, item);
    try {
      return fs.statSync(fullPath).isDirectory() && !item.startsWith('.');
    } catch { return false; }
  });

  const rootVideos = items.filter(item =>
    VIDEO_EXTENSIONS.includes(path.extname(item).toLowerCase()) && !item.startsWith('.')
  );

  const modules = [];

  if (subfolders.length > 0) {
    // Tem subpastas = módulos separados
    const sortedFolders = naturalSort(subfolders);
    sortedFolders.forEach((folder, folderIndex) => {
      const folderFullPath = path.join(folderPath, folder);
      const folderItems = fs.readdirSync(folderFullPath);
      const videos = folderItems.filter(item =>
        VIDEO_EXTENSIONS.includes(path.extname(item).toLowerCase()) && !item.startsWith('.')
      );

      if (videos.length === 0) return; // Ignora pastas sem vídeos

      const sortedVideos = naturalSort(videos);
      const lessons = sortedVideos.map((video, videoIndex) => ({
        name: cleanName(path.parse(video).name),
        rawName: path.parse(video).name,
        number: extractLeadingNumber(video) || videoIndex + 1,
        filePath: path.join(folderFullPath, video),
      }));

      modules.push({
        name: cleanName(folder),
        rawName: folder,
        number: extractLeadingNumber(folder) || folderIndex + 1,
        lessons,
      });
    });
  }

  // Vídeos soltos na raiz viram um módulo extra (ou único)
  if (rootVideos.length > 0) {
    const sortedVideos = naturalSort(rootVideos);
    const lessons = sortedVideos.map((video, videoIndex) => ({
      name: cleanName(path.parse(video).name),
      rawName: path.parse(video).name,
      number: extractLeadingNumber(video) || videoIndex + 1,
      filePath: path.join(folderPath, video),
    }));

    modules.unshift({
      name: modules.length === 0 ? 'Conteúdo' : 'Introdução',
      rawName: '',
      number: 0,
      lessons,
    });
  }

  if (modules.length === 0) {
    throw new Error('Nenhum vídeo encontrado na pasta selecionada.');
  }

  return modules;
}

// GET /api/courses — lista todos os cursos com progresso geral
router.get('/', (req, res) => {
  try {
    const courses = db.prepare(`
      SELECT
        c.*,
        COUNT(l.id) as total_lessons,
        COUNT(CASE WHEN p.completed = 1 THEN 1 END) as completed_lessons,
        COALESCE(AVG(CASE WHEN p.duration > 0 THEN p.position / p.duration * 100 END), 0) as avg_progress
      FROM courses c
      LEFT JOIN lessons l ON l.course_id = c.id
      LEFT JOIN progress p ON p.lesson_id = l.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();

    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/courses/import — importa uma pasta como curso
router.post('/import', (req, res) => {
  const { folderPath, courseName } = req.body;

  if (!folderPath) {
    return res.status(400).json({ error: 'Caminho da pasta é obrigatório.' });
  }

  try {
    const modules = scanFolder(folderPath);
    const name = courseName || path.basename(folderPath);
    const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);

    // Verifica se já foi importado
    const existing = db.prepare('SELECT id FROM courses WHERE folder_path = ?').get(folderPath);
    if (existing) {
      return res.status(409).json({ error: 'Este curso já foi importado.', courseId: existing.id });
    }

    // Insere no banco em transação
    const insertCourse = db.transaction(() => {
      const courseResult = db.prepare(
        'INSERT INTO courses (name, folder_path, total_lessons) VALUES (?, ?, ?)'
      ).run(name, folderPath, totalLessons);
      const courseId = courseResult.lastInsertRowid;

      for (const mod of modules) {
        const modResult = db.prepare(
          'INSERT INTO modules (course_id, name, number) VALUES (?, ?, ?)'
        ).run(courseId, mod.name, mod.number);
        const moduleId = modResult.lastInsertRowid;

        for (const lesson of mod.lessons) {
          db.prepare(
            'INSERT INTO lessons (module_id, course_id, name, number, file_path) VALUES (?, ?, ?, ?, ?)'
          ).run(moduleId, courseId, lesson.name, lesson.number, lesson.filePath);
        }
      }

      return courseId;
    });

    const courseId = insertCourse();
    res.status(201).json({ message: 'Curso importado com sucesso!', courseId });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      res.status(409).json({ error: 'Este curso já foi importado.' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// GET /api/courses/:id — detalhes do curso com módulos e aulas
router.get('/:id', (req, res) => {
  try {
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
    if (!course) return res.status(404).json({ error: 'Curso não encontrado.' });

    const modules = db.prepare(
      'SELECT * FROM modules WHERE course_id = ? ORDER BY number ASC'
    ).all(course.id);

    for (const mod of modules) {
      mod.lessons = db.prepare(`
        SELECT l.*,
          COALESCE(p.position, 0) as position,
          COALESCE(p.duration, 0) as duration,
          COALESCE(p.completed, 0) as completed,
          p.last_watched
        FROM lessons l
        LEFT JOIN progress p ON p.lesson_id = l.id
        WHERE l.module_id = ?
        ORDER BY l.number ASC
      `).all(mod.id);
    }

    res.json({ ...course, modules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/courses/:id — remove um curso
router.delete('/:id', (req, res) => {
  try {
    const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(req.params.id);
    if (!course) return res.status(404).json({ error: 'Curso não encontrado.' });

    db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
    res.json({ message: 'Curso removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/courses/:id/continue — próxima aula para continuar
router.get('/:id/continue', (req, res) => {
  try {
    const lesson = db.prepare(`
      SELECT l.*, m.name as module_name, m.number as module_number,
        COALESCE(p.position, 0) as position,
        COALESCE(p.duration, 0) as duration,
        COALESCE(p.completed, 0) as completed
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      LEFT JOIN progress p ON p.lesson_id = l.id
      WHERE l.course_id = ?
        AND (p.completed IS NULL OR p.completed = 0)
      ORDER BY m.number ASC, l.number ASC
      LIMIT 1
    `).get(req.params.id);

    res.json(lesson || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
