import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './NotesPanel.css';

export default function NotesPanel({ lessonId }) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef(null);
  const lastSavedContent = useRef('');

  useEffect(() => {
    if (!lessonId) return;
    setContent('');
    lastSavedContent.current = '';

    axios.get(`/api/notes/${lessonId}`)
      .then(({ data }) => {
        setContent(data.content || '');
        lastSavedContent.current = data.content || '';
      })
      .catch(() => {});
  }, [lessonId]);

  const save = useCallback(async (text) => {
    if (!lessonId || text === lastSavedContent.current) return;
    setSaving(true);
    try {
      await axios.put(`/api/notes/${lessonId}`, { content: text });
      lastSavedContent.current = text;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }, [lessonId]);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setContent(val);
    setSaved(false);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(val), 1200);
  }, [save]);

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <span className="notes-title">Minhas Anotações</span>
        <span className="notes-status">
          {saving && 'Salvando...'}
          {saved && !saving && '✓ Salvo'}
        </span>
      </div>
      <textarea
        className="notes-textarea"
        value={content}
        onChange={handleChange}
        placeholder="Digite suas anotações aqui...&#10;&#10;Dicas:&#10;• Use # para títulos&#10;• Use - para listas&#10;• Salvo automaticamente"
        spellCheck={false}
      />
    </div>
  );
}
