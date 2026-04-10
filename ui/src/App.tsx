import { useState, useCallback, useRef, useEffect } from 'react';
import { FlowDiagram } from './components/FlowDiagram';
import { ServiceMonitor } from './components/ServiceMonitor';
import { ConceptLegend } from './components/ConceptLegend';
import { ConceptTheory } from './components/ConceptTheory';
import { KnowledgeBase } from './components/KnowledgeBase';
import { KNOWLEDGE_TOPICS } from './data/knowledgeTopics';
import { HAPPY_PATH_STEPS, FAILURE_PATH_STEPS, STOCK_FAIL_STEPS } from './services/flowSteps';
import * as api from './services/api';
import { Product, OrderResult, Payment, StockReservation, FlowStep } from './types';
import { useTheme } from './ThemeContext';
import {
  Zap, CheckCircle2, XCircle, AlertTriangle, Play, Layers,
  BookOpen, Radio, Activity, Terminal, Sun, Moon, GraduationCap,
  Menu, X as XIcon, ArrowLeft,
} from 'lucide-react';

type ActiveTab = 'scenario' | 'theory';

const SAMPLE_ITEMS = [
  { productId: '11111111-1111-1111-1111-111111111111', productName: 'Laptop Dell XPS 15', quantity: 1, unitPrice: 1500.0 },
  { productId: '22222222-2222-2222-2222-222222222222', productName: 'iPhone 15 Pro', quantity: 2, unitPrice: 999.0 },
];
const STOCK_FAIL_ITEMS = [
  { productId: '11111111-1111-1111-1111-111111111111', productName: 'Laptop Dell XPS 15', quantity: 999, unitPrice: 1500.0 },
];

type Scenario = 'happy' | 'payment-fail' | 'stock-fail';

