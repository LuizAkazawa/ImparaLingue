import React, { useRef, useEffect, useState } from 'react';

export default function DictionarySidebar({
  t,
  selectedWord,
  setSelectedWord,
  playAudio,
  isTranslating,
  translationText,
  setTranslationText,
  notesText,
  setNotesText,
  handleStatusChange,
  wordStatuses,
  audioSpeed,
  setAudioSpeed,
  uiLang,
  handleWordEdit,
  improveTranslationWithDeepL
}) {
  const [isEditingWord, setIsEditingWord] = useState(false);
  const [editWordValue, setEditWordValue] = useState('');

  useEffect(() => {
    setIsEditingWord(false);
    setEditWordValue(selectedWord || '');
  }, [selectedWord]);
  const translationRef = useRef(null);

  useEffect(() => {
    if (translationRef.current) {
      translationRef.current.style.height = 'auto';
      translationRef.current.style.height = `${translationRef.current.scrollHeight}px`;
    }
  }, [translationText]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === '1') {
        handleStatusChange('known');
      } else if (e.key === '2') {
        handleStatusChange('learning');
      } else if (e.key === '3') {
        handleStatusChange('review');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStatusChange]);

  if (!selectedWord) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', textAlign: 'center', opacity: 0.5 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👆</div>
        <p dangerouslySetInnerHTML={{ __html: t.clickWordHint }}></p>
      </div>
    );
  }

  const currentStatus = wordStatuses[selectedWord]?.status || 'unknown';

  const circleStyle = (statusMatch) => ({
    width: '40px', 
    height: '40px', 
    borderRadius: '50%', 
    background: currentStatus === statusMatch ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
    border: currentStatus === statusMatch ? '1px solid var(--accent-color)' : '1px solid var(--text-secondary)', 
    color: 'white', 
    display: 'flex',
    justifyContent: 'center', 
    alignItems: 'center', 
    cursor: 'pointer', 
    transition: 'all 0.2s',
    fontSize: '1rem'
  });

  // Hooks déplacés en haut du fichier

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', justifyContent: 'center' }}>
      
      {/* Top Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <button onClick={() => playAudio(selectedWord)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'white', display: 'flex', alignItems: 'center' }}>
          🔊
        </button>
        {isEditingWord ? (
          <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
            <input 
              value={editWordValue} 
              onChange={(e) => setEditWordValue(e.target.value)}
              style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', padding: '0.3rem', borderRadius: '4px', flex: 1 }}
              autoFocus
            />
            <button onClick={() => { handleWordEdit(selectedWord, editWordValue); setIsEditingWord(false); }} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', padding: '0 0.5rem', cursor: 'pointer' }}>✓</button>
            <button onClick={() => setIsEditingWord(false)} style={{ background: 'transparent', color: 'gray', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        ) : (
          <>
            <span style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>{selectedWord}</span>
            <button onClick={() => setIsEditingWord(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem' }}>✏️</button>
            <div style={{ flex: 1 }}></div>
          </>
        )}
        <button onClick={() => setSelectedWord(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
      </div>

      {/* Meaning Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-primary)', marginBottom: '0.8rem', fontSize: '1rem' }}>
          <span>{t.translationTitle}</span>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={improveTranslationWithDeepL} 
              disabled={isTranslating}
              style={{ 
                background: 'rgba(59, 130, 246, 0.2)', 
                color: 'var(--word-unknown)', 
                border: '1px solid rgba(59, 130, 246, 0.5)', 
                borderRadius: '4px', 
                padding: '0.3rem 0.6rem', 
                cursor: isTranslating ? 'wait' : 'pointer',
                fontSize: '0.85rem'
              }}>
              {t.improveTranslation}
            </button>
            <span style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>v</span>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          {isTranslating ? (
            <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{t.loading}</div>
          ) : (
            <textarea 
              ref={translationRef}
              value={translationText}
              onChange={(e) => {
                setTranslationText(e.target.value);
                // Save automatically on change just like a native app might
                handleStatusChange(currentStatus);
              }}
              placeholder={t.translationPlaceholder}
              style={{
                width: '100%', 
                padding: '1rem', 
                paddingRight: '3rem',
                backgroundColor: 'rgba(30,30,30,0.5)', 
                color: 'white',
                border: '1px solid var(--glass-border)', 
                borderRadius: '8px',
                outline: 'none', 
                fontSize: '1rem',
                minHeight: '80px',
                resize: 'none',
                overflow: 'hidden',
                fontFamily: 'inherit'
              }}
            />
          )}
          <span style={{ position: 'absolute', right: '1rem', top: '1rem', fontSize: '1.2rem' }}>
            {uiLang === 'fr' ? '🇫🇷' : uiLang === 'en' ? '🇬🇧' : uiLang === 'pt' ? '🇧🇷' : uiLang === 'it' ? '🇮🇹' : '🇬🇧'}
          </span>
        </div>
      </div>

      {/* Notes Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ color: 'var(--text-primary)', marginBottom: '0.8rem', fontSize: '1rem' }}>{t.notesTitle}</div>
        <textarea 
          value={notesText}
          onChange={(e) => {
            setNotesText(e.target.value);
            // Save automatically on change just like the native app logic
            handleStatusChange(currentStatus);
          }}
          placeholder={t.notesPlaceholder}
          style={{
            width: '100%', 
            minHeight: '120px', 
            padding: '1rem',
            backgroundColor: 'rgba(30,30,30,0.5)', 
            color: 'white',
            border: '1px solid var(--glass-border)', 
            borderRadius: '8px',
            outline: 'none', 
            fontSize: '1rem', 
            resize: 'none'
          }}
        />
      </div>

      {/* Bottom Action Bar */}
      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <button onClick={() => handleStatusChange('known')} style={{ 
          backgroundColor: currentStatus === 'known' ? 'rgba(16, 185, 129, 0.3)' : 'transparent', 
          color: currentStatus === 'known' ? 'var(--word-known)' : 'var(--text-secondary)', 
          padding: '0.8rem', 
          borderRadius: '8px', 
          border: currentStatus === 'known' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--glass-border)', 
          cursor: 'pointer', 
          fontWeight: 'bold', 
          fontSize: '1rem', 
          transition: 'all 0.2s' 
        }}>
          <span style={{opacity: 0.5, marginRight: '0.5rem'}}>[1]</span> {t.known}
        </button>
        <button onClick={() => handleStatusChange('learning')} style={{ 
          backgroundColor: currentStatus === 'learning' ? 'rgba(245, 158, 11, 0.3)' : 'transparent', 
          color: currentStatus === 'learning' ? 'var(--word-learning)' : 'var(--text-secondary)', 
          padding: '0.8rem', 
          borderRadius: '8px', 
          border: currentStatus === 'learning' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid var(--glass-border)', 
          cursor: 'pointer', 
          fontWeight: 'bold', 
          fontSize: '1rem', 
          transition: 'all 0.2s' 
        }}>
          <span style={{opacity: 0.5, marginRight: '0.5rem'}}>[2]</span> {t.learning}
        </button>
        <button onClick={() => handleStatusChange('review')} style={{ 
          backgroundColor: currentStatus === 'review' ? 'rgba(239, 68, 68, 0.3)' : 'transparent', 
          color: currentStatus === 'review' ? '#ef4444' : 'var(--text-secondary)', 
          padding: '0.8rem', 
          borderRadius: '8px', 
          border: currentStatus === 'review' ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--glass-border)', 
          cursor: 'pointer', 
          fontWeight: 'bold', 
          fontSize: '1rem', 
          transition: 'all 0.2s' 
        }}>
          <span style={{opacity: 0.5, marginRight: '0.5rem'}}>[3]</span> {t.review}
        </button>
      </div>

    </div>
  );
}
