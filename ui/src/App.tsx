import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { MainPage } from './components/MainPage';
import { KnowledgeBase } from './components/KnowledgeBase';
import { KNOWLEDGE_TOPICS } from './data/knowledgeTopics';
import { useTheme } from './ThemeContext';
import {
  Zap, Layers, Radio, Activity, Sun, Moon, Menu, X as XIcon,
} from 'lucide-react';

export default function App() {
  const { isDark, toggle, t } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLive, setIsLive] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: isDark ? t.bg : t.bg, fontFamily: "'Inter', 'Segoe UI', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:.8} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes draculaGlow { 0%,100%{text-shadow:0 0 20px rgba(189,147,249,0.5),0 0 40px rgba(255,121,198,0.2)} 50%{text-shadow:0 0 30px rgba(189,147,249,0.8),0 0 60px rgba(255,121,198,0.4)} }
        @keyframes kaomojiRun { 0%{transform:translateX(-60px)} 100%{transform:translateX(calc(100% + 60px))} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 10px; }
      `}</style>

      {/* HEADER */}
      <div style={{
        background: t.headerBg,
        padding: '20px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: isDark ? '0 4px 30px rgba(40,42,54,0.6)' : '0 4px 30px rgba(102,126,234,0.3)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute',top:-30,right:80,width:120,height:120,borderRadius:'50%',background: isDark ? 'rgba(189,147,249,0.06)' : 'rgba(255,255,255,0.08)' }} />
        <div style={{ position:'absolute',bottom:-20,left:'30%',width:80,height:80,borderRadius:'50%',background: isDark ? 'rgba(255,121,198,0.04)' : 'rgba(255,255,255,0.06)' }} />

        <div style={{ display:'flex', alignItems:'center', gap:14, zIndex:1 }}>
          <button onClick={() => setMenuOpen(v => !v)} style={{
            width: 38, height: 38, borderRadius: 10,
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}>
            {menuOpen ? <XIcon size={18} color="#fff" /> : <Menu size={18} color="#fff" />}
          </button>
          <div style={{
            width:42, height:42, borderRadius:12,
            background: isDark ? 'rgba(189,147,249,0.2)' : 'rgba(255,255,255,0.2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor: 'pointer',
          }} onClick={() => navigate('/')}>
            <Layers size={22} color={isDark ? '#bd93f9' : '#fff'} />
          </div>
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <h1 style={{ margin:0, fontSize:22, fontWeight:900, color: t.headerText, letterSpacing:-0.5,
              ...(isDark ? { animation:'draculaGlow 3s ease infinite' } : { textShadow:'0 2px 10px rgba(0,0,0,0.15)' }) }}>
              Microservice Concepts
            </h1>
            <p style={{ margin:'2px 0 0', fontSize:11, color: t.headerSub, fontWeight:600, letterSpacing:1.5 }}>
              ORCHESTRATION · SAGA · EVENTUAL CONSISTENCY · OUTBOX · INBOX
            </p>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12, zIndex:1 }}>
          {pollingStatus && (
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'6px 14px', borderRadius:20,
              background:'rgba(255,255,255,0.15)', backdropFilter:'blur(10px)',
            }}>
              <Activity size={14} color="#fbbf24" style={{ animation:'blink 1s infinite' }} />
              <span style={{ fontSize:12, color:'#fef3c7', fontWeight:600 }}>{pollingStatus}</span>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)' }}>#{pollingCount}</span>
            </div>
          )}
          {isAnimating && (
            <div style={{ padding:'6px 16px', borderRadius:20,
              background:'rgba(255,255,255,0.2)', backdropFilter:'blur(10px)',
              display:'flex', alignItems:'center', gap:6 }}>
              <Zap size={14} color="#fef08a" style={{ animation:'float 1s ease infinite' }} />
              <span style={{ fontSize:11, fontWeight:700, color:'#fff' }}>RUNNING</span>
            </div>
          )}
          {isLive && !isAnimating && !pollingStatus && (
            <div style={{ padding:'6px 16px', borderRadius:20,
              background:'rgba(74,222,128,0.2)', backdropFilter:'blur(10px)',
              display:'flex', alignItems:'center', gap:6 }}>
              <Radio size={14} color="#4ade80" />
              <span style={{ fontSize:11, fontWeight:700, color:'#4ade80' }}>LIVE</span>
            </div>
          )}
          <button onClick={toggle} style={{
            padding:'8px 16px', borderRadius:20, border:'none',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
            backdropFilter:'blur(10px)', cursor:'pointer',
            display:'flex', alignItems:'center', gap:6, transition:'all 0.2s',
          }}>
            {isDark ? <Sun size={14} color="#f1fa8c" /> : <Moon size={14} color="#fff" />}
            <span style={{ fontSize:11, fontWeight:600, color:'#fff' }}>{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>

      {/* HAMBURGER SIDEBAR */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
          display: 'flex',
        }}>
          <div onClick={() => setMenuOpen(false)} style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          }} />
          <div style={{
            position: 'relative', width: 320, height: '100vh', overflowY: 'auto',
            background: isDark ? '#282a36' : '#fff',
            borderRight: `1px solid ${t.border}`,
            boxShadow: '4px 0 30px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ padding: '20px 20px 12px', borderBottom: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: t.accent }}>Knowledge Base</span>
                <button onClick={() => setMenuOpen(false)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                }}>
                  <XIcon size={16} color={t.textMuted} />
                </button>
              </div>
              <p style={{ fontSize: 11, color: t.textMuted, margin: '6px 0 0' }}>
                Senior-level deep dive vào từng concept
              </p>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {KNOWLEDGE_TOPICS.map(topic => {
                const Icon = topic.icon;
                return (
                  <button key={topic.id} onClick={() => {
                    navigate(`/knowledge/${topic.id}`);
                    setMenuOpen(false);
                  }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', marginBottom: 2, borderRadius: 12,
                    background: 'transparent',
                    border: '1px solid transparent',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 9,
                      background: `${topic.color}12`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={16} color={topic.color} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 13, color: t.text }}>{topic.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ROUTES */}
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/knowledge/:topicId" element={<KnowledgeBase />} />
      </Routes>
    </div>
  );
}
