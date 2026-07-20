import React, { useState, useRef } from 'react';
import YouTube from 'react-youtube';
import DictionarySidebar from './DictionarySidebar';

export default function CinemaView({
  t,
  textTitle,
  youtubeUrl,
  words,
  setCurrentView,
  handleWordClick,
  getWordStyle,
  textSegments,
  wordStatuses,
  selectedWord,
  setSelectedWord,
  playAudio,
  isTranslating,
  translationText,
  setTranslationText,
  notesText,
  setNotesText,
  handleStatusChange,
  audioSpeed,
  setAudioSpeed,
  uiLang,
  handleWordEdit,
  improveTranslationWithDeepL
}) {
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const playerRef = useRef(null);

  const formatTime = (seconds) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const extractVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const videoId = extractVideoId(youtubeUrl);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setCurrentAudioTime(playerRef.current.getCurrentTime());
        if (playerRef.current.getDuration) {
          setVideoDuration(playerRef.current.getDuration());
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1, 
      rel: 0,      
      modestbranding: 1, 
    },
  };

  // We find the active segment based on the ReactPlayer's current time
  let activeSegmentIndex = -1;
  if (textSegments && currentAudioTime > 0) {
    activeSegmentIndex = textSegments.findIndex(seg => {
      // Whisper output offsets in ms, ReactPlayer gives seconds
      const currentTimeMs = currentAudioTime * 1000;
      return currentTimeMs >= seg.offsets.from && currentTimeMs <= seg.offsets.to;
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', gap: '1.5rem' }}>
      {/* LEFT COLUMN: Header + Video + Dictionary */}
      <div style={{ width: '450px', display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0, height: '100%' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
          <button 
            className="btn" 
            onClick={() => setCurrentView('library')}
            style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.5rem 1rem' }}
          >
            {t.returnBtn}
          </button>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            🎬 {textTitle}
          </h2>
        </div>

        {/* Video Player Section */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '12px', flexShrink: 0, paddingBottom: '1rem' }}>
        <div style={{ color: 'gray', fontSize: '0.8rem', padding: '0.5rem' }}>Debug URL: "{youtubeUrl}" (ID: {videoId})</div>
        {videoId ? (
          <div style={{ width: '100%', maxWidth: '800px', aspectRatio: '16/9' }}>
            <YouTube 
              videoId={videoId} 
              opts={opts} 
              onReady={(e) => { playerRef.current = e.target; }} 
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', color: 'white' }}>
            Aucune URL vidéo reçue.
          </div>
        )}

        {/* Custom Controls */}
        {videoId && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '800px', gap: '0.5rem', marginTop: '0.5rem' }}>
            {/* Progress Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', minWidth: '40px', textAlign: 'right' }}>{formatTime(currentAudioTime)}</span>
              <input 
                type="range" 
                min={0} 
                max={videoDuration || 100} 
                value={currentAudioTime} 
                onChange={(e) => {
                  const newTime = parseFloat(e.target.value);
                  setCurrentAudioTime(newTime);
                  if(playerRef.current?.seekTo) playerRef.current.seekTo(newTime, true);
                }}
                style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', minWidth: '40px' }}>{formatTime(videoDuration)}</span>
            </div>
            
            {/* Playback Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'transparent' }}>
              <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '1rem', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '20px' }} onClick={() => { if(playerRef.current?.getCurrentTime) playerRef.current.seekTo(playerRef.current.getCurrentTime() - 5, true) }}>⏪ -5s</button>
              <button className="btn" style={{ padding: '0.5rem 1.5rem', fontSize: '1rem', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '20px' }} onClick={() => { 
                if(playerRef.current) {
                  isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
                }
              }}>
                {isPlaying ? '⏸ Pause' : '▶️ Lecture'}
              </button>
              <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '1rem', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '20px' }} onClick={() => { if(playerRef.current?.getCurrentTime) playerRef.current.seekTo(playerRef.current.getCurrentTime() + 5, true) }}>+5s ⏩</button>
            </div>
          </div>
        )}
        </div>
        
        {/* Dictionary Section */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'rgba(20,20,20,0.6)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <DictionarySidebar 
            t={t} selectedWord={selectedWord} setSelectedWord={setSelectedWord} playAudio={playAudio} isTranslating={isTranslating} translationText={translationText} setTranslationText={setTranslationText} notesText={notesText} setNotesText={setNotesText} handleStatusChange={handleStatusChange} wordStatuses={wordStatuses} audioSpeed={audioSpeed} setAudioSpeed={setAudioSpeed} uiLang={uiLang} handleWordEdit={handleWordEdit} improveTranslationWithDeepL={improveTranslationWithDeepL}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Transcription Section */}
      <div 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1.5rem',
          fontSize: '1.3rem', 
          lineHeight: '2.2', 
          whiteSpace: 'pre-wrap',
          color: 'var(--text-primary)',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '12px',
          border: '1px solid var(--glass-border)'
        }}
      >
        {(() => {
          const activePhrasesSet = new Set(Object.keys(wordStatuses).filter(k => k.includes(' ') && wordStatuses[k].status !== 'known'));
          if (selectedWord && selectedWord.includes(' ')) {
            activePhrasesSet.add(selectedWord);
          }
          const activePhrases = Array.from(activePhrasesSet).sort((a, b) => b.split(' ').length - a.split(' ').length);
          
          const getSegmentStyle = (startIdx, endIdx) => {
            const startWord = words[startIdx];
            if (startWord.segmentIndex !== activeSegmentIndex || activeSegmentIndex === -1) {
              return { padding: '0.1rem 0' };
            }
            // Highlight the active segment exactly like in ReadingView
            return { backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '0.1rem 0', borderRadius: '4px' };
          };

          const renderedElements = [];
          let i = 0;
          
          while (i < words.length) {
            const currentWord = words[i];

            if (!currentWord.isWord) {
              renderedElements.push(<span key={currentWord.id} style={getSegmentStyle(i, i)}>{currentWord.original}</span>);
              i++;
              continue;
            }

            // Simple rendering without complex phrase matching for this initial skeleton
            // You can easily paste the full phrase logic from ReadingView here later
            renderedElements.push(
              <span 
                key={currentWord.id} 
                onClick={() => handleWordClick(currentWord.clean)}
                className="interactive-word"
                style={{ 
                  ...getWordStyle(currentWord.clean), 
                  cursor: 'pointer',
                  padding: '0.1rem 0',
                  ...getSegmentStyle(i, i)
                }}
              >
                {currentWord.original}
              </span>
            );
            i++;
          }
          return renderedElements;
        })()}
      </div>
    </div>
  );
}
