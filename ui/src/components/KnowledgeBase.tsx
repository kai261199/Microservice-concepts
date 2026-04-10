import React, { useState } from 'react';
import { useTheme } from '../ThemeContext';
import { KNOWLEDGE_TOPICS, KNOWLEDGE_CATEGORIES, type KnowledgeTopic } from '../data/knowledgeTopics';
import { KNOWLEDGE_CONTENT, type TopicContent, type CodeExample } from '../data/knowledgeContent';
import { ArrowLeft, BookOpen, Code2, Lightbulb, Package, ChevronDown, ChevronUp, Copy, Check, MessageCircle } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface KnowledgeBaseProps {
  activeTopic: string;
  onBack: () => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ activeTopic, onBack }) => {
  const { isDark, t } = useTheme();
  const topic = KNOWLEDGE_TOPICS.find(tp => tp.id === activeTopic);
  const content = KNOWLEDGE_CONTENT.find(c => c.id === activeTopic);

  if (!topic || !content) {
    return (
      <div style={{ padding: '40px 32px', textAlign: 'center' }}>
        <p style={{ color: t.textMuted }}>Topic not found.</p>
        <button onClick={onBack} style={{
          marginTop: 12, padding: '8px 20px', borderRadius: 10, border: 'none',
          background: t.accent, color: '#fff', fontWeight: 700, cursor: 'pointer',
        }}>← Back</button>
      </div>
    );
  }

  const Icon = topic.icon;
  const catLabel = KNOWLEDGE_CATEGORIES.find(c => c.id === topic.category)?.label ?? '';

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px 60px' }}>
      {/* Back + Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
          borderRadius: 10, border: `1px solid ${t.border}`, cursor: 'pointer',
          background: isDark ? 'rgba(68,71,90,0.6)' : 'rgba(255,255,255,0.8)',
          color: t.accent, fontWeight: 600, fontSize: 12,
          transition: 'all 0.2s',
        }}>
          <ArrowLeft size={14} /> Back
        </button>
        <span style={{ fontSize: 12, color: t.textMuted }}>{catLabel}</span>
        <span style={{ fontSize: 12, color: t.textMuted }}>›</span>
        <span style={{ fontSize: 12, color: topic.color, fontWeight: 700 }}>{topic.name}</span>
      </div>

      {/* Header card */}
      <div style={{
        borderRadius: 18, overflow: 'hidden', marginBottom: 24,
        background: isDark
          ? `linear-gradient(135deg, ${topic.color}12 0%, rgba(40,42,54,0.9) 100%)`
          : `linear-gradient(135deg, ${topic.color}08 0%, rgba(255,255,255,0.9) 100%)`,
        border: `2px solid ${topic.color}30`,
        boxShadow: `0 8px 32px ${topic.color}15`,
      }}>
        <div style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `${topic.color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 16px ${topic.color}25`,
          }}>
            <Icon size={28} color={topic.color} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: topic.color, letterSpacing: -0.5 }}>
              {topic.name}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: t.textSecondary, lineHeight: 1.6 }}>
              {catLabel} — Deep dive kiến thức chuyên sâu
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Problem / Scenario */}
      <Section icon={<Lightbulb size={16} />} title="Bài toán — Tại sao cần dùng?" color="#f59e0b" isDark={isDark} t={t}>
        <div style={{
          padding: '18px 22px', borderRadius: 14, lineHeight: 1.8,
          fontSize: 13, color: t.text,
          background: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)',
          border: `1px solid ${isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.12)'}`,
        }}>
          {content.problem}
        </div>
      </Section>

      {/* Section 2: Theory */}
      <Section icon={<BookOpen size={16} />} title="Lý thuyết cốt lõi" color={topic.color} isDark={isDark} t={t}>
        <div style={{
          background: isDark ? 'rgba(40,42,54,0.8)' : 'rgba(248,250,252,0.8)',
          borderRadius: 14, padding: '16px 20px',
          border: `1px solid ${t.border}`,
        }}>
          {content.theory.map((line, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, marginBottom: i < content.theory.length - 1 ? 12 : 0,
              fontSize: 13, lineHeight: 1.75, color: t.text,
            }}>
              <span style={{
                color: topic.color, fontWeight: 800, flexShrink: 0,
                width: 24, height: 24, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${topic.color}15`, fontSize: 11,
                marginTop: 1,
              }}>
                {i + 1}
              </span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 3: Code Examples */}
      <Section icon={<Code2 size={16} />} title="Code ví dụ" color="#50fa7b" isDark={isDark} t={t}>
        {content.codeExamples.map((ex, i) => (
          <CodeBlock key={i} example={ex} isDark={isDark} t={t} topicColor={topic.color} />
        ))}
      </Section>

      {/* Section 4: Libraries */}
      <Section icon={<Package size={16} />} title="Thư viện .NET thường dùng" color="#8be9fd" isDark={isDark} t={t}>
        <div style={{ display: 'grid', gap: 10 }}>
          {content.libraries.map((lib, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', borderRadius: 12,
              background: isDark ? 'rgba(68,71,90,0.5)' : 'rgba(255,255,255,0.8)',
              border: `1px solid ${t.border}`,
              transition: 'all 0.2s',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: isDark ? 'rgba(139,233,253,0.1)' : 'rgba(99,102,241,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Package size={16} color={isDark ? '#8be9fd' : '#6366f1'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: t.text }}>{lib.name}</div>
                <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>{lib.desc}</div>
              </div>
              <code style={{
                fontSize: 10, fontWeight: 600, padding: '3px 10px',
                borderRadius: 6, flexShrink: 0, whiteSpace: 'nowrap',
                background: isDark ? 'rgba(189,147,249,0.12)' : 'rgba(99,102,241,0.08)',
                color: isDark ? '#bd93f9' : '#6366f1',
                fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
              }}>{lib.nuget}</code>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 5: Q&A */}
      <Section icon={<MessageCircle size={16} />} title="Senior Interview Q&A" color="#ff79c6" isDark={isDark} t={t}>
        <div style={{ display: 'grid', gap: 12 }}>
          {content.qa.map((qa, i) => (
            <QAItem key={i} qa={qa} index={i} isDark={isDark} t={t} topicColor={topic.color} />
          ))}
        </div>
      </Section>
    </div>
  );
};

/* ── Section wrapper ── */
function Section({ icon, title, color, isDark, t, children }: {
  icon: React.ReactNode; title: string; color: string;
  isDark: boolean; t: any; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color,
        }}>
          {icon}
        </div>
        <span style={{ fontWeight: 800, fontSize: 15, color: t.text, letterSpacing: -0.3 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ── Code block with syntax highlighting ── */
function CodeBlock({ example, isDark, t, topicColor }: {
  example: CodeExample; isDark: boolean; t: any; topicColor: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(example.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      marginBottom: 14, borderRadius: 14, overflow: 'hidden',
      border: `1px solid ${isDark ? '#44475a' : '#e2e8f0'}`,
      background: isDark ? '#282a36' : '#1e1e2e',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: isDark ? 'rgba(68,71,90,0.7)' : 'rgba(30,30,46,0.95)',
        borderBottom: `1px solid ${isDark ? '#44475a' : '#313244'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5555' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f1fa8c' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#50fa7b' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f8f8f2', marginLeft: 4 }}>
            {example.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
            background: 'rgba(189,147,249,0.15)', color: '#bd93f9',
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {example.language}
          </span>
          <button onClick={handleCopy} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 5, border: 'none',
            background: 'rgba(248,248,242,0.08)', cursor: 'pointer',
            color: '#f8f8f2', fontSize: 10, fontWeight: 600,
            transition: 'all 0.2s',
          }}>
            {copied ? <Check size={11} color="#50fa7b" /> : <Copy size={11} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={() => setExpanded(v => !v)} style={{
            display: 'flex', alignItems: 'center',
            padding: '3px 6px', borderRadius: 5, border: 'none',
            background: 'rgba(248,248,242,0.08)', cursor: 'pointer',
            color: '#f8f8f2',
          }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Code */}
      {expanded && (
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          <SyntaxHighlighter
            language={example.language === 'csharp' ? 'cs' : example.language}
            style={dracula}
            customStyle={{
              margin: 0,
              padding: '16px 20px',
              fontSize: 12,
              lineHeight: 1.7,
              background: 'transparent',
              fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
            }}
            showLineNumbers
            lineNumberStyle={{
              minWidth: '2.5em',
              paddingRight: 16,
              color: isDark ? '#6272a4' : '#585b70',
              fontSize: 10,
            }}
          >
            {example.code}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}

/* ── Q&A Item ── */
function QAItem({ qa, index, isDark, t, topicColor }: {
  qa: { question: string; answer: string };
  index: number;
  isDark: boolean;
  t: any;
  topicColor: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${isDark ? '#44475a' : '#e2e8f0'}`,
      background: isDark ? 'rgba(68,71,90,0.5)' : 'rgba(255,255,255,0.8)',
    }}>
      {/* Question */}
      <button onClick={() => setExpanded(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', border: 'none', background: 'transparent',
        cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${topicColor}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontWeight: 800, fontSize: 12,
          color: topicColor,
        }}>
          Q{index + 1}
        </div>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: t.text, lineHeight: 1.5 }}>
          {qa.question}
        </span>
        <div style={{ color: t.textMuted }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Answer */}
      {expanded && (
        <div style={{
          padding: '0 16px 16px 56px',
          fontSize: 13, lineHeight: 1.8, color: t.text,
          borderTop: `1px solid ${isDark ? '#44475a50' : '#e2e8f030'}`,
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{
            marginTop: 12, padding: '12px 16px', borderRadius: 10,
            background: isDark ? 'rgba(40,42,54,0.6)' : 'rgba(248,250,252,0.8)',
            borderLeft: `3px solid ${topicColor}`,
          }}>
            {qa.answer}
          </div>
        </div>
      )}
    </div>
  );
}
