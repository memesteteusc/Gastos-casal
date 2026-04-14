import { useState, useCallback } from 'react';
import CourseHome from './components/CourseHome.jsx';
import PlayerView from './components/PlayerView.jsx';
import './styles/App.css';

export default function App() {
  const [view, setView] = useState('home'); // 'home' | 'player'
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const openPlayer = useCallback((lesson, course) => {
    setSelectedLesson(lesson);
    setSelectedCourse(course);
    setView('player');
  }, []);

  const goHome = useCallback(() => {
    setView('home');
    setSelectedLesson(null);
    setSelectedCourse(null);
  }, []);

  const changeLesson = useCallback((lesson) => {
    setSelectedLesson(lesson);
  }, []);

  return (
    <div className="app">
      {view === 'home' ? (
        <CourseHome onPlayLesson={openPlayer} />
      ) : (
        <PlayerView
          lesson={selectedLesson}
          course={selectedCourse}
          onBack={goHome}
          onChangeLesson={changeLesson}
        />
      )}
    </div>
  );
}
