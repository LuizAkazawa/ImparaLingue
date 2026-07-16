import React, { useState } from 'react';

export default function ImportView({
  t,
  textTitle,
  setTextTitle,
  inputText,
  setInputText,
  handleFileUpload,
  handleStartImport,
  setCurrentView,
  startReadingContent,
  saveTextToLibrary
}) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState('');

  const handleYoutubeImport = async () => {
    if (!youtubeUrl) return;
    setIsTranscribing(true);
    setTranscriptionStatus('downloading');
    try {
      const res = await fetch('http://localhost:8080/api/youtube/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
      });
      const data = await res.json();
      
      const interval = setInterval(async () => {
        const statusRes = await fetch(`http://localhost:8080/api/youtube/status?id=${data.id}`);
        const statusData = await statusRes.json();
        
        setTranscriptionStatus(statusData.status);

        if (statusData.status === 'completed') {
          clearInterval(interval);
          setIsTranscribing(false);
          
          let fullText = '';
          if (statusData.transcription && statusData.transcription.transcription) {
            fullText = statusData.transcription.transcription.map(seg => seg.text).join(' ');
          } else {
             fullText = "Erreur: format de transcription inattendu.";
          }
          
          await saveTextToLibrary(
            statusData.title || "Vidéo YouTube", 
            fullText, 
            statusData.audio_url, 
            statusData.transcription && statusData.transcription.transcription ? JSON.stringify(statusData.transcription.transcription) : ''
          );
          setCurrentView('library');
        } else if (statusData.status.startsWith('error')) {
          clearInterval(interval);
          setIsTranscribing(false);
          alert("Erreur: " + statusData.status);
        }
      }, 2000);
    } catch (err) {
      console.error(err);
      setIsTranscribing(false);
      alert("Erreur de connexion");
    }
  };

  const getStatusText = () => {
    if (transcriptionStatus === 'downloading') return "Téléchargement de l'audio...";
    if (transcriptionStatus === 'transcribing') return "Transcription avec Whisper en cours (quelques minutes)...";
    if (transcriptionStatus === 'pending') return "En attente...";
    return transcriptionStatus;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Importer depuis YouTube</h3>
      </div>
      
      <div style={{ padding: '1.5rem', borderRadius: '8px', backgroundColor: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--glass-border)' }}>
        <input 
          type="text"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="Coller l'URL d'une vidéo YouTube ici..."
          style={{ width: '100%', padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--glass-border)', marginBottom: '1rem', outline: 'none' }}
          disabled={isTranscribing}
        />
        {isTranscribing ? (
          <div style={{ textAlign: 'center', color: 'var(--word-learning)', fontWeight: 'bold' }}>
            ⏳ {getStatusText()}
          </div>
        ) : (
          <button className="btn" onClick={handleYoutubeImport} style={{ width: '100%', backgroundColor: '#ef4444', color: 'white' }}>
            Télécharger & Transcrire
          </button>
        )}
      </div>

      <div style={{ textAlign: 'center', opacity: 0.5, margin: '1rem 0', fontWeight: 'bold' }}>— OU —</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{t.importNewText}</h3>
      </div>

      <div style={{ 
        padding: '1.5rem', 
        border: '1px dashed var(--glass-border)', 
        borderRadius: '8px', 
        backgroundColor: 'rgba(15, 23, 42, 0.4)', 
        textAlign: 'center' 
      }}>
        <p style={{ margin: '0 0 1rem 0' }}>{t.extractFile}</p>
        <input type="file" accept=".txt,.pdf,.srt,.vtt" onChange={handleFileUpload} />
      </div>

      <div style={{ textAlign: 'center', opacity: 0.5, margin: '0.5rem 0' }}>{t.orCopyPaste}</div>

      <input 
        type="text"
        value={textTitle}
        onChange={(e) => setTextTitle(e.target.value)}
        placeholder={t.titlePlaceholder}
        style={{
          width: '100%',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          color: 'white',
          border: '1px solid var(--glass-border)',
          fontFamily: 'inherit',
          fontSize: '1.2rem',
          outline: 'none'
        }}
      />
      <textarea 
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={t.contentPlaceholder}
        style={{
          width: '100%',
          minHeight: '200px',
          padding: '1.5rem',
          borderRadius: '8px',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          color: 'white',
          border: '1px solid var(--glass-border)',
          fontFamily: 'inherit',
          fontSize: '1.1rem',
          lineHeight: '1.5',
          resize: 'vertical'
        }}
      />
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="btn" onClick={handleStartImport} style={{ flex: 1 }}>
          {t.saveAndStart}
        </button>
        <button className="btn" onClick={() => setCurrentView('library')} style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