export default function App() {
  const { isDark, toggle, t } = useTheme();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [reservations, setReservations] = useState<StockReservation[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const [showConcepts, setShowConcepts] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('scenario');
  const [menuOpen, setMenuOpen] = useState(false);
  const [knowledgeTopic, setKnowledgeTopic] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  }, []);

  useEffect(() => {
    const el = logContainerRef.current;
    if (!el || userScrolledRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  const handleLogScroll = useCallback(() => {
    const el = logContainerRef.current;
    if (!el) return;
    userScrolledRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 40;
  }, []);

  const loadProducts = useCallback(async () => {
    try { setProducts(await api.getProducts()); } catch { /* offline */ }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const pollOrderStatus = useCallback((orderId: string) => {
    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        const o = await api.getOrder(orderId);
        setOrder(o);
        if (o.status !== 'Pending' && o.status !== 'StockReserving' && o.status !== 'PaymentProcessing' && o.status !== 'Compensating') {
          setPollingStatus(null); setPollingCount(0);
          addLog(`✅ Final: ${o.status}`);
          clearInterval(pollingRef.current!);
          const [pay, res, prods] = await Promise.all([
            api.getPaymentByOrder(orderId), api.getReservations(orderId), api.getProducts(),
          ]);
          setPayment(pay); setReservations(res); setProducts(prods);
          if (pay) addLog(`💳 Payment: ${pay.status}`);
          if (res.length > 0) addLog(`📦 ${res.length} reservations${res.some(r => r.isReleased) ? ' (compensated)' : ''}`);
        } else {
          setPollingStatus(o.status); setPollingCount(attempts);
        }
      } catch { /* retry */ }
      if (attempts > 30) { clearInterval(pollingRef.current!); setPollingStatus(null); addLog('⚠️ Timeout'); }
    }, 2000);
  }, [addLog]);

  const runScenario = useCallback(async (type: Scenario) => {
    setScenario(type); setCurrentStep(-1); setIsAnimating(true);
    setOrder(null); setPayment(null); setReservations([]); setLogs([]); setError(null);
    setIsLive(false); setPollingStatus(null); setPollingCount(0); userScrolledRef.current = false;
    if (pollingRef.current) clearInterval(pollingRef.current);
    const flowSteps = type === 'happy' ? HAPPY_PATH_STEPS : type === 'payment-fail' ? FAILURE_PATH_STEPS : STOCK_FAIL_STEPS;
    setSteps(flowSteps);
    const items = type === 'stock-fail' ? STOCK_FAIL_ITEMS : SAMPLE_ITEMS;
    addLog(`🚀 ${type === 'happy' ? 'Happy Path' : type === 'payment-fail' ? 'Payment Failure' : 'Stock Failure'}`);
    for (let i = 0; i < flowSteps.length; i++) {
      setCurrentStep(i);
      addLog(`▶ Step ${i + 1}: ${flowSteps[i].label}`);
      if (i === 0) {
        try {
          const result = await api.createOrder({ customerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', items });
          addLog(`✅ Order: ${result.orderId.slice(0, 8)}...`);
          setIsLive(true); pollOrderStatus(result.orderId);
        } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); setIsAnimating(false); return; }
      }
      await new Promise(r => setTimeout(r, type === 'stock-fail' && i >= 3 ? 1500 : 2000));
    }
    setIsAnimating(false); addLog('🏁 Done — polling...');
  }, [addLog, pollOrderStatus]);

  const runSimulation = useCallback(async (type: Scenario) => {
    setScenario(type); setCurrentStep(-1); setIsAnimating(true);
    setOrder(null); setPayment(null); setReservations([]); setLogs([]); setError(null);
    setIsLive(false); setPollingStatus(null); setPollingCount(0); userScrolledRef.current = false;
    const flowSteps = type === 'happy' ? HAPPY_PATH_STEPS : type === 'payment-fail' ? FAILURE_PATH_STEPS : STOCK_FAIL_STEPS;
    setSteps(flowSteps);
    addLog(`🎬 Simulate: ${type === 'happy' ? 'Happy' : type === 'payment-fail' ? 'Pay Fail' : 'Stock Fail'}`);
    for (let i = 0; i < flowSteps.length; i++) {
      setCurrentStep(i); addLog(`▶ Step ${i + 1}: ${flowSteps[i].label}`);
      await new Promise(r => setTimeout(r, 1800));
    }
    setIsAnimating(false); addLog('🏁 Done.');
  }, [addLog]);

  const activeConcept = currentStep >= 0 && currentStep < steps.length ? steps[currentStep].concept : null;

  return (
    <div style={{ minHeight: '100vh', background: isDark ? t.bg : t.bg, fontFamily: "'Inter', 'Segoe UI', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:.8} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,100%{opacity=1} 50%{opacity:.3} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes draculaGlow { 0%,100%{text-shadow:0 0 20px rgba(189,147,249,0.5),0 0 40px rgba(255,121,198,0.2)} 50%{text-shadow:0 0 30px rgba(189,147,249,0.8),0 0 60px rgba(255,121,198,0.4)} }
        @keyframes kaomojiRun { 0%{transform:translateX(-60px)} 100%{transform:translateX(calc(100% + 60px))} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 10px; }
      `}</style>

      {/* HEADER - Dracula Theme */}
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
          {/* Hamburger menu button */}
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
          }}>
            <Layers size={22} color={isDark ? '#bd93f9' : '#fff'} />
          </div>
          <div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:900, color: t.headerText, letterSpacing:-0.5,
              ...(isDark ? { animation:'draculaGlow 3s ease infinite' } : { textShadow:'0 2px 10px rgba(0,0,0,0.15)' }) }}>
              🧛 Microservice Concepts
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
          {/* Theme toggle */}
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
          {/* Overlay */}
          <div onClick={() => setMenuOpen(false)} style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          }} />
          {/* Sidebar */}
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
                    setKnowledgeTopic(topic.id);
                    setMenuOpen(false);
                  }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', marginBottom: 2, borderRadius: 12,
                    background: knowledgeTopic === topic.id
                      ? (isDark ? `${topic.color}15` : `${topic.color}08`)
                      : 'transparent',
                    border: knowledgeTopic === topic.id
                      ? `1px solid ${topic.color}30`
                      : '1px solid transparent',
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

      {/* ═══ KNOWLEDGE BASE PAGE ═══ */}
      {knowledgeTopic && (
        <div style={{ minHeight: 'calc(100vh - 100px)' }}>
          <KnowledgeBase activeTopic={knowledgeTopic} onBack={() => setKnowledgeTopic(null)} />
        </div>
      )}

      {/* TAB BAR */}
      {!knowledgeTopic && (
      <div style={{
        padding:'0 32px', display:'flex', gap:0,
        background: isDark ? 'rgba(40,42,54,0.8)' : 'rgba(255,255,255,0.6)',
        backdropFilter:'blur(20px)',
        borderBottom:`1px solid ${t.border}`,
      }}>
        {([{ id: 'scenario' as ActiveTab, label: 'Scenario', icon: Layers }, { id: 'theory' as ActiveTab, label: 'Theory', icon: GraduationCap }]).map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding:'12px 24px', border:'none', borderBottom: isActive ? `3px solid ${t.accent}` : '3px solid transparent',
              background:'transparent', cursor:'pointer',
              display:'flex', alignItems:'center', gap:8, transition:'all 0.2s',
            }}>
              <TabIcon size={15} color={isActive ? t.accent : t.textMuted} />
              <span style={{ fontSize:13, fontWeight: isActive ? 700 : 500, color: isActive ? t.accent : t.textMuted }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      )}

      {/* ═══ SCENARIO TAB ═══ */}
      {!knowledgeTopic && activeTab === 'scenario' && (
        <>
      {/* SCENARIO BAR */}
      <div style={{
        padding:'14px 32px', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center',
        background: t.scenarioBg, backdropFilter:'blur(20px)',
        borderBottom:`1px solid ${t.border}`,
      }}>
        <span style={{ fontSize:12, fontWeight:700, color: t.accent, textTransform:'uppercase', letterSpacing:1 }}>
          Scenarios
        </span>
        <ScenarioBtn label="Happy Path" icon={<CheckCircle2 size={16} />} color="#10b981" disabled={isAnimating}
          onRun={() => runScenario('happy')} onSim={() => runSimulation('happy')} active={scenario === 'happy'} />
        <ScenarioBtn label="Payment Fail" icon={<XCircle size={16} />} color="#ef4444" disabled={isAnimating}
          onRun={() => runScenario('payment-fail')} onSim={() => runSimulation('payment-fail')} active={scenario === 'payment-fail'} />
        <ScenarioBtn label="Stock Fail" icon={<AlertTriangle size={16} />} color="#f59e0b" disabled={isAnimating}
          onRun={() => runScenario('stock-fail')} onSim={() => runSimulation('stock-fail')} active={scenario === 'stock-fail'} />
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => setShowConcepts(v => !v)} style={{
            padding:'7px 16px', borderRadius:14, border:'none',
            background: showConcepts ? (isDark ? 'rgba(189,147,249,0.15)' : 'rgba(99,102,241,0.1)') : (isDark ? 'rgba(68,71,90,0.5)' : 'rgba(255,255,255,0.7)'),
            backdropFilter:'blur(10px)', cursor:'pointer',
            display:'flex', alignItems:'center', gap:6, transition:'all 0.2s',
          }}>
            <BookOpen size={13} color={showConcepts ? t.accent : t.textMuted} />
            <span style={{ fontSize:11, fontWeight:600, color: showConcepts ? t.accent : t.textSecondary }}>{showConcepts ? 'Hide' : 'Show'} Concepts</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          margin:'12px 32px 0', padding:'10px 16px', borderRadius:12,
          background: isDark ? 'rgba(255,85,85,0.1)' : 'linear-gradient(135deg,#fef2f2,#fff1f2)',
          border: isDark ? '1px solid rgba(255,85,85,0.3)' : '1px solid #fecaca',
          color:'#dc2626', fontSize:12, display:'flex', alignItems:'center', gap:8,
        }}>
          <AlertTriangle size={16} /> {error} — Chạy docker-compose + 3 service, hoặc dùng Simulate.
        </div>
      )}

      {/* FLOW GRAPH (full width) */}
      <div style={{ padding:'20px 32px 0' }}>
        {steps.length === 0 ? (
          <div style={{
            padding:60, textAlign:'center', borderRadius:20,
            background: t.bgCard, backdropFilter:'blur(20px)',
            border:`2px dashed ${t.border}`,
          }}>
            <Layers size={48} color={t.textMuted} style={{ marginBottom:16 }} />
            <div style={{ fontSize:16, fontWeight:700, color: t.accent, marginBottom:4 }}>Chọn scenario ở trên</div>
            <div style={{ fontSize:13, color: t.textSecondary }}>Swim-lane graph hiện message flow giữa các service</div>
          </div>
        ) : (
          <div style={{
            borderRadius:20, overflow:'hidden',
            background: isDark ? 'rgba(40,42,54,0.8)' : 'linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(248,250,252,0.85) 100%)',
            backdropFilter:'blur(20px)',
            border:`1px solid ${t.border}`,
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.2)' : '0 8px 32px rgba(99,102,241,0.08)',
            padding:20,
          }}>
            <FlowDiagram steps={steps} currentStepIndex={currentStep} isAnimating={isAnimating} />
          </div>
        )}
      </div>

      {/* BOTTOM: Log + Monitor + Concepts */}
      <div style={{
        display:'grid',
        gridTemplateColumns: showConcepts ? '1fr 340px 300px' : '1fr 340px',
        gap:20, padding:'20px 32px 32px', transition:'all 0.3s ease',
      }}>
        <div>
          {logs.length > 0 && (
            <div style={{ animation:'fadeIn 0.3s ease' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <Terminal size={14} color={t.accent} />
                  <span style={{ fontWeight:700, fontSize:12, color: t.accent }}>Event Log</span>
                </div>
                <span style={{ fontSize:10, color: t.textMuted, fontWeight:500 }}>{logs.length} entries</span>
              </div>
              <div ref={logContainerRef} onScroll={handleLogScroll} style={{
                background: t.logBg,
                borderRadius:14, border: t.logBorder,
                padding:'12px 16px', maxHeight:200, overflowY:'auto',
                fontFamily:"'JetBrains Mono','Cascadia Code',Consolas,monospace",
                fontSize:11, lineHeight:1.8,
                boxShadow:'0 4px 20px rgba(30,27,75,0.3)',
              }}>
                {logs.map((log, i) => (
                  <div key={i} style={{
                    color: log.includes('❌') ? '#fca5a5' : log.includes('✅') ? '#86efac'
                      : log.includes('🚀') || log.includes('🎬') ? '#93c5fd'
                      : log.includes('📊') ? '#fcd34d' : '#c4b5fd',
                    animation:'fadeIn 0.2s ease',
                  }}>{log}</div>
                ))}
              </div>
              {/* Kaomoji runner */}
              <div style={{
                position: 'relative', overflow: 'hidden', height: 24, marginTop: 6,
                borderRadius: 12,
                background: isDark ? 'rgba(40,42,54,0.5)' : 'rgba(241,245,249,0.6)',
              }}>
                <div style={{
                  position: 'absolute', top: 2, whiteSpace: 'nowrap',
                  animation: 'kaomojiRun 6s linear infinite',
                  fontSize: 13, letterSpacing: 1,
                  filter: isDark ? 'drop-shadow(0 0 4px rgba(189,147,249,0.4))' : 'none',
                }}>
                  <span style={{ color: isDark ? '#ff79c6' : '#ec4899' }}>ᕕ( ᐛ )ᕗ</span>
                  <span style={{ margin: '0 12px', color: isDark ? '#8be9fd' : '#06b6d4' }}>٩(◕‿◕｡)۶</span>
                  <span style={{ color: isDark ? '#50fa7b' : '#10b981' }}>ᐠ( ᐛ )ᐟ</span>
                  <span style={{ margin: '0 12px', color: isDark ? '#f1fa8c' : '#f59e0b' }}>~(˘▾˘~)</span>
                  <span style={{ color: isDark ? '#bd93f9' : '#8b5cf6' }}>(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧</span>
                  <span style={{ margin: '0 12px', color: isDark ? '#ff5555' : '#ef4444' }}>( ˘ω˘ )☞</span>
                  <span style={{ color: isDark ? '#ffb86c' : '#f97316' }}>┌( ಠ‿ಠ)┘</span>
                  <span style={{ margin: '0 12px', color: isDark ? '#f8f8f2' : '#64748b' }}>⊂(◉‿◉)つ</span>
                  <span style={{ color: isDark ? '#6272a4' : '#94a3b8' }}>ヽ(°〇°)ﾉ</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <ServiceMonitor products={products} order={order} payment={payment} reservations={reservations} />

        {showConcepts && (
          <div style={{ animation:'fadeIn 0.3s ease' }}>
            <ConceptLegend activeConcept={activeConcept} />
          </div>
        )}
      </div>
        </>
      )}

      {/* ═══ THEORY TAB ═══ */}
      {!knowledgeTopic && activeTab === 'theory' && (
        <div style={{ padding:'20px 32px 32px', animation:'fadeIn 0.3s ease' }}>
          <ConceptTheory />
        </div>
      )}
    </div>
  );
}

function ScenarioBtn({ label, icon, color, disabled, onRun, onSim, active }: {
  label: string; icon: React.ReactNode; color: string;
  disabled: boolean; onRun: () => void; onSim: () => void; active: boolean;
}) {
  const { isDark, t } = useTheme();
  return (
    <div style={{ display:'flex', alignItems:'stretch', borderRadius:14, overflow:'hidden',
      border: active ? `2px solid ${color}` : (isDark ? '2px solid #6272a4' : '2px solid #c7d2fe'),
      boxShadow: active ? `0 4px 20px ${color}40` : (isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(99,102,241,0.12)'),
      opacity: disabled ? 0.5 : 1, transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
    }}>
      <button onClick={onRun} disabled={disabled} style={{
        padding:'9px 18px', border:'none',
        background: active
          ? (isDark ? `${color}25` : `${color}18`)
          : (isDark ? 'rgba(68,71,90,0.9)' : 'rgba(255,255,255,0.95)'),
        backdropFilter:'blur(10px)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display:'flex', alignItems:'center', gap:8,
      }}>
        <span style={{ color, filter: `drop-shadow(0 0 4px ${color}60)` }}>{icon}</span>
        <span style={{ fontWeight:700, fontSize:12, color: active ? color : (isDark ? '#f8f8f2' : '#1e293b') }}>{label}</span>
      </button>
      <button onClick={onSim} disabled={disabled} title={`Simulate ${label} (no backend)`} style={{
        padding:'5px 12px', border:'none',
        borderLeft: `1px solid ${active ? color + '40' : (isDark ? '#6272a4' : '#c7d2fe')}`,
        background: active
          ? (isDark ? `${color}15` : `${color}10`)
          : (isDark ? 'rgba(68,71,90,0.7)' : 'rgba(248,250,252,0.95)'),
        cursor: disabled ? 'not-allowed' : 'pointer',
        display:'flex', alignItems:'center', gap:4,
        color: active ? color : (isDark ? '#f8f8f2' : '#475569'),
        fontSize:10, fontWeight: 600,
      }}>
        <Play size={10} /> Sim
      </button>
    </div>
  );
}
