import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import VideoPlayer from './VideoPlayer.jsx';
import LessonSidebar from './LessonSidebar.jsx';
import NotesPanel from './NotesPanel.jsx';
import SummaryPanel from './SummaryPanel.jsx';
import './PlayerView.css';

export default function PlayerView({ lesson, course, onBack, onChangeLesson }) {
  const [activeTab, setActiveTab] = useState('aulas'); // 'aulas' | 'notas' | 'resumo'
  const [courseDetail, setCourseDetail] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(lesson);

  useEffect(() => {
    if (course?.id) {
      axios.get(`/api/courses/${course.id}`).then(({ data }) => setCourseDetail(data));
    }
  }, [course?.id]);

  const handleLessonSelect = useCallback((newLesson) => {
    setCurrentLesson(newLesson);
    onChangeLesson(newLesson);
  }, [onChangeLesson]);

  const handleNextLesson = useCallback(async () => {
    try {
      const { data: next } = await axios.get(`/api/videos/${currentLesson.id}/next`);
      if (next) {
        handleLessonSelect(next);
      } else {
        alert('🎉 Parabéns! Você concluiu todas as aulas deste curso!');
      }
    } catch {
      // silently fail
    }
  }, [currentLesson?.id, handleLessonSelect]);

  // Atualiza sidebar quando muda de aula
  const refreshCourse = useCallback(() => {
    if (course?.id) {
      axios.get(`/api/courses/${course.id}`).then(({ data }) => setCourseDetail(data));
    }
  }, [course?.id]);

  return (
    <div className="player-view">
      <div className="player-topbar">
        <button className="btn-back" onClick={onBack}>
          ← Voltar
        </button>
        <div className="player-breadcrumb">
          <span className="breadcrumb-course">{course?.name}</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-lesson">{currentLesson?.name}</span>
        </div>
      </div>

      <div className="player-body">
        <div className="player-main">
          <VideoPlayer
            lesson={currentLesson}
            onNext={handleNextLesson}
            onProgressSaved={refreshCourse}
          />
        </div>

        <div className="player-sidebar">
          <div className="sidebar-tabs">
            {['aulas', 'notas', 'resumo'].map(tab => (
              <button
                key={tab}
                className={`sidebar-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'aulas' && '☰ Aulas'}
                {tab === 'notas' && '📝 Notas'}
                {tab === 'resumo' && '✨ Resumo IA'}
              </button>
            ))}
          </div>

          <div className="sidebar-content">
            {activeTab === 'aulas' && (
              <LessonSidebar
                courseDetail={courseDetail}
                currentLessonId={currentLesson?.id}
                onSelect={handleLessonSelect}
              />
            )}
            {activeTab === 'notas' && (
              <NotesPanel lessonId={currentLesson?.id} />
            )}
            {activeTab === 'resumo' && (
              <SummaryPanel lessonId={currentLesson?.id} lesson={currentLesson} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
