import React from 'react';

export default function Header({ t, uiLang, setUiLang, currentView, setCurrentView }) {
  const [showLangMenu, setShowLangMenu] = React.useState(false);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h1>{t.appTitle}</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {currentView !== 'vocabulary' && (
            <button className="btn" style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.5rem 1rem' }} onClick={() => setCurrentView('vocabulary')}>
              {t.vocabulary}
            </button>
          )}
          {currentView !== 'library' && (
            <button className="btn" style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.5rem 1rem' }} onClick={() => setCurrentView('library')}>
              {t.library}
            </button>
          )}
          {currentView !== 'cinema' && (
            <button className="btn" style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.5rem 1rem' }} onClick={() => setCurrentView('cinema')}>
              Cinéma 🎬
            </button>
          )}

          <div style={{ position: 'relative' }}>
            <button 
              style={{ 
                background: 'rgba(0, 0, 0, 0.2)', 
                border: '1px solid var(--glass-border)', 
                color: 'var(--text-secondary)', 
                cursor: 'pointer', 
                fontSize: '0.9rem', 
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                height: '100%'
              }}
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
              onClick={() => setShowLangMenu(!showLangMenu)}
            >
              {t.uiLangToggle} <span>▼</span>
            </button>

            {showLangMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                minWidth: '150px',
                zIndex: 50
              }}>
                <button onClick={() => { setUiLang('fr'); setShowLangMenu(false); }} style={{ padding: '0.8rem 1.5rem', background: uiLang === 'fr' ? 'rgba(255,255,255,0.1)' : 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left' }}>🇫🇷 Français</button>
                <button onClick={() => { setUiLang('en'); setShowLangMenu(false); }} style={{ padding: '0.8rem 1.5rem', background: uiLang === 'en' ? 'rgba(255,255,255,0.1)' : 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left' }}>🇬🇧 English</button>
                <button onClick={() => { setUiLang('pt'); setShowLangMenu(false); }} style={{ padding: '0.8rem 1.5rem', background: uiLang === 'pt' ? 'rgba(255,255,255,0.1)' : 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left' }}>🇧🇷 Português</button>
                <button onClick={() => { setUiLang('it'); setShowLangMenu(false); }} style={{ padding: '0.8rem 1.5rem', background: uiLang === 'it' ? 'rgba(255,255,255,0.1)' : 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left' }}>🇮🇹 Italiano</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
