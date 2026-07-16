import React from 'react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function VocabularyStats({
  t,
  vocabStats,
  wordStatuses,
  vocabFilter,
  setVocabFilter,
  statsPeriod,
  setStatsPeriod,
  showKnown,
  setShowKnown,
  showLearning,
  setShowLearning,
  showUnknown,
  setShowUnknown,
  isCumulative,
  setIsCumulative,
  getWordStyle
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>{t.myVocabulary}</h3>
      </div>
      
      {Object.keys(wordStatuses).length === 0 ? (
        <p style={{ opacity: 0.7, textAlign: 'center', padding: '2rem 0' }}>{t.noWords}</p>
      ) : (
        <div>
          {/* Section Statistiques d'Apprentissage */}
          {vocabStats && (
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{t.progressTitle}</h4>
                <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'rgba(15, 23, 42, 0.4)', padding: '0.2rem', borderRadius: '8px' }}>
                  <button onClick={() => setStatsPeriod('today')} style={{ background: statsPeriod === 'today' ? 'var(--word-known)' : 'transparent', color: statsPeriod === 'today' ? 'white' : 'gray', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t.today}</button>
                  <button onClick={() => setStatsPeriod('week')} style={{ background: statsPeriod === 'week' ? 'var(--word-known)' : 'transparent', color: statsPeriod === 'week' ? 'white' : 'gray', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t.sevenDays}</button>
                  <button onClick={() => setStatsPeriod('month')} style={{ background: statsPeriod === 'month' ? 'var(--word-known)' : 'transparent', color: statsPeriod === 'month' ? 'white' : 'gray', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t.thirtyDays}</button>
                  <button onClick={() => setStatsPeriod('year')} style={{ background: statsPeriod === 'year' ? 'var(--word-known)' : 'transparent', color: statsPeriod === 'year' ? 'white' : 'gray', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t.oneYear}</button>
                </div>
              </div>
              {(() => {
                const days = vocabStats.chartData.length || 1;
                const totalPeriodKnown = vocabStats.chartData.reduce((acc, curr) => acc + curr.knownCount, 0);
                const avgDaily = Math.round(totalPeriodKnown / days);
                const bestDay = Math.max(0, ...vocabStats.chartData.map(d => d.knownCount));

                return (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '1rem',
                    marginBottom: '1.5rem' 
                  }}>
                    <div style={{ padding: '1.5rem', backgroundColor: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--glass-border)', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--word-known)' }}>{vocabStats.todayKnown}</div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>{t.wordsToday}</div>
                    </div>
                    <div style={{ padding: '1.5rem', backgroundColor: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--glass-border)', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--word-known)' }}>{avgDaily}</div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>{t.avgPerDay}</div>
                    </div>
                    <div style={{ padding: '1.5rem', backgroundColor: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--glass-border)', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--word-known)' }}>{bestDay}</div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>{t.recordPeriod}</div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ height: '300px', backgroundColor: 'rgba(15, 23, 42, 0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--word-known)', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input type="checkbox" checked={showKnown} onChange={e => setShowKnown(e.target.checked)} />
                    {t.known}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--word-learning)', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input type="checkbox" checked={showLearning} onChange={e => setShowLearning(e.target.checked)} />
                    {t.learning}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--word-unknown)', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input type="checkbox" checked={showUnknown} onChange={e => setShowUnknown(e.target.checked)} />
                    {t.review}
                  </label>
                  <div style={{ width: '1px', backgroundColor: 'var(--glass-border)', margin: '0 0.5rem' }}></div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input type="checkbox" checked={isCumulative} onChange={e => setIsCumulative(e.target.checked)} />
                    {t.cumulative}
                  </label>
                </div>
                <div style={{ flex: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vocabStats.chartData}>
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', color: 'white' }}
                      />
                      {showKnown && <Line name={t.known} type="monotone" dataKey={isCumulative ? "cumKnownCount" : "knownCount"} stroke="var(--word-known)" strokeWidth={3} dot={{ fill: 'var(--word-known)', r: 4 }} />}
                      {showLearning && <Line name={t.learning} type="monotone" dataKey={isCumulative ? "cumLearningCount" : "learningCount"} stroke="var(--word-learning)" strokeWidth={3} dot={{ fill: 'var(--word-learning)', r: 4 }} />}
                      {showUnknown && <Line name={t.review} type="monotone" dataKey={isCumulative ? "cumUnknownCount" : "unknownCount"} stroke="var(--word-unknown)" strokeWidth={3} dot={{ fill: 'var(--word-unknown)', r: 4 }} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>{t.personalDict}</h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '1rem',
            marginBottom: '1.5rem' 
          }}>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--word-known)', borderRadius: '8px', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--word-known)' }}>{t.known}</h4>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{Object.values(wordStatuses).filter(d => d.status === 'known').length}</span>
            </div>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--word-learning)', borderRadius: '8px', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--word-learning)' }}>{t.learning}</h4>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{Object.values(wordStatuses).filter(d => d.status === 'learning').length}</span>
            </div>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#ef4444' }}>{t.review}</h4>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{Object.values(wordStatuses).filter(d => d.status === 'review').length}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            <button onClick={() => setVocabFilter('all')} style={{ background: 'none', border: 'none', color: vocabFilter === 'all' ? 'white' : 'gray', fontWeight: vocabFilter === 'all' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '1.1rem', padding: 0 }}>{t.all}</button>
            <button onClick={() => setVocabFilter('known')} style={{ background: 'none', border: 'none', color: vocabFilter === 'known' ? 'var(--word-known)' : 'gray', fontWeight: vocabFilter === 'known' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '1.1rem', padding: 0 }}>{t.known}</button>
            <button onClick={() => setVocabFilter('learning')} style={{ background: 'none', border: 'none', color: vocabFilter === 'learning' ? 'var(--word-learning)' : 'gray', fontWeight: vocabFilter === 'learning' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '1.1rem', padding: 0 }}>{t.learning}</button>
            <button onClick={() => setVocabFilter('review')} style={{ background: 'none', border: 'none', color: vocabFilter === 'review' ? '#ef4444' : 'gray', fontWeight: vocabFilter === 'review' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '1.1rem', padding: 0 }}>{t.review}</button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {Object.entries(wordStatuses)
              .filter(([_, data]) => vocabFilter === 'all' || data.status === vocabFilter)
              .map(([word, data]) => {
                let badgeStyle = { ...getWordStyle(word) };
                if (data.status === 'known') {
                  badgeStyle = { color: 'white', backgroundColor: 'rgba(16, 185, 129, 0.5)' };
                }
                return (
                  <span key={word} style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    ...badgeStyle,
                    border: '1px solid currentColor'
                  }}>
                    {word} {data.translation ? `- ${data.translation}` : ''}
                  </span>
                );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
