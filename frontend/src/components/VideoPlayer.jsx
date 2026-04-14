import { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './VideoPlayer.css';

const SAVE_INTERVAL_MS = 5000; // salva progresso a cada 5 segundos

export default function VideoPlayer({ lesson, onNext, onProgressSaved }) {
  const videoRef = useRef(null);
  const saveTimerRef = useRef(null);
  const lastSavedRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const controlsTimerRef = useRef(null);

  const lessonId = lesson?.id;

  // Salva progresso no backend
  const saveProgress = useCallback(async (pos, dur, isCompleted) => {
    if (!lessonId || dur === 0) return;
    try {
      const { data } = await axios.patch(`/api/videos/${lessonId}/progress`, {
        position: pos,
        duration: dur,
        completed: isCompleted,
      });
      if (data.completed && !completed) {
        setCompleted(true);
        onProgressSaved?.();
      }
    } catch {
      // silently fail
    }
  }, [lessonId, completed, onProgressSaved]);

  // Carrega progresso salvo ao trocar de aula
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !lessonId) return;

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCompleted(false);
    lastSavedRef.current = 0;

    const loadSavedProgress = async () => {
      try {
        const { data } = await axios.get(`/api/videos/${lessonId}/progress`);
        if (data.completed) setCompleted(true);
        // Aguarda metadados carregarem para restaurar posição
        const restorePosition = () => {
          if (data.position > 5 && !data.completed) {
            video.currentTime = data.position;
          }
        };
        if (video.readyState >= 1) {
          restorePosition();
        } else {
          video.addEventListener('loadedmetadata', restorePosition, { once: true });
        }
      } catch {
        // silently fail
      }
    };
    loadSavedProgress();

    // Inicia intervalo de auto-save
    clearInterval(saveTimerRef.current);
    saveTimerRef.current = setInterval(() => {
      const v = videoRef.current;
      if (v && !v.paused && v.duration > 0) {
        saveProgress(v.currentTime, v.duration, false);
      }
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(saveTimerRef.current);
  }, [lessonId]);

  // Esconde controles após 3s de inatividade
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
  }, []);

  const handleEnded = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    saveProgress(v.duration, v.duration, true);
    setCompleted(true);
    setIsPlaying(false);
    onProgressSaved?.();
  }, [saveProgress, onProgressSaved]);

  const handleSeek = useCallback((e) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * duration;
  }, [duration]);

  const handleVolumeChange = useCallback((e) => {
    const v = videoRef.current;
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (v) v.volume = val;
    setMuted(val === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = videoRef.current?.parentElement;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);

  const changeSpeed = useCallback(() => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const v = videoRef.current;
    if (!v) return;
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    v.playbackRate = next;
    setSpeed(next);
  }, [speed]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          v.currentTime = Math.min(v.currentTime + 10, v.duration);
          break;
        case 'ArrowLeft':
          v.currentTime = Math.max(v.currentTime - 10, 0);
          break;
        case 'ArrowUp':
          v.volume = Math.min(v.volume + 0.1, 1);
          setVolume(v.volume);
          break;
        case 'ArrowDown':
          v.volume = Math.max(v.volume - 0.1, 0);
          setVolume(v.volume);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          toggleMute();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlay, toggleFullscreen, toggleMute]);

  function formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = (() => {
    const v = videoRef.current;
    if (!v || !v.buffered.length || !duration) return 0;
    return (v.buffered.end(v.buffered.length - 1) / duration) * 100;
  })();

  if (!lesson) {
    return (
      <div className="video-placeholder">
        <p>Selecione uma aula para começar</p>
      </div>
    );
  }

  return (
    <div
      className={`video-container ${showControls ? 'show-controls' : ''}`}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="video-element"
        src={`/api/videos/stream/${lessonId}`}
        onPlay={() => setIsPlaying(true)}
        onPause={() => { setIsPlaying(false); setShowControls(true); }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onClick={togglePlay}
      />

      {completed && (
        <div className="video-completed-overlay">
          <div className="completed-card">
            <div className="completed-icon">✓</div>
            <h3>Aula Concluída!</h3>
            <button className="btn-next-lesson" onClick={onNext}>
              Próxima Aula →
            </button>
          </div>
        </div>
      )}

      <div className="video-controls">
        <div className="progress-track" onClick={handleSeek}>
          <div className="progress-buffered" style={{ width: `${bufferedPct}%` }} />
          <div className="progress-played" style={{ width: `${progressPct}%` }}>
            <div className="progress-thumb" />
          </div>
        </div>

        <div className="controls-row">
          <div className="controls-left">
            <button className="ctrl-btn" onClick={togglePlay} title={isPlaying ? 'Pausar (K)' : 'Reproduzir (K)'}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="ctrl-btn" onClick={onNext} title="Próxima aula">
              ⏭
            </button>
            <div className="volume-wrap">
              <button className="ctrl-btn" onClick={toggleMute} title="Mudo (M)">
                {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                className="volume-slider"
                min="0" max="1" step="0.05"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
              />
            </div>
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="controls-right">
            <button className="ctrl-btn speed-btn" onClick={changeSpeed} title="Velocidade">
              {speed}x
            </button>
            <button className="ctrl-btn" onClick={toggleFullscreen} title="Tela cheia (F)">
              ⛶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
