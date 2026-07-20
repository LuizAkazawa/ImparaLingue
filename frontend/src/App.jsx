import { useState, useEffect, useRef } from 'react'
import './index.css'
import { translations } from './i18n'

import Header from './components/Header'
import LanguageSelector from './components/LanguageSelector'
import VocabularyStats from './components/VocabularyStats'
import LibraryView from './components/LibraryView'
import ImportView from './components/ImportView'
import ReadingView from './components/ReadingView'
import DictionarySidebar from './components/DictionarySidebar'
import CinemaView from './components/CinemaView'

const CURRENT_USER_ID = "test_user_1";

function App() {
  const [currentView, setCurrentView] = useState('library') // 'library', 'import', 'reading'
  const [libraryTab, setLibraryTab] = useState('unread') // 'unread', 'read'
  const [vocabFilter, setVocabFilter] = useState('all') // 'all', 'known', 'learning', 'unknown'
  const [inputText, setInputText] = useState('')
  const [textTitle, setTextTitle] = useState('')
  const [currentTextId, setCurrentTextId] = useState(null)
  const [youtubeAudioUrl, setYoutubeAudioUrl] = useState(null)
  const [words, setWords] = useState([])
  const [wordStatuses, setWordStatuses] = useState({})
  const [savedTexts, setSavedTexts] = useState([])
  const [vocabStats, setVocabStats] = useState(null)
  const [statsPeriod, setStatsPeriod] = useState('week') // 'today', 'week', 'month', 'year'
  
  const [currentLang, setCurrentLang] = useState('en')
  const [uiLang, setUiLang] = useState('fr')
  const t = translations[uiLang] || translations['fr'];

  // États pour le panneau latéral (Dictionnaire)
  const [selectedWord, setSelectedWord] = useState(null)
  const [translationText, setTranslationText] = useState('')
  const [notesText, setNotesText] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [audioSpeed, setAudioSpeed] = useState(1.0)

  // États pour les filtres du graphique
  const [showKnown, setShowKnown] = useState(true)
  const [showLearning, setShowLearning] = useState(true)
  const [showUnknown, setShowUnknown] = useState(true)
  const [isCumulative, setIsCumulative] = useState(true)

  const audioRef = useRef(null)
  const selectedWordRef = useRef(null);
  useEffect(() => {
    selectedWordRef.current = selectedWord;
  }, [selectedWord]);

  const loadWordData = async (word, statusesToUse) => {
    let wordData = statusesToUse[word];
    setNotesText((wordData && wordData.notes) || '');

    if (wordData && wordData.translation) {
      setTranslationText(wordData.translation);
      setIsTranslating(false);
    } else {
      setTranslationText('');
      setIsTranslating(true);
      try {
        let targetLang = uiLang;
        if (currentLang === targetLang) {
          targetLang = targetLang === 'en' ? 'fr' : 'en';
        }
        
        const res = await fetch(`http://localhost:8080/api/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: word,
            source_lang: currentLang,
            target_lang: targetLang
          })
        });
        const data = await res.json();
        
        // Anti-concurrence: si l'utilisateur a cliqué sur un autre mot pendant le fetch, on ignore ce résultat
        if (selectedWordRef.current !== word) return;
        
        if (data && data.translation) {
          setTranslationText(data.translation);
        } else {
          setTranslationText("Définition introuvable");
        }
      } catch (err) {
        if (selectedWordRef.current !== word) return;
        console.error("API error", err);
      } finally {
        if (selectedWordRef.current === word) {
          setIsTranslating(false);
        }
      }
    }
  };

  // Au chargement de l'application, on récupère le vocabulaire depuis le backend Go
  useEffect(() => {
    fetch(`http://localhost:8080/api/words?user_id=${CURRENT_USER_ID}&language=${currentLang}&target_lang=${uiLang}`)
      .then(res => res.json())
      .then(data => {
        const newStatuses = data || {};
        setWordStatuses(newStatuses);
        
        // Si on a changé la langue d'interface et qu'un mot est sélectionné, on recharge sa définition
        if (selectedWordRef.current) {
          loadWordData(selectedWordRef.current, newStatuses);
        }
      })
      .catch(err => console.error("Erreur de connexion au backend. Le serveur Go est-il lancé ?", err));
  }, [currentLang, uiLang]);

  // On récupère la liste des textes quand on est sur la bibliothèque
  useEffect(() => {
    if (currentView === 'library') {
      fetch(`http://localhost:8080/api/texts?user_id=${CURRENT_USER_ID}&language=${currentLang}`)
        .then(res => res.json())
        .then(data => setSavedTexts(data || []))
        .catch(err => console.error(err));
    } else if (currentView === 'vocabulary') {
      fetch(`http://localhost:8080/api/stats?period=${statsPeriod}&user_id=${CURRENT_USER_ID}&language=${currentLang}`)
        .then(res => res.json())
        .then(data => setVocabStats(data))
        .catch(err => console.error(err));
    }
  }, [currentView, statsPeriod, currentLang]);
  const [textSegments, setTextSegments] = useState(null);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);

  const startReadingContent = (id, title, content, audioUrl = null, segmentsJson = null) => {
    setCurrentTextId(id);
    let parsedSegments = null;
    if (segmentsJson) {
      try {
        parsedSegments = typeof segmentsJson === 'string' ? JSON.parse(segmentsJson) : segmentsJson;
      } catch (e) {
        console.error("Error parsing segments JSON:", e);
      }
    }

    let segmentStartOffsets = [];
    if (parsedSegments) {
       let currentOffset = 0;
       for (let i = 0; i < parsedSegments.length; i++) {
          segmentStartOffsets.push(currentOffset);
          currentOffset += parsedSegments[i].text.length + 1; // +1 for the joined space
       }
    }

    let charOffset = 0;
    const tokens = content.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*|[^\p{L}\p{N}\s]+|\s+/gu) || [];
    const processedWords = tokens.map((token, index) => {
      const isWord = /^[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*$/u.test(token);
      
      let segIdx = -1;
      if (parsedSegments) {
        for (let i = segmentStartOffsets.length - 1; i >= 0; i--) {
           if (charOffset >= segmentStartOffsets[i]) {
              segIdx = i;
              break;
           }
        }
      }

      charOffset += token.length;

      return { 
        id: index, 
        original: token, 
        clean: isWord ? token.toLowerCase() : null,
        isWord: isWord,
        segmentIndex: segIdx
      };
    });

    setTextTitle(title);
    setInputText(content);
    setWords(processedWords);
    setYoutubeAudioUrl(audioUrl);
    setTextSegments(segmentsJson ? JSON.parse(segmentsJson) : null);
    
    if (audioUrl && (audioUrl.includes('youtube.com') || audioUrl.includes('youtu.be'))) {
      setCurrentView('cinema');
    } else {
      setCurrentView('reading');
    }
  };

  const saveTextToLibrary = async (title, content, audioUrl = '', segmentsJson = '') => {
    try {
      const res = await fetch('http://localhost:8080/api/texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: CURRENT_USER_ID,
          language: currentLang,
          title: title, 
          content: content,
          audio_url: audioUrl,
          segments_json: segmentsJson
        })
      });
      const data = await res.json();
      return data.id;
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du texte :", err);
      return null;
    }
  };

  const handleStartImport = async () => {
    if (!inputText.trim() || !textTitle.trim()) {
      alert(t.alertMissing);
      return;
    }

    // Sauvegarde du texte en base de données
    const newId = await saveTextToLibrary(textTitle.trim(), inputText.trim());
    if (newId) {
      startReadingContent(newId, textTitle.trim(), inputText.trim());
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8080/api/extract", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorText = await res.text();
        alert("Error: " + errorText);
        return;
      }
      const data = await res.json();
      setTextTitle(data.title);
      setInputText(data.text);
    } catch (err) {
      console.error(err);
      alert(t.alertErrorExtract);
    }
  };

  const toggleTextStatus = async (e, text) => {
    e.stopPropagation(); // Évite de déclencher la lecture du texte
    const newStatus = text.status === 'read' ? 'unread' : 'read';
    try {
      await fetch("http://localhost:8080/api/texts/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: text.id, 
          user_id: CURRENT_USER_ID,
          language: currentLang,
          status: newStatus 
        }),
      });
      // Met à jour l'interface localement
      setSavedTexts(prev => prev.map(t => t.id === text.id ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error("Erreur de mise à jour du statut :", err);
    }
  };

  const deleteText = async (e, textId) => {
    e.stopPropagation();
    if (!window.confirm("Voulez-vous vraiment supprimer ce texte ?")) return;
    try {
      await fetch(`http://localhost:8080/api/texts?id=${textId}`, {
        method: 'DELETE'
      });
      setSavedTexts(prev => prev.filter(t => t.id !== textId));
    } catch (err) {
      console.error(err);
    }
  };

  const updateTextTitle = async (textId, newTitle) => {
    try {
      await fetch(`http://localhost:8080/api/texts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: textId, title: newTitle })
      });
      setSavedTexts(prev => prev.map(t => t.id === textId ? { ...t, title: newTitle } : t));
      
      // Update textTitle state if the currently open text is the one being edited
      if (currentView === 'reading' && textTitle === savedTexts.find(t => t.id === textId)?.title) {
        setTextTitle(newTitle);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateTextContent = async (textId, newContent) => {
    try {
      await fetch(`http://localhost:8080/api/texts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: textId, 
          title: textTitle, 
          content: newContent,
          segments_json: textSegments ? JSON.stringify(textSegments) : ""
        })
      });
      setInputText(newContent);
      setSavedTexts(prev => prev.map(t => t.id === textId ? { ...t, content: newContent } : t));
      startReadingContent(textId, textTitle, newContent, youtubeAudioUrl, textSegments ? JSON.stringify(textSegments) : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWordEdit = async (oldWord, newWord) => {
    if (!oldWord || !newWord || oldWord === newWord || !currentTextId) return;

    // Use negative lookbehind/lookahead to replace exact word boundaries (even with accents/apostrophes)
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(oldWord)}(?![\\p{L}\\p{N}])`, 'giu');
    
    const newContent = inputText.replace(regex, newWord);

    let newSegmentsStr = null;
    let newSegments = null;
    if (textSegments) {
      newSegments = textSegments.map(seg => ({
        ...seg,
        text: seg.text.replace(regex, newWord)
      }));
      newSegmentsStr = JSON.stringify(newSegments);
    }

    try {
      await fetch(`http://localhost:8080/api/texts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: currentTextId, 
          title: textTitle, 
          content: newContent,
          segments_json: newSegmentsStr || ""
        })
      });

      setInputText(newContent);
      setSavedTexts(prev => prev.map(t => t.id === currentTextId ? { ...t, content: newContent, segments_json: newSegmentsStr || "" } : t));
      
      // Update the tokens map and segments without changing the view
      startReadingContent(currentTextId, textTitle, newContent, youtubeAudioUrl, newSegmentsStr || (textSegments ? JSON.stringify(textSegments) : null));
      setSelectedWord(null);
    } catch (err) {
      console.error("Erreur de mise à jour du texte :", err);
    }
  };

  const handleWordClick = async (cleanWord) => {
    if (!cleanWord) return;
    setSelectedWord(cleanWord);
    selectedWordRef.current = cleanWord; // Update synchronously to prevent fetch race conditions
    
    const updatedStatuses = { ...wordStatuses };
    
    // Nettoyage des phrases temporaires (inconnues) quand on clique sur un mot
    Object.keys(updatedStatuses).forEach(k => {
      if (k.includes(' ') && updatedStatuses[k].status === 'unknown' && k !== cleanWord) {
        delete updatedStatuses[k];
      }
    });

    let wordData = updatedStatuses[cleanWord];
    
    // Auto-classification: si le mot est nouveau (undefined) ou inconnu
    if (!wordData || wordData.status === 'unknown') {
      if (!cleanWord.includes(' ')) {
        // Un seul mot : il passe 'En apprentissage' automatiquement
        wordData = { status: 'learning', translation: wordData ? wordData.translation : '', notes: wordData ? wordData.notes : '' };
        updatedStatuses[cleanWord] = wordData;

        fetch('http://localhost:8080/api/words', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            user_id: CURRENT_USER_ID,
            language: currentLang,
            word: cleanWord, 
            status: 'learning',
            translation: wordData.translation,
            notes: wordData.notes,
            target_lang: uiLang
          })
        }).catch(err => console.error("Erreur auto-save:", err));
      } else {
        // Plusieurs mots : on initialise en mémoire pour le dictionnaire, mais ON NE SAUVEGARDE PAS
        wordData = { status: 'unknown', translation: wordData ? wordData.translation : '', notes: wordData ? wordData.notes : '' };
        updatedStatuses[cleanWord] = wordData;
      }
    }
    
    setWordStatuses(updatedStatuses);
    // On charge la définition via Google ou la base de données
    loadWordData(cleanWord, updatedStatuses);
  };

  const handleStatusChange = async (newStatus, overrideTranslation = null, overrideNotes = null) => {
    if (!selectedWord) return;
    
    const currentTrans = overrideTranslation !== null ? overrideTranslation : translationText;
    const currentNotes = overrideNotes !== null ? overrideNotes : notesText;

    const updates = {};
    updates[selectedWord] = { status: newStatus, translation: currentTrans, notes: currentNotes };

    // Si on marque une phrase entière comme connue, on valide aussi les mots inconnus qui la composent
    if (newStatus === 'known' && selectedWord.includes(' ')) {
      const subWords = selectedWord.split(' ');
      for (const subWord of subWords) {
        const existingStatus = wordStatuses[subWord]?.status;
        if (!existingStatus || existingStatus === 'unknown') {
          updates[subWord] = { status: 'known', translation: '', notes: '' };
        }
      }
    }

    setWordStatuses(prev => ({ 
      ...prev, 
      ...updates
    }));

    for (const [word, data] of Object.entries(updates)) {
      try {
        await fetch('http://localhost:8080/api/words', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            user_id: CURRENT_USER_ID,
            language: currentLang,
            word: word, 
            status: data.status,
            translation: data.translation,
            notes: data.notes,
            target_lang: uiLang
          })
        });
      } catch (err) {
      }
    }
  }

  const improveTranslationWithDeepL = async () => {
    if (!selectedWord) return;
    setIsTranslating(true);
    try {
      let targetLang = uiLang;
      if (currentLang === targetLang) {
        targetLang = targetLang === 'en' ? 'fr' : 'en';
      }
      const res = await fetch(`http://localhost:8080/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedWord,
          source_lang: currentLang,
          target_lang: targetLang,
          provider: 'deepl'
        })
      });
      const data = await res.json();
      if (data && data.translation) {
        setTranslationText(data.translation);
        // Sauvegarde immédiate de la traduction améliorée
        const currentStatus = wordStatuses[selectedWord]?.status || 'unknown';
        handleStatusChange(currentStatus, data.translation, notesText);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };
  
  const playAudio = (word) => {
    // On utilise maintenant notre propre serveur Go (Proxy) pour télécharger et renvoyer le MP3.
    // Cela contourne totalement le blocage de sécurité (CORS) du navigateur.
    const url = `http://localhost:8080/api/audio?word=${encodeURIComponent(word)}&lang=${currentLang}`;
    const audio = new Audio(url);
    audio.playbackRate = audioSpeed;
    audio.play().catch(err => {
      console.error("Erreur de lecture audio :", err);
      // Fallback sur la voix native si Google bloque
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = currentLang;
      utterance.rate = audioSpeed;
      window.speechSynthesis.speak(utterance);
    });
  }

  const skipAudio = (seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const getWordStyle = (cleanWord) => {
    const isSelected = selectedWord === cleanWord;
    const status = wordStatuses[cleanWord]?.status || 'unknown'; 
    const isPhrase = cleanWord.includes(' ');
    
    // Le style de base du mot
    let style = { 
      color: 'inherit', 
      backgroundColor: 'transparent',
      transition: 'all 0.2s' 
    };

    switch (status) {
      case 'known': 
        style.borderBottom = isSelected ? '2px solid white' : '2px solid transparent';
        break;
      case 'learning': 
        style.borderBottom = isSelected ? '2px solid white' : '2px solid #f59e0b';
        if (isPhrase) style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
        break;
      case 'review': 
        style.borderBottom = isSelected ? '2px solid white' : '2px dashed #ef4444';
        if (isPhrase) style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
        break;
      case 'unknown': 
      default: 
        style.borderBottom = isSelected ? '2px solid white' : '2px dotted #3b82f6';
        if (isPhrase) style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
        break;
    }

    if (isPhrase) {
      style.borderRadius = '6px';
    }
    
    // On surcharge le background si l'élément est activement sélectionné
    if (isSelected) {
      style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
    }
    
    return style;
  }

  return (
    <div className="main-app-container">
      
      {/* LEFT PANE - Full height, scrolling */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem 3rem', overflowY: 'auto' }}>
      <Header 
        t={t} 
        uiLang={uiLang} 
        setUiLang={setUiLang} 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
      />

      {currentView !== 'reading' && (
        <LanguageSelector 
          t={t}
          currentLang={currentLang}
          setCurrentLang={setCurrentLang}
          currentView={currentView}
          setCurrentView={setCurrentView}
          setTextTitle={setTextTitle}
          setInputText={setInputText}
          setWords={setWords}
          setSelectedWord={setSelectedWord}
        />
      )}
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentView === 'vocabulary' && (
          <VocabularyStats 
            t={t}
            vocabStats={vocabStats}
            wordStatuses={wordStatuses}
            vocabFilter={vocabFilter}
            setVocabFilter={setVocabFilter}
            statsPeriod={statsPeriod}
            setStatsPeriod={setStatsPeriod}
            showKnown={showKnown}
            setShowKnown={setShowKnown}
            showLearning={showLearning}
            setShowLearning={setShowLearning}
            showUnknown={showUnknown}
            setShowUnknown={setShowUnknown}
            isCumulative={isCumulative}
            setIsCumulative={setIsCumulative}
            getWordStyle={getWordStyle}
          />
        )}

        {currentView === 'library' && (
          <LibraryView 
            t={t}
            libraryTab={libraryTab}
            setLibraryTab={setLibraryTab}
            savedTexts={savedTexts}
            setCurrentView={setCurrentView}
            setTextTitle={setTextTitle}
            setInputText={setInputText}
            startReadingContent={startReadingContent}
            toggleTextStatus={toggleTextStatus}
            deleteText={deleteText}
            updateTextTitle={updateTextTitle}
          />
        )}

        {currentView === 'import' && (
          <ImportView 
            t={t}
            textTitle={textTitle}
            setTextTitle={setTextTitle}
            inputText={inputText}
            setInputText={setInputText}
            handleFileUpload={handleFileUpload}
            handleStartImport={handleStartImport}
            setCurrentView={setCurrentView}
            startReadingContent={startReadingContent}
            saveTextToLibrary={saveTextToLibrary}
          />
        )}

        {currentView === 'cinema' && (
          <CinemaView 
            t={t}
            textTitle={textTitle}
            youtubeUrl={youtubeAudioUrl}
            words={words}
            setCurrentView={setCurrentView}
            handleWordClick={handleWordClick}
            getWordStyle={getWordStyle}
            textSegments={textSegments}
            wordStatuses={wordStatuses}
            selectedWord={selectedWord}
            setSelectedWord={setSelectedWord}
            playAudio={playAudio}
            isTranslating={isTranslating}
            translationText={translationText}
            setTranslationText={setTranslationText}
            notesText={notesText}
            setNotesText={setNotesText}
            handleStatusChange={handleStatusChange}
            audioSpeed={audioSpeed}
            setAudioSpeed={setAudioSpeed}
            uiLang={uiLang}
            handleWordEdit={handleWordEdit}
            improveTranslationWithDeepL={improveTranslationWithDeepL}
          />
        )}

        {currentView === 'reading' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {youtubeAudioUrl && (
              <div style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: 'rgba(20, 20, 20, 0.8)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t.videoAudio}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button onClick={() => skipAudio(-5)} style={{ background: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '50%', minWidth: '45px', height: '45px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'transform 0.1s' }} onMouseDown={e => e.target.style.transform = 'scale(0.90)'} onMouseUp={e => e.target.style.transform = 'scale(1)'} onMouseLeave={e => e.target.style.transform = 'scale(1)'} title="- 5 secondes">-5s</button>
                  
                  <audio 
                    ref={audioRef}
                    controls 
                    src={youtubeAudioUrl} 
                    style={{ flex: 1, borderRadius: '30px' }} 
                    onTimeUpdate={(e) => setCurrentAudioTime(e.target.currentTime * 1000)} // Convert to milliseconds
                  />

                  <button onClick={() => skipAudio(5)} style={{ background: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '50%', minWidth: '45px', height: '45px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'transform 0.1s' }} onMouseDown={e => e.target.style.transform = 'scale(0.90)'} onMouseUp={e => e.target.style.transform = 'scale(1)'} onMouseLeave={e => e.target.style.transform = 'scale(1)'} title="+ 5 secondes">+5s</button>
                </div>
              </div>
            )}
            <ReadingView 
              t={t}
              textTitle={textTitle}
              inputText={inputText}
              currentTextId={currentTextId}
              updateTextContent={updateTextContent}
              words={words}
              textSegments={textSegments}
              currentAudioTime={currentAudioTime}
              setCurrentView={setCurrentView}
              handleWordClick={handleWordClick}
              getWordStyle={getWordStyle}
              youtubeAudioUrl={youtubeAudioUrl}
              selectedWord={selectedWord}
              setSelectedWord={setSelectedWord}
              playAudio={playAudio}
              isTranslating={isTranslating}
              translationText={translationText}
              setTranslationText={setTranslationText}
              handleStatusChange={handleStatusChange}
              wordStatuses={wordStatuses}
              audioSpeed={audioSpeed}
              setAudioSpeed={setAudioSpeed}
            />
          </div>
        )}
      </div>
      </div>

      {/* RIGHT PANE - Full height Dictionary Sidebar */}
      {currentView === 'reading' && (
        <div className="dictionary-sidebar">
          <DictionarySidebar 
            t={t}
            selectedWord={selectedWord}
            setSelectedWord={setSelectedWord}
            playAudio={playAudio}
            isTranslating={isTranslating}
            translationText={translationText}
            setTranslationText={setTranslationText}
            notesText={notesText}
            setNotesText={setNotesText}
            handleStatusChange={handleStatusChange}
            wordStatuses={wordStatuses}
            audioSpeed={audioSpeed}
            setAudioSpeed={setAudioSpeed}
            uiLang={uiLang}
            handleWordEdit={handleWordEdit}
            improveTranslationWithDeepL={improveTranslationWithDeepL}
          />
        </div>
      )}

    </div>
  )
}

export default App
