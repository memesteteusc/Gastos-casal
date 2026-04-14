import './LessonSidebar.css';

export default function LessonSidebar({ courseDetail, currentLessonId, onSelect }) {
  if (!courseDetail) {
    return (
      <div className="sidebar-loading">
        <div className="spinner-sm" />
      </div>
    );
  }

  return (
    <div className="lesson-sidebar">
      {courseDetail.modules.map(mod => (
        <div key={mod.id} className="sb-module">
          <div className="sb-module-header">
            <span className="sb-module-num">Módulo {mod.number}</span>
            <span className="sb-module-name">{mod.name}</span>
            <span className="sb-module-count">{mod.lessons.length} aulas</span>
          </div>

          {mod.lessons.map(lesson => {
            const pct = lesson.duration > 0
              ? Math.round((lesson.position / lesson.duration) * 100)
              : 0;
            const isCurrent = lesson.id === currentLessonId;

            return (
              <div
                key={lesson.id}
                className={`sb-lesson ${isCurrent ? 'current' : ''} ${lesson.completed ? 'done' : ''}`}
                onClick={() => !isCurrent && onSelect(lesson)}
              >
                <div className="sb-lesson-status">
                  {lesson.completed ? (
                    <span className="status-check">✓</span>
                  ) : isCurrent ? (
                    <span className="status-playing">▶</span>
                  ) : (
                    <span className="status-num">{lesson.number}</span>
                  )}
                </div>

                <div className="sb-lesson-info">
                  <div className="sb-lesson-name">{lesson.name}</div>
                  {pct > 0 && !lesson.completed && (
                    <div className="sb-lesson-progress">
                      <div className="sb-progress-bar">
                        <div className="sb-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span>{pct}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
