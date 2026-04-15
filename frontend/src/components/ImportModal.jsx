import { useState } from 'react';
import axios from 'axios';
import './ImportModal.css';

export default function ImportModal({ onClose, onImported }) {
  const [folderPath, setFolderPath] = useState('');
  const [courseName, setCourseName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async (e) => {
    e.preventDefault();
    if (!folderPath.trim()) {
      setError('Informe o caminho da pasta.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('/api/courses/import', {
        folderPath: folderPath.trim(),
        courseName: courseName.trim() || undefined,
      });
      onImported();
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao importar o curso.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Importar Curso</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="modal-body" onSubmit={handleImport}>
          <div className="form-group">
            <label>Caminho da Pasta *</label>
            <input
              type="text"
              className="form-input"
              placeholder="/home/usuario/MeusCursos/NomeDoCurso"
              value={folderPath}
              onChange={e => setFolderPath(e.target.value)}
              autoFocus
            />
            <span className="form-hint">
              Cole o caminho completo da pasta com os vídeos do curso.
              A estrutura de módulos será detectada automaticamente.
            </span>
          </div>

          <div className="form-group">
            <label>Nome do Curso (opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Deixe em branco para usar o nome da pasta"
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
            />
          </div>

          <div className="import-tip">
            <strong>💡 Estrutura reconhecida automaticamente:</strong>
            <pre>{`📁 MeuCurso/
  📁 01 - Módulo 1/
    📄 01 - Aula Intro.mp4
    📄 02 - Aula 2.mp4
  📁 02 - Módulo 2/
    📄 01 - Aula.mp4`}
            </pre>
          </div>

          {error && <div className="modal-error">⚠ {error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Importando...' : 'Importar Curso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
