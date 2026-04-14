import { useState, useEffect } from 'react';
import axios from 'axios';
import './CourseCard.css';

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function CourseCard({ course, onContinue, onDelete, onPlayLesson }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const completedPct = course.total_lessons > 0
    ? Math.round((course.completed_lessons / course.total_lessons) * 100)
    : 0;

  const handleExpand = async () => {
    if (!expanded && !detail) {
      setLoadingDetail(true);
      try {
        const { data } = await axios.get(`/api/courses/${course.id}`);
        setDetail(data);
      } catch {
        // silently fail
      } finally {
        setLoadingDetail(false);
      }
    }
    setExpanded(e => !e);
  };

  return (
    <div className="course-card">
      <div className="course-card-header">
        <div className="course-card-thumb">
          <span className="thumb-icon">🎓</span>
          {completedPct === 100 && <span className="badge-done">✓</span>}
        </div>
        <div className="course-card-info">
          <h3 className="course-card-title">{course.name}</h3>
          <p className="course-card-meta">
            {course.total_lessons} aulas
            {course.completed_lessons > 0 && ` · ${course.completed_lessons} concluídas`}
          </p>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${completedPct}%` }} />
          </div>
          <span className="progress-label">{completedPct}% concluído</span>
        </div>
      </div>

      <div className="course-card-actions">
        <button className="btn-continue" onClick={onContinue}>
          ▶ Continuar
        </button>
        <button className="btn-expand" onClick={handleExpand}>
          {expanded ? '▲ Fechar' : '☰ Ver aulas'}
        </button>
        <button className="btn-delete" onClick={onDelete} title="Remover curso">
          🗑
        </button>
      </div>

      {expanded && (
        <div className="course-card-detail">
          {loadingDetail && <div className="detail-loading">Carregando...</div>}
          {detail && detail.modules.map(mod => (
            <div key={mod.id} className="module-section">
              <div className="module-title">
                <span className="module-num">Módulo {mod.number}</span>
                {mod.name}
              </div>
              <div className="lesson-list">
                {mod.lessons.map(lesson => {
                  const pct = lesson.duration > 0
                    ? Math.round((lesson.position / lesson.duration) * 100)
                    : 0;
                  return (
                    <div
                      key={lesson.id}
                      className={`lesson-item ${lesson.completed ? 'lesson-done' : ''}`}
                      onClick={() => onPlayLesson(lesson, detail)}
                    >
                      <span className="lesson-status">
                        {lesson.completed ? '✓' : pct > 0 ? '▶' : '○'}
                      </span>
                      <span className="lesson-name">{lesson.name}</span>
                      {pct > 0 && !lesson.completed && (
                        <span className="lesson-pct">{pct}%</span>
                      )}
                      {lesson.duration > 0 && (
                        <span className="lesson-dur">{formatDuration(lesson.duration)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
