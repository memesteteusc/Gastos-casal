import { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './SummaryPanel.css';

export default function SummaryPanel({ lessonId, lesson }) {
  const [summary, setSummary] = useState('');
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!lessonId) return;
    setSummary('');
    setError('');
    setGeneratedAt(null);

    // Carrega resumo salvo
    axios.get(`/api/ai/summary/${lessonId}`)
      .then(({ data }) => {
        if (data) {
          setSummary(data.summary);
          setGeneratedAt(data.generated_at);
        }
      })
      .catch(() => {});
  }, [lessonId]);

  const generate = async (regenerate = false) => {
    setLoading(true);
    setError('');
    try {
      const url = `/api/ai/summary/${lessonId}${regenerate ? '?regenerate=1' : ''}`;
      const { data } = await axios.post(url);
      setSummary(data.summary);
      setGeneratedAt(new Date().toISOString());
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar resumo. Verifique a ANTHROPIC_API_KEY.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="summary-panel">
      <div className="summary-header">
        <div>
          <span className="summary-title">Resumo IA</span>
          {generatedAt && (
            <span className="summary-date">Gerado em {formatDate(generatedAt)}</span>
          )}
        </div>
        <div className="summary-actions">
          {summary && (
            <button
              className="btn-regen"
              onClick={() => generate(true)}
              disabled={loading}
              title="Regenerar resumo"
            >
              ↻
            </button>
          )}
        </div>
      </div>

      <div className="summary-body">
        {!summary && !loading && !error && (
          <div className="summary-empty">
            <div className="summary-empty-icon">✨</div>
            <p>Gere um resumo desta aula com Inteligência Artificial</p>
            <p className="summary-hint">
              Se houver arquivo de legenda (.srt) na mesma pasta do vídeo,
              o resumo será baseado no conteúdo real da aula.
            </p>
            <button className="btn-generate" onClick={() => generate(false)} disabled={loading}>
              ✨ Gerar Resumo com IA
            </button>
          </div>
        )}

        {loading && (
          <div className="summary-loading">
            <div className="spinner-sm" />
            <span>Gerando resumo com Claude...</span>
          </div>
        )}

        {error && (
          <div className="summary-error">
            <p>⚠ {error}</p>
            <button className="btn-generate" onClick={() => generate(false)}>
              Tentar novamente
            </button>
          </div>
        )}

        {summary && !loading && (
          <div className="summary-content">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
