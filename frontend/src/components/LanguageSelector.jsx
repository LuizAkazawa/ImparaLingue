import React from 'react';

export default function LanguageSelector({ 
  t, 
  currentLang, 
  setCurrentLang, 
  currentView, 
  setCurrentView, 
  setTextTitle, 
  setInputText, 
  setWords, 
  setSelectedWord 
}) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      marginBottom: '2.5rem',
      paddingBottom: '2.5rem',
      borderBottom: '1px solid var(--glass-border)'
    }}>
      <div style={{ 
        display: 'flex', 
        background: 'rgba(0, 0, 0, 0.2)', 
        padding: '0.4rem', 
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        gap: '0.2rem'
      }}>
        {[
          { id: 'en', flag: '🇬🇧', label: t.english.replace('🇬🇧 ', '') },
          { id: 'fr', flag: '🇫🇷', label: t.french.replace('🇫🇷 ', '') },
          { id: 'es', flag: '🇪🇸', label: t.spanish.replace('🇪🇸 ', '') },
          { id: 'it', flag: '🇮🇹', label: t.italian.replace('🇮🇹 ', '') },
          { id: 'pt', flag: '🇧🇷', label: t.portuguese.replace('🇧🇷 ', '') }
        ].map(lang => (
          <button
            key={lang.id}
            onClick={() => {
              if (currentLang !== lang.id) {
                setCurrentLang(lang.id);
                if (currentView === 'reading' || currentView === 'import') {
                  setCurrentView('library');
                  setTextTitle('');
                  setInputText('');
                  setWords([]);
                  setSelectedWord(null);
                }
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.7rem 1.2rem',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: currentLang === lang.id ? 'bold' : '600',
              color: currentLang === lang.id ? 'white' : 'var(--text-secondary)',
              background: currentLang === lang.id ? 'var(--word-learning)' : 'transparent',
              boxShadow: currentLang === lang.id ? '0 4px 15px rgba(245, 158, 11, 0.3)' : 'none',
              transition: 'all 0.2s ease',
              transform: currentLang === lang.id ? 'scale(1.02)' : 'scale(1)'
            }}
            onMouseEnter={(e) => {
              if (currentLang !== lang.id) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            }}
            onMouseLeave={(e) => {
              if (currentLang !== lang.id) e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{ fontSize: '1.2rem', filter: currentLang === lang.id ? 'none' : 'grayscale(0.7)' }}>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
