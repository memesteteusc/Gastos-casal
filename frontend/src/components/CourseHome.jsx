import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ImportModal from './ImportModal.jsx';
import CourseCard from './CourseCard.jsx';
import './CourseHome.css';

export default function CourseHome({ onPlayLesson }) {
  const [courses, setCourses] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/courses');
      setCourses(data);
    } catch (err) {
      setError('Erro ao carregar cursos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleImported = () => {
    setShowImport(false);
    fetchCourses();
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm('Remover este curso da biblioteca? Os arquivos de vídeo não serão deletados.')) return;
    try {
      await axios.delete(`/api/courses/${courseId}`);
      fetchCourses();
    } catch (err) {
      alert('Erro ao remover curso.');
    }
  };

  const handleContinue = async (course) => {
    try {
      const { data: lesson } = await axios.get(`/api/courses/${course.id}/continue`);
      if (lesson) {
        onPlayLesson(lesson, course);
      } else {
        alert('Todas as aulas deste curso já foram concluídas! 🎉');
      }
    } catch {
      alert('Erro ao buscar próxima aula.');
    }
  };

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-logo">
          <span className="logo-icon">▶</span>
          <span className="logo-text">CursoFlix</span>
        </div>
        <button className="btn-import" onClick={() => setShowImport(true)}>
          + Importar Curso
        </button>
      </header>

      <main className="home-main">
        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <span>Carregando...</span>
          </div>
        )}

        {!loading && courses.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h2>Nenhum curso importado</h2>
            <p>Clique em "Importar Curso" e selecione a pasta com seus vídeos.</p>
            <button className="btn-import-lg" onClick={() => setShowImport(true)}>
              + Importar primeiro curso
            </button>
          </div>
        )}

        {!loading && courses.length > 0 && (
          <>
            <h2 className="section-title">Minha Biblioteca</h2>
            <div className="courses-grid">
              {courses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onContinue={() => handleContinue(course)}
                  onDelete={() => handleDeleteCourse(course.id)}
                  onPlayLesson={onPlayLesson}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
}
