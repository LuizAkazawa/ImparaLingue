import React, { useState } from 'react';
import DictionarySidebar from './DictionarySidebar';

export default function ReadingView({
  t,
  textTitle,
  words,
  setCurrentView,
  handleWordClick,
  getWordStyle,
  youtubeAudioUrl,
  textSegments,
  currentAudioTime,
  
  // Props for DictionarySidebar
  selectedWord,
  setSelectedWord,
  playAudio,
  isTranslating,
  translationText,
  setTranslationText,
  handleStatusChange,
  wordStatuses,
  audioSpeed,
  setAudioSpeed
}) {
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(0);

  const [tokensPerPage, setTokensPerPage] = useState(500); // 500 tokens = ~250 mots

  const totalPages = Math.ceil(words.length / tokensPerPage);
  const displayedWords = words.slice(currentPage * tokensPerPage, (currentPage + 1) * tokensPerPage);

  React.useEffect(() => {
    setCurrentPage(0);
  }, [textTitle]);

  let activeSegmentIndex = -1;
  if (textSegments && currentAudioTime > 0) {
    activeSegmentIndex = textSegments.findIndex(seg => {
      // whisper outputs timestamps as strings or sometimes integer offsets?
      // we check offsets.from and offsets.to which are in milliseconds
      return currentAudioTime >= seg.offsets.from && currentAudioTime <= seg.offsets.to;
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Top Header Section spanning full width */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button 
            className="btn" 
            onClick={() => setCurrentView('library')}
            style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {t.returnBtn}
          </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <select 
                value={tokensPerPage} 
                onChange={(e) => {
                  setTokensPerPage(Number(e.target.value));
                  setCurrentPage(0);
                }}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '0.4rem 0.5rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value={100}>~50 {t.wordsPerPage}</option>
                <option value={240}>~120 {t.wordsPerPage}</option>
                <option value={360}>~180 {t.wordsPerPage}</option>
                <option value={500}>~250 {t.wordsPerPage}</option>
                <option value={1000}>~500 {t.wordsPerPage}</option>
                <option value={1000000}>{t.showAll}</option>
              </select>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.3rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <button onClick={() => setFontSizeMultiplier(prev => Math.max(0.5, prev - 0.1))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem 0.5rem', fontSize: '1.2rem' }}>A-</button>
                <span style={{ color: 'white', fontSize: '0.9rem', minWidth: '40px', textAlign: 'center' }}>{Math.round(fontSizeMultiplier * 100)}%</span>
                <button onClick={() => setFontSizeMultiplier(prev => Math.min(3.0, prev + 0.1))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem 0.5rem', fontSize: '1.2rem' }}>A+</button>
              </div>
            </div>
          </div>

        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '2rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
          {textTitle}
        </h2>
      </div>

      <div className="reading-container" style={{ flex: 1 }}>
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
          
          <div 
            onMouseUp={() => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
              const range = selection.getRangeAt(0);
              
              if (range.startContainer.nodeType === 3) {
                range.setStart(range.startContainer, 0);
              }
              if (range.endContainer.nodeType === 3) {
                range.setEnd(range.endContainer, range.endContainer.length);
              }
              
              selection.removeAllRanges();
              selection.addRange(range);

              let text = range.toString().trim();
              // Retirer toute la ponctuation pour la clé interne afin de matcher les mots 'clean'
              let cleanText = text.replace(/[^\p{L}\p{N}\s]+/gu, '').replace(/\s+/g, ' ').trim();

              if (cleanText.length > 0) {
                handleWordClick(cleanText.toLowerCase());
              }
            }
          }}
          style={{ 
          fontSize: `${1.3 * fontSizeMultiplier}rem`, 
          lineHeight: '2.2', 
          wordSpacing: '0.1em',
          backgroundColor: 'transparent',
          padding: '2rem 0',
          whiteSpace: 'pre-wrap',
          flex: 1,
          overflowY: 'auto'
        }}>
          {(() => {
            // On ne groupe pas les phrases "connues" pour permettre à l'utilisateur de cliquer sur les mots individuels si besoin.
            // Si la phrase est 'learning' ou 'review', on la groupe.
            const activePhrasesSet = new Set(Object.keys(wordStatuses).filter(k => k.includes(' ') && wordStatuses[k].status !== 'known'));
            if (selectedWord && selectedWord.includes(' ')) {
              activePhrasesSet.add(selectedWord);
            }
            const activePhrases = Array.from(activePhrasesSet).sort((a, b) => b.split(' ').length - a.split(' ').length);
            
            const getSegmentStyle = (startIdx, endIdx) => {
              const startWord = displayedWords[startIdx];
              if (startWord.segmentIndex !== activeSegmentIndex || activeSegmentIndex === -1) {
                return { padding: '0.1rem 0' };
              }

              let hasWordAhead = false;
              for (let k = endIdx + 1; k < displayedWords.length; k++) {
                if (displayedWords[k].segmentIndex === activeSegmentIndex) {
                  if (displayedWords[k].isWord) {
                    hasWordAhead = true;
                    break;
                  }
                } else {
                  break;
                }
              }

              if (!startWord.isWord && !hasWordAhead) {
                return { padding: '0.1rem 0' };
              }

              let style = { backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '0.1rem 0' };
              
              const prevElement = startIdx > 0 ? displayedWords[startIdx - 1] : null;
              if (!prevElement || prevElement.segmentIndex !== activeSegmentIndex) {
                style.borderTopLeftRadius = '6px';
                style.borderBottomLeftRadius = '6px';
              }

              if (!hasWordAhead) {
                style.borderTopRightRadius = '6px';
                style.borderBottomRightRadius = '6px';
              }
              
              return style;
            };

            const renderedElements = [];
            let i = 0;
            
            while (i < displayedWords.length) {
              const currentWord = displayedWords[i];

              if (!currentWord.isWord) {
                renderedElements.push(<span key={currentWord.id} style={getSegmentStyle(i, i)}>{currentWord.original}</span>);
                i++;
                continue;
              }

              let matchedPhrase = null;
              let matchLength = 0;

              for (const phrase of activePhrases) {
                const phraseWords = phrase.split(' ');
                let isMatch = true;
                let tokensConsumed = 0;
                let wordIndex = 0;
                
                for (let j = i; j < displayedWords.length && wordIndex < phraseWords.length; j++) {
                  if (!displayedWords[j].isWord) {
                    tokensConsumed++;
                    continue;
                  }
                  if (displayedWords[j].clean !== phraseWords[wordIndex]) {
                    isMatch = false;
                    break;
                  }
                  wordIndex++;
                  tokensConsumed++;
                }
                
                if (isMatch && wordIndex === phraseWords.length) {
                  let currentTokensConsumed = tokensConsumed;
                  // On inclut la ponctuation finale (non espace) pour l'esthétique du surlignage
                  while (i + currentTokensConsumed < displayedWords.length) {
                    const nextToken = displayedWords[i + currentTokensConsumed];
                    if (!nextToken.isWord && !/^\s+$/.test(nextToken.original)) {
                      currentTokensConsumed++;
                    } else {
                      break;
                    }
                  }
                  
                  if (currentTokensConsumed > matchLength) {
                    matchLength = currentTokensConsumed;
                    matchedPhrase = phrase;
                  }
                }
              }

              if (matchedPhrase) {
                const phraseElements = [];
                for (let j = i; j < i + matchLength; j++) {
                  const subWord = displayedWords[j];
                  if (!subWord.isWord) {
                    phraseElements.push(
                      <React.Fragment key={subWord.id}>
                        {subWord.original}
                      </React.Fragment>
                    );
                  } else {
                    const wordStyle = getWordStyle(subWord.clean);
                    phraseElements.push(
                      <span 
                        key={subWord.id} 
                        onClick={(e) => { e.stopPropagation(); handleWordClick(subWord.clean); }}
                        className="interactive-word"
                        style={{ 
                          cursor: 'pointer', 
                          backgroundColor: wordStyle.backgroundColor,
                          color: wordStyle.color,
                          transition: wordStyle.transition
                        }}
                      >
                        {subWord.original}
                      </span>
                    );
                  }
                }

                renderedElements.push(
                  <span 
                    key={`phrase-${currentWord.id}`} 
                    onClick={() => handleWordClick(matchedPhrase)}
                    className="interactive-phrase"
                    style={{ 
                      ...getWordStyle(matchedPhrase), 
                      cursor: 'pointer',
                      padding: '0.1rem 0',
                      ...getSegmentStyle(i, i + matchLength - 1) // apply active segment background
                    }}
                  >
                    {phraseElements}
                  </span>
                );
                i += matchLength;
                continue;
              } else {
                renderedElements.push(
                  <span 
                    key={currentWord.id} 
                    onClick={() => handleWordClick(currentWord.clean)}
                    className="interactive-word"
                    style={{ 
                      ...getWordStyle(currentWord.clean), 
                      cursor: 'pointer',
                      padding: '0.1rem 0',
                      ...getSegmentStyle(i, i) // apply active segment background
                    }}
                  >
                    {currentWord.original}
                  </span>
                );
                i++;
              }
            }
            return renderedElements;
          })()}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              onClick={() => { setCurrentPage(prev => Math.max(0, prev - 1)); window.scrollTo(0, 0); }}
              disabled={currentPage === 0}
              style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: currentPage === 0 ? 'not-allowed' : 'pointer', opacity: currentPage === 0 ? 0.5 : 1, transition: 'all 0.2s' }}
            >
              {t.prevPage}
            </button>
            <span style={{ color: 'var(--text-secondary)' }}>
              Page {currentPage + 1} / {totalPages}
            </span>
            <button 
              onClick={() => { setCurrentPage(prev => Math.min(totalPages - 1, prev + 1)); window.scrollTo(0, 0); }}
              disabled={currentPage === totalPages - 1}
              style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages - 1 ? 0.5 : 1, transition: 'all 0.2s' }}
            >
              {t.nextPage}
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
