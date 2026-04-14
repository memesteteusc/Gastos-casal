const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../database');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Tenta encontrar arquivo de legenda (.srt ou .vtt) junto ao vídeo
function findSubtitleFile(videoPath) {
  const dir = path.dirname(videoPath);
  const base = path.parse(videoPath).name;
  const exts = ['.srt', '.vtt', '.txt'];

  for (const ext of exts) {
    const subPath = path.join(dir, base + ext);
    if (fs.existsSync(subPath)) return subPath;
  }
  return null;
}

// Parseia SRT para texto simples
function parseSRT(content) {
  return content
    .replace(/\d+\r?\n/gm, '')
    .replace(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\r?\n/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\r?\n\r?\n/g, ' ')
    .replace(/\r?\n/g, ' ')
    .trim();
}

// POST /api/ai/summary/:lessonId — gera resumo com IA
router.post('/summary/:lessonId', async (req, res) => {
  const { lessonId } = req.params;

  try {
    // Verifica se já tem resumo
    const existing = db.prepare('SELECT * FROM summaries WHERE lesson_id = ?').get(lessonId);
    if (existing && existing.content && !req.query.regenerate) {
      return res.json({ summary: existing.content, cached: true });
    }

    // Busca dados da aula
    const lesson = db.prepare(`
      SELECT l.*, m.name as module_name, c.name as course_name
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = ?
    `).get(lessonId);

    if (!lesson) return res.status(404).json({ error: 'Aula não encontrada.' });

    // Monta prompt baseado no contexto disponível
    let transcriptContext = '';
    const subtitleFile = findSubtitleFile(lesson.file_path);

    if (subtitleFile) {
      const raw = fs.readFileSync(subtitleFile, 'utf8');
      const text = subtitleFile.endsWith('.srt') ? parseSRT(raw) : raw;
      // Limita a 8000 caracteres para não estourar o contexto
      transcriptContext = `\n\nTranscrição da aula:\n${text.substring(0, 8000)}`;
    }

    const prompt = `Você é um assistente especializado em criar resumos de aulas educacionais.

Curso: "${lesson.course_name}"
Módulo: "${lesson.module_name}"
Aula: "${lesson.name}"${transcriptContext}

${transcriptContext
  ? 'Com base na transcrição acima, crie um resumo estruturado desta aula.'
  : 'Com base no título e contexto do curso/módulo, crie um resumo estruturado do que provavelmente esta aula aborda.'}

Estruture o resumo com:
1. **Visão Geral** (2-3 frases descrevendo o tema principal)
2. **Pontos-Chave** (lista com os principais tópicos abordados)
3. **Conceitos Importantes** (termos e conceitos relevantes)
4. **Aplicação Prática** (como aplicar o que foi aprendido)

Seja objetivo, claro e educativo. Use português do Brasil.`;

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'ANTHROPIC_API_KEY não configurada. Adicione no arquivo .env do backend.'
      });
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = message.content[0].text;

    // Salva no banco
    db.prepare(`
      INSERT INTO summaries (lesson_id, content, generated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(lesson_id) DO UPDATE SET
        content = excluded.content,
        generated_at = CURRENT_TIMESTAMP
    `).run(lessonId, summary);

    res.json({ summary, cached: false });
  } catch (err) {
    console.error('Erro ao gerar resumo:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar resumo com IA.' });
  }
});

// GET /api/ai/summary/:lessonId — retorna resumo salvo
router.get('/summary/:lessonId', (req, res) => {
  try {
    const summary = db.prepare('SELECT * FROM summaries WHERE lesson_id = ?').get(req.params.lessonId);
    res.json(summary ? { summary: summary.content, generated_at: summary.generated_at } : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
