import React, { useState } from 'react';

export default function LibraryView({ 
  t, 
  libraryTab, 
  setLibraryTab, 
  savedTexts, 
  setCurrentView, 
  setTextTitle, 
  setInputText,
  startReadingContent,
  toggleTextStatus,
  deleteText,
  updateTextTitle
}) {
  const [editingTextId, setEditingTextId] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState("");

  const handleEditClick = (e, text) => {
    e.stopPropagation();
    setEditingTextId(text.id);
    setEditTitleValue(text.title);
  };

  const handleSaveTitle = (e, textId) => {
    e.stopPropagation();
    if (editTitleValue.trim() !== '') {
      updateTextTitle(textId, editTitleValue.trim());
    }
    setEditingTextId(null);
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>{t.myTexts}</h3>
        <button className="btn" onClick={() => { setTextTitle(''); setInputText(''); setCurrentView('import'); }}>
          {t.importTextBtn}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setLibraryTab('unread')}
          style={{ 
            background: 'none', border: 'none', color: libraryTab === 'unread' ? 'white' : 'gray', 
            fontWeight: libraryTab === 'unread' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '1.1rem',
            padding: 0
          }}
        >
          {t.unread} ({savedTexts.filter(t => t.status !== 'read').length})
        </button>
        <button 
          onClick={() => setLibraryTab('read')}
          style={{ 
            background: 'none', border: 'none', color: libraryTab === 'read' ? 'white' : 'gray', 
            fontWeight: libraryTab === 'read' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '1.1rem',
            padding: 0
          }}
        >
          {t.read} ({savedTexts.filter(t => t.status === 'read').length})
        </button>
      </div>
      
      {(() => {
        const displayedTexts = savedTexts.filter(t => libraryTab === 'read' ? t.status === 'read' : t.status !== 'read');
        if (displayedTexts.length === 0) {
          return (
            <p style={{ opacity: 0.7, textAlign: 'center', padding: '2rem 0' }}>
              {libraryTab === 'unread' ? t.noUnreadTexts : t.noReadTexts}
            </p>
          );
        }
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {displayedTexts.map(text => (
            <div 
              key={text.id}
              onClick={() => startReadingContent(text.id, text.title, text.content, text.audio_url, text.segments_json)}
              style={{
                padding: '1.5rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--glass-border)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                opacity: text.status === 'read' ? 0.6 : 1
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.6)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', flex: 1 }}>
                  {editingTextId === text.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem' }}>
                      <input 
                        type="text" 
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--glass-border)',
                          color: 'white',
                          padding: '0.3rem 0.5rem',
                          borderRadius: '4px',
                          flex: 1
                        }}
                      />
                      <button onClick={(e) => handleSaveTitle(e, text.id)} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', padding: '0 0.5rem', cursor: 'pointer' }}>✓</button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingTextId(null); }} style={{ background: 'transparent', color: 'gray', border: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                  ) : (
                    <>{text.status === 'read' ? '✅ ' : ''}{text.title}</>
                  )}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editingTextId !== text.id && (
                    <button 
                      onClick={(e) => handleEditClick(e, text)}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid var(--glass-border)',
                        color: 'white',
                        borderRadius: '4px',
                        padding: '0.3rem 0.6rem',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.8)'}
                    >
                      ✏️
                    </button>
                  )}
                  <button 
                    onClick={(e) => toggleTextStatus(e, text)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--glass-border)',
                      color: 'white',
                      borderRadius: '4px',
                      padding: '0.3rem 0.6rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.8)'}
                  >
                    {text.status === 'read' ? t.markUnread : t.markRead}
                  </button>
                  <button 
                    onClick={(e) => deleteText(e, text.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      color: '#ef4444',
                      borderRadius: '4px',
                      padding: '0.3rem 0.6rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.4)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
      })()}
    </div>
  );
}
